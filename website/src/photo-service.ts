export interface PhotoRecord {
  name: string;
  url: string;
  source: string;
  author: string;
  license: string;
  licenseUrl: string;
  checkedAt: string;
}
const key = "football-photo-cache-v1";
const settings = "football-remote-photos";
const cache = new Map<string, PhotoRecord | null>();
const jobs = new Map<string, Promise<PhotoRecord | null>>();
let running = 0;
const waiters: (() => void)[] = [];
export const remotePhotosEnabled = () => {
  try {
    return localStorage.getItem(settings) !== "off";
  } catch {
    return true;
  }
};
export function setRemotePhotosEnabled(on: boolean) {
  localStorage.setItem(settings, on ? "on" : "off");
  window.dispatchEvent(new Event("football-photos-changed"));
}
function normalize(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}
function load() {
  try {
    for (const p of JSON.parse(
      localStorage.getItem(key) ?? "[]",
    ) as PhotoRecord[])
      if (
        p.url?.startsWith("https://") &&
        p.source?.startsWith("https://commons.wikimedia.org/")
      )
        cache.set(normalize(p.name), p);
  } catch {
    /* Empty or malformed photo cache does not affect careers. */
  }
}
function plain(s: string) {
  return (
    new DOMParser().parseFromString(s, "text/html").body.textContent?.trim() ??
    ""
  );
}
async function json(url: string) {
  const r = await fetch(url, {
    signal: AbortSignal.timeout(10000),
    credentials: "omit",
  });
  if (!r.ok) throw Error(`Photo service ${r.status}`);
  return r.json();
}
async function resolve(name: string): Promise<PhotoRecord | null> {
  if (running >= 2) await new Promise<void>((r) => waiters.push(r));
  running++;
  try {
    if (!remotePhotosEnabled()) return null;
    const search = await json(
      "https://www.wikidata.org/w/api.php?" +
        new URLSearchParams({
          action: "wbsearchentities",
          search: name,
          language: "en",
          format: "json",
          origin: "*",
          limit: "5",
        }),
    );
    const matches = (search.search ?? []).filter(
      (e: { label?: string; description?: string }) =>
        normalize(e.label ?? "") === normalize(name) &&
        /football|soccer/i.test(e.description ?? ""),
    );
    if (matches.length !== 1) return null;
    const result = await json(
      "https://www.wikidata.org/w/api.php?" +
        new URLSearchParams({
          action: "wbgetentities",
          ids: matches[0].id,
          props: "claims",
          format: "json",
          origin: "*",
        }),
    );
    const filename =
      result.entities?.[matches[0].id]?.claims?.P18?.find(
        (c: { rank?: string }) => c.rank === "preferred",
      )?.mainsnak?.datavalue?.value ??
      result.entities?.[matches[0].id]?.claims?.P18?.[0]?.mainsnak?.datavalue
        ?.value;
    if (typeof filename !== "string") return null;
    const commons = await json(
      "https://commons.wikimedia.org/w/api.php?" +
        new URLSearchParams({
          action: "query",
          titles: "File:" + filename,
          prop: "imageinfo",
          iiprop: "url|extmetadata",
          iiurlwidth: "256",
          format: "json",
          origin: "*",
        }),
    );
    const pages = Object.values(commons.query?.pages ?? {}) as {
      imageinfo?: {
        thumburl?: string;
        url?: string;
        descriptionurl?: string;
        extmetadata?: Record<string, { value: string }>;
      }[];
    }[];
    const info = pages[0]?.imageinfo?.[0];
    const meta = info?.extmetadata;
    if (!info || !meta?.LicenseShortName?.value || !meta.Artist?.value)
      return null;
    const url = info.thumburl ?? info.url;
    if (!url?.startsWith("https://upload.wikimedia.org/")) return null;
    return {
      name,
      url,
      source:
        info.descriptionurl ??
        "https://commons.wikimedia.org/wiki/File:" +
          encodeURIComponent(filename),
      author: plain(meta.Artist.value),
      license: plain(meta.LicenseShortName.value),
      licenseUrl:
        meta.LicenseUrl?.value ??
        "https://commons.wikimedia.org/wiki/Commons:Licensing",
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  } finally {
    running--;
    waiters.shift()?.();
  }
}
export function photoCredits() {
  if (!cache.size) load();
  return [...cache.values()].filter((p): p is PhotoRecord => !!p);
}
export function resolvePlayerPhoto(name: string) {
  if (!cache.size) load();
  const id = normalize(name);
  if (cache.has(id)) return Promise.resolve(cache.get(id)!);
  if (jobs.has(id)) return jobs.get(id)!;
  const job = resolve(name).then((record) => {
    cache.set(id, record);
    if (record) {
      try {
        localStorage.setItem(key, JSON.stringify(photoCredits().slice(-300)));
      } catch {
        /* Images are optional. */
      }
      window.dispatchEvent(new Event("football-photo-loaded"));
    }
    return record;
  });
  jobs.set(id, job);
  return job;
}
