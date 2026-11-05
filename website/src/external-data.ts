import { positions, type Game } from "./engine";
import type { MarketSource } from "./world-types";
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
export function parseCSV(text: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (c === "," || c === "\n")) {
      row.push(cell.replace(/\r$/, ""));
      cell = "";
      if (c === "\n") {
        rows.push(row);
        row = [];
      }
    } else cell += c;
  }
  if (quoted) throw Error("Незакрытая кавычка CSV");
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  const headers = rows.shift()!.map((h) =>
    h
      .replace(/^\uFEFF/, "")
      .trim()
      .toLowerCase(),
  );
  return rows
    .filter((r) => r.some(Boolean))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
}
export function importPlayerData(
  g: Game,
  csv: string,
  kind: "transfermarkt" | "eafc",
  date: string,
  source: string,
) {
  if (g.live && g.live.status !== "finished")
    throw Error("Завершите матч перед обновлением базы");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)))
    throw Error("Укажите дату снимка данных");
  if (!source.startsWith("https://"))
    throw Error("Укажите HTTPS-ссылку на источник");
  const rows = parseCSV(csv);
  const index = new Map<string, typeof g.players>();
  for (const p of g.players.filter((p) => p.real)) {
    const name = normalize(p.name);
    index.set(name, [...(index.get(name) ?? []), p]);
  }
  let matched = 0,
    skipped = 0;
  const seen = new Set<number>();
  const updates: {
    id: number;
    value?: number;
    photo?: string;
    rating?: number;
    roles?: string[];
  }[] = [];
  for (const r of rows) {
    const name = r.name || r.long_name || r.short_name || r.player_name;
    const found = index.get(normalize(name ?? ""));
    if (!found || found.length !== 1 || seen.has(found[0].id)) {
      skipped++;
      continue;
    }
    const p = found[0];
    const update: (typeof updates)[number] = { id: p.id };
    if (kind === "transfermarkt") {
      const raw =
        r.market_value_in_eur || r.current_market_value || r.market_value_eur;
      const v = Number(raw);
      if (
        raw !== undefined &&
        raw !== "" &&
        Number.isFinite(v) &&
        v >= 0 &&
        v <= 500000000
      )
        update.value = v;
      const photo = r.image_url || r.photo;
      if (photo && /^https:\/\/[^\s]+$/.test(photo)) update.photo = photo;
    } else {
      const rating = Number(r.overall || r.ovr);
      if (Number.isInteger(rating) && rating >= 1 && rating <= 99)
        update.rating = rating;
      const roles = (r.player_positions || r.positions || "")
        .split(/[,;\/]/)
        .map((s) => s.trim())
        .filter((s) => positions.includes(s));
      if (roles.length) update.roles = roles;
    }
    if (Object.keys(update).length > 1) {
      updates.push(update);
      seen.add(p.id);
      matched++;
    } else skipped++;
  }
  if (!matched)
    throw Error(
      "Нет однозначных совпадений имён с пригодными показателями. Проверьте CSV и заголовки.",
    );
  const meta: MarketSource = { kind, source, date };
  for (const u of updates) {
    const p = g.players.find((p) => p.id === u.id)!;
    if (u.value !== undefined) {
      p.value = u.value;
      p.valueSource = meta;
    }
    if (u.photo) {
      p.photo = u.photo;
      p.photoSource = meta;
    }
    if (u.rating !== undefined) {
      p.rating = u.rating;
      p.positionRatings = undefined;
      p.cardBaseRating = undefined;
      p.potential = Math.max(p.potential, p.rating);
      p.ratingSource = meta;
    }
    if (u.roles) {
      p.pos = u.roles[0];
      p.positions = u.roles;
      p.positionSource = `EA FC · ${date} · ${source}`;
    }
  }
  g.news.unshift(`База ${kind}: обновлено ${matched} игроков · снимок ${date}`);
  return { matched, skipped };
}
export async function readDataFile(file: File) {
  if (file.size > 32 * 1024 * 1024) throw Error("Максимум 32 МБ");
  if (file.name.endsWith(".gz"))
    return new Response(
      file.stream().pipeThrough(new DecompressionStream("gzip")),
    ).text();
  return file.text();
}
