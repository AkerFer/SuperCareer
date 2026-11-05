import ratings from "./data/fc26-ratings.json";
import type { Game } from "./engine";
const source = "https://github.com/ismailoksuz/EAFC26-DataHub";
export function applyCardRatings(g: Game) {
  if (g.ratingsVersion) return;
  const initial = g.history.length === 0 && g.season === 2025;
  for (const p of g.players) {
    if (!p.real) continue;
    const r = (
      ratings as Record<
        string,
        {
          rating: number;
          potential: number;
          positions: string[];
          positionRatings: Record<string, number>;
          date: string;
        }
      >
    )[p.name];
    if (!r) continue;
    if (initial) {
      p.rating = r.rating;
      p.potential = r.potential;
      p.ratingSource = {
        kind: "eafc",
        source,
        date: r.date,
        edition: "FC 26 · update 4",
      };
    }
    p.cardBaseRating = r.rating;
    p.positionRatings = r.positionRatings;
    p.positions = [
      ...new Set([
        ...r.positions,
        ...(p.positions ?? []).filter(
          (role) => !["DF", "MF", "FW"].includes(role),
        ),
      ]),
    ];
    p.pos = r.positions[0];
    p.positionSource = `FC 26 · ${r.date} · ${source}`;
  }
  g.ratingsVersion = 1;
}
