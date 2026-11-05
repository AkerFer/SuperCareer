import LZString from "lz-string";
import { validateSave, type Game, type Player } from "./engine";
import { migrateGame } from "./career";
import type { LiveMatch } from "./career-types";
const prefix = "FL2:";
const liveBases = new Map<number, string>();
const token = (g: Game) =>
  g.live ? `${g.season}:${g.live.competition}:${g.live.matchId}` : "";
interface Journal {
  token: string;
  live: LiveMatch;
  seed: number;
  players: Player[];
}
export function encodeSave(g: Game) {
  return prefix + LZString.compressToUTF16(JSON.stringify(g));
}
export function decodeSave(value: string | null): Game | null {
  try {
    if (!value) return null;
    const raw = value.startsWith(prefix)
      ? LZString.decompressFromUTF16(value.slice(prefix.length))
      : value;
    if (!raw) return null;
    const g = JSON.parse(raw);
    return validateSave(g) ? migrateGame(g) : null;
  } catch {
    return null;
  }
}
export function readSlot(slot: number) {
  try {
    let g = decodeSave(localStorage.getItem("fl-slot-" + slot));
    if (!g) return null;
    const journalRaw = localStorage.getItem("fl-live-" + slot);
    if (g.live && g.live.status !== "finished" && journalRaw) {
      try {
        const j: Journal = JSON.parse(journalRaw);
        if (j.token === token(g) && Array.isArray(j.players)) {
          const restored = structuredClone(g);
          restored.live = j.live;
          restored.seed = j.seed;
          const changed = new Map(j.players.map((p) => [p.id, p]));
          restored.players = restored.players.map(
            (p) => changed.get(p.id) ?? p,
          );
          if (validateSave(restored)) {
            g = restored;
            liveBases.set(slot, j.token);
          }
        }
      } catch {
        /* The full snapshot remains a recovery point. */
      }
    }
    return g;
  } catch {
    return null;
  }
}
export function saveSlot(slot: number, g: Game, replace = false) {
  const key = "fl-slot-" + slot,
    journalKey = "fl-live-" + slot;
  const live = g.live;
  if (live && live.status !== "finished") {
    const id = token(g);
    if (replace || liveBases.get(slot) !== id) {
      localStorage.setItem(key, encodeSave(g));
      liveBases.set(slot, id);
    }
    const ids = new Set([
      ...live.lineups.flat(),
      ...live.before.map((p) => p.id),
    ]);
    const journal: Journal = {
      token: id,
      live,
      seed: g.seed,
      players: g.players.filter((p) => ids.has(p.id)),
    };
    localStorage.setItem(journalKey, JSON.stringify(journal));
    return;
  }
  localStorage.setItem(key, encodeSave(g));
  localStorage.removeItem(journalKey);
  liveBases.delete(slot);
}
