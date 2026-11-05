import { random, type Game } from "./engine";
import type { NationalCup, NationalTeam, CupStage } from "./world-types";
import { addDays } from "./dates";
import { groupTable } from "./continental";
export const nationalNames = {
  worldcup: "FIFA World Cup",
  euro: "UEFA EURO",
  copa: "Copa América",
};
const european = [
  "Spain",
  "France",
  "England",
  "Portugal",
  "Germany",
  "Netherlands",
  "Italy",
  "Belgium",
  "Croatia",
  "Denmark",
  "Switzerland",
  "Austria",
  "Serbia",
  "Ukraine",
  "Türkiye",
  "Poland",
  "Sweden",
  "Norway",
  "Scotland",
  "Czechia",
  "Hungary",
  "Romania",
  "Slovakia",
  "Slovenia",
];
const south = [
  "Argentina",
  "Brazil",
  "Uruguay",
  "Colombia",
  "Ecuador",
  "Chile",
  "Peru",
  "Paraguay",
  "Venezuela",
  "Bolivia",
];
const other = [
  "USA",
  "Mexico",
  "Canada",
  "Japan",
  "South Korea",
  "Morocco",
  "Senegal",
  "Nigeria",
  "Algeria",
  "Egypt",
  "Tunisia",
  "Ghana",
  "Cameroon",
  "Ivory Coast",
  "Australia",
  "Iran",
  "Saudi Arabia",
  "Qatar",
  "Costa Rica",
  "Panama",
  "Jamaica",
  "New Zealand",
  "Uzbekistan",
  "South Africa",
];
function teams(names: string[]): NationalTeam[] {
  return names.map((name, id) => ({
    id,
    name,
    flag: "🌐",
    strength: Math.max(
      62,
      90 -
        (european.includes(name)
          ? european.indexOf(name) * 0.7
          : south.includes(name)
            ? south.indexOf(name) * 1.7
            : 12 + other.indexOf(name) * 0.5),
    ),
    confederation: european.includes(name)
      ? "UEFA"
      : south.includes(name)
        ? "CONMEBOL"
        : "OTHER",
  }));
}
export function createNationalCup(
  id: NationalCup["id"],
  year: number,
): NationalCup {
  const names =
    id === "euro"
      ? european
      : id === "copa"
        ? [...south, ...other.slice(0, 3), "Costa Rica", "Panama", "Jamaica"]
        : [...european.slice(0, 16), ...south.slice(0, 8), ...other];
  const ts = teams(names);
  const groupCount = id === "worldcup" ? 12 : id === "euro" ? 6 : 4;
  const groups = Array.from({ length: groupCount }, (_, i) =>
    ts.filter((_, j) => j % groupCount === i).map((t) => t.id),
  );
  const cup: NationalCup = {
    id,
    year,
    teams: ts,
    groups,
    stage: "groups",
    round: 0,
    matches: [],
  };
  for (let r = 0; r < 3; r++)
    groups.forEach((ids, tie) => {
      const ring = [...ids];
      for (let n = 0; n < r; n++) ring.splice(1, 0, ring.pop()!);
      for (let j = 0; j < 2; j++)
        cup.matches.push({
          id: cup.matches.length,
          stage: "groups",
          round: r,
          tie,
          home: ring[j],
          away: ring[3 - j],
          date: addDays(`${year}-06-10`, r * 5),
        });
    });
  return cup;
}
export function initializeInternationals(g: Game) {
  const year = g.season + 1;
  g.international = [];
  if ((year - 2026) % 4 === 0)
    g.international.push(createNationalCup("worldcup", year));
  if ((year - 2028) % 4 === 0)
    g.international.push(
      createNationalCup("euro", year),
      createNationalCup("copa", year),
    );
  g.internationalHistory ??= [];
}
function knockout(c: NationalCup, ids: number[], stage: CupStage) {
  c.stage = stage;
  c.round = 0;
  ids.forEach((id, i) => {
    if (i % 2 === 0)
      c.matches.push({
        id: c.matches.length,
        stage,
        round: 0,
        tie: i / 2,
        home: id,
        away: ids[i + 1],
        date: addDays(
          `${c.year}-06-25`,
          stage === "r32"
            ? 0
            : stage === "r16"
              ? 5
              : stage === "qf"
                ? 10
                : stage === "sf"
                  ? 15
                  : 20,
        ),
      });
  });
}
function poisson(g: Game, lambda: number) {
  let k = 0,
    p = 1;
  do {
    k++;
    p *= random(g);
  } while (p > Math.exp(-lambda) && k < 12);
  return k - 1;
}
export function advanceNational(g: Game, c: NationalCup) {
  if (c.stage === "complete") return;
  const day = c.matches.filter(
    (m) => m.stage === c.stage && m.round === c.round,
  );
  for (const m of day) {
    if (m.score) continue;
    const a = c.teams[m.home],
      b = c.teams[m.away];
    m.score = [
      poisson(g, Math.max(0.4, 1.25 + (a.strength - b.strength) / 20)),
      poisson(g, Math.max(0.4, 1.25 + (b.strength - a.strength) / 20)),
    ];
    if (c.stage !== "groups") {
      if (m.score[0] === m.score[1]) {
        m.penalties = random(g) < 0.5 ? [5, 4] : [4, 5];
        m.winner = m.penalties[0] > m.penalties[1] ? m.home : m.away;
      } else m.winner = m.score[0] > m.score[1] ? m.home : m.away;
    }
  }
  if (c.stage === "groups") {
    if (c.round < 2) {
      c.round++;
      return;
    }
    const tables = c.groups.map((ids) => groupTable(c.matches, ids));
    const qualified = tables.flatMap((t) => t.slice(0, 2).map((r) => r.id));
    if (c.id !== "copa") {
      const thirds = tables
        .map((t) => t[2])
        .sort(
          (a, b) => b.pts - a.pts || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf,
        );
      qualified.push(
        ...thirds.slice(0, c.id === "worldcup" ? 8 : 4).map((r) => r.id),
      );
    }
    knockout(
      c,
      qualified,
      c.id === "worldcup" ? "r32" : c.id === "euro" ? "r16" : "qf",
    );
  } else {
    const winners = day.map((m) => m.winner!);
    if (c.stage === "final") {
      c.winner = winners[0];
      c.stage = "complete";
      g.internationalHistory ??= [];
      if (
        !g.internationalHistory.some(
          (h) => h.year === c.year && h.competition === c.id,
        )
      )
        g.internationalHistory.unshift({
          year: c.year,
          competition: c.id,
          winner: c.teams[c.winner].name,
          flag: "🏆",
        });
    } else
      knockout(
        c,
        winners,
        c.stage === "r32"
          ? "r16"
          : c.stage === "r16"
            ? "qf"
            : c.stage === "qf"
              ? "sf"
              : "final",
      );
  }
}
export function advanceInternationals(g: Game, throughDate?: string) {
  for (const c of g.international ?? []) {
    let guard = 0;
    while (c.stage !== "complete" && guard++ < 10) {
      const day = c.matches.find(
        (m) => m.stage === c.stage && m.round === c.round,
      );
      if (throughDate && day && day.date > throughDate) break;
      advanceNational(g, c);
    }
  }
}
