import extra from "./data/extra-leagues.json";
import nations from "./data/player-nations.json";
import {
  autoLineup,
  calendar,
  playMatch,
  squad,
  youth,
  type Game,
  type Player,
} from "./engine";
import { marketValue } from "./pricing";
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean);
export function enrichWorld(g: Game) {
  if (g.worldVersion) return;
  if (g.live && g.live.status !== "finished") return;
  for (const p of g.players) {
    const nation = (nations as Record<string, string>)[p.name];
    if (nation && p.real) p.nation = nation;
  }
  const expanding = g.clubs.length === 96;
  if (expanding) {
    let id =
      Math.max(...g.players.map((p) => p.id), ...g.archive.map((p) => p.id)) +
      1;
    for (let l = 0; l < extra.length; l++)
      for (const data of extra[l].clubs) {
        const club = {
          id: g.clubs.length,
          name: data.name,
          league: l + 5,
          strength: 70,
          budget: l === 1 ? 100000000 : 30000000,
          income: 0,
          expenses: 0,
          lineup: [] as number[],
          formation: "4-3-3",
          style: "Баланс",
          captain: null,
        };
        g.clubs.push(club);
        for (let i = 0; i < 22; i++) {
          const p = youth(g, club, id++, true),
            r = data.players[i];
          if (r && (g.season === 2025 || r.age + g.season - 2025 <= 42))
            Object.assign(p, r, {
              pos: r.positions[0],
              age: Math.max(16, r.age + g.season - 2025),
              real: true,
              ageEstimated: false,
              source: "FC 26 · снимок 19.09.2025",
            });
          p.value = marketValue(p);
          g.players.push(p);
        }
        club.strength = Math.round(
          squad(g, club.id).reduce((s, p) => s + p.rating, 0) / 22,
        );
        autoLineup(g, club.id);
      }
    g.domestic = undefined;
    g.news.unshift(
      "Мир карьеры расширен: MLS, Саудовская Аравия, Португалия и Турция. Прежние результаты сохранены.",
    );
  }
  // Transfer overlapping historical profiles into their later FC 26 club without duplicating a footballer.
  const historical = g.players
    .filter((p) => p.real && p.club !== null && g.clubs[p.club].league < 5)
    .map((p) => ({ player: p, tokens: normalize(p.name) }));
  for (const p of [...g.players].filter(
    (p) => p.real && p.club !== null && g.clubs[p.club].league >= 5,
  )) {
    const fullTokens = normalize(p.name);
    const tokens = new Set(fullTokens);
    const old = historical
      .filter(
        ({ player: other, tokens: parts }) =>
          other.club !== null &&
          g.clubs[other.club].league < 5 &&
          parts.length >= 2 &&
          (parts.join(" ") === fullTokens.join(" ") ||
            (other.nation === p.nation && Math.abs(other.age - p.age) <= 2)) &&
          parts.every((t) => tokens.has(t)),
      )
      .map((x) => x.player);
    if (old.length === 1) {
      const existing = old[0],
        former = existing.club!;
      const destination = p.club!;
      const pristine =
        g.round === 0 &&
        g.history.length === 0 &&
        existing.stats.apps === 0 &&
        !g.transfers.some((t) => t.name === existing.name) &&
        !g.loans?.some((l) => l.player === existing.id);
      if (pristine) existing.club = destination;
      existing.nation = p.nation;
      g.players = g.players.filter((other) => other.id !== p.id);
      const replenish = pristine ? former : destination;
      if (squad(g, replenish).length < 22)
        g.players.push(
          youth(
            g,
            g.clubs[replenish],
            Math.max(
              ...g.players.map((p) => p.id),
              ...g.archive.map((p) => p.id),
            ) + 1,
            true,
          ),
        );
      autoLineup(g, former);
      autoLineup(g, destination);
    }
  }
  if (expanding) {
    const added = calendar(
      g.clubs.filter((c) => c.league >= 5),
      g,
    );
    let mid = Math.max(...g.matches.map((m) => m.id)) + 1;
    for (const m of added) {
      m.id = mid++;
      g.matches.push(m);
      if (m.round < g.round) playMatch(g, m);
    }
  }
  g.worldVersion = 1;
}
