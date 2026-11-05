import { playMatch, random, table, type Game, type Match } from "./engine";
import { roundDate, addDays } from "./dates";
export interface DomesticCup {
  key: string;
  name: string;
  league: number;
  super: boolean;
  stage: number;
  entrants: number[];
  byes: number[];
  matches: Match[];
  winner?: number;
  day: number;
  qualifiersLocked?: boolean;
}
export const domesticNames = [
  ["FA Cup", "EFL Cup", "FA Community Shield"],
  ["Copa del Rey", "Supercopa de España"],
  ["Coppa Italia", "Supercoppa Italiana"],
  ["DFB-Pokal", "DFL-Supercup"],
  ["Coupe de France", "Trophée des Champions"],
  ["US Open Cup", "MLS Cup", "Canadian Championship"],
  ["King Cup", "Saudi Super Cup"],
  ["Taça de Portugal", "Taça da Liga", "Supertaça Cândido de Oliveira"],
  ["Türkiye Kupası", "Turkish Super Cup"],
];
function draw(g: Game, c: DomesticCup, ids: number[]) {
  const ring = [...ids];
  if (!c.super)
    for (let i = ring.length - 1; i > 0; i--) {
      const j = Math.floor(random(g) * (i + 1));
      [ring[i], ring[j]] = [ring[j], ring[i]];
    }
  const power = 2 ** Math.floor(Math.log2(ring.length));
  const pairs = ring.length === power ? ring.length / 2 : ring.length - power;
  c.byes = ring.slice(pairs * 2);
  const round = c.stage;
  const slots = c.super
    ? [0, 1]
    : c.name === "MLS Cup"
      ? [32, 33, 34, 35, 36]
      : [5, 11, 19, 27, 36];
  for (let i = 0; i < pairs; i++)
    c.matches.push({
      id:
        500000 +
        Object.keys(g.domestic ?? {}).indexOf(c.key) * 1000 +
        c.matches.length,
      league: c.league,
      competition: "domestic",
      tournament: c.key,
      stage:
        ids.length <= 2
          ? "final"
          : ids.length <= 4
            ? "sf"
            : ids.length <= 8
              ? "qf"
              : ids.length <= 16
                ? "r16"
                : "r32",
      round,
      home: ring[i * 2],
      away: ring[i * 2 + 1],
      date: addDays(
        roundDate(g.season, slots[Math.min(round, slots.length - 1)]),
        2 + (c.key.charCodeAt(c.key.length - 1) % 2),
      ),
    });
}
export function initializeDomestic(
  g: Game,
  previous?: Record<string, DomesticCup>,
) {
  g.domestic = {};
  g.domesticHistory ??= [];
  for (let l = 0; l < 9; l++) {
    const clubs = g.clubs.filter((c) => c.league === l);
    if (!clubs.length) continue;
    domesticNames[l].forEach((name, i) => {
      const key = `${l}-${i}`,
        supercup = /super|shield|trophée/i.test(name);
      let ids = clubs.map((c) => c.id);
      const canadian = new Set(
        clubs
          .filter((c) =>
            ["CF Montréal", "Toronto FC", "Vancouver Whitecaps FC"].includes(
              c.name,
            ),
          )
          .map((c) => c.id),
      );
      if (name === "US Open Cup") ids = ids.filter((id) => !canadian.has(id));
      if (name === "Canadian Championship")
        ids = ids.filter((id) => canadian.has(id));
      if (supercup) {
        const champion = g.history[0]?.champions[l];
        const leagueWinner =
          clubs.find((c) => c.name === champion)?.id ??
          [...clubs].sort((a, b) => b.strength - a.strength)[0].id;
        const cupWinner = previous?.[`${l}-0`]?.winner;
        const other =
          cupWinner !== undefined && cupWinner !== leagueWinner
            ? cupWinner
            : clubs
                .filter((c) => c.id !== leagueWinner)
                .sort((a, b) => b.strength - a.strength)[0].id;
        ids = [leagueWinner, other];
        if ([1, 2, 6, 8].includes(l)) {
          const cup = previous?.[`${l}-0`];
          const final = cup?.matches.find((m) => m.stage === "final");
          const ranking =
            g.lastLeagueOrder?.[l] ??
            [...clubs].sort((a, b) => b.strength - a.strength).map((c) => c.id);
          ids = [
            ...new Set([
              leagueWinner,
              other,
              ...(final ? [final.home, final.away] : []),
              ...ranking,
            ]),
          ].slice(0, 4);
        }
      }
      if (name === "MLS Cup")
        ids = table(g, l)
          .slice(0, 16)
          .map((r) => r.club.id);
      const c: DomesticCup = {
        key,
        name,
        league: l,
        super: supercup,
        stage: 0,
        entrants: ids,
        byes: [],
        matches: [],
        day: 0,
      };
      g.domestic![key] = c;
      draw(g, c, ids);
    });
  }
}
export const domesticDay = (c: DomesticCup) =>
  c.matches.filter((m) => m.round === c.stage);
export function settleDomestic(g: Game, key: string) {
  const c = g.domestic?.[key];
  if (!c || c.winner !== undefined) return;
  const day = domesticDay(c);
  if (!day.length || day.some((m) => !m.score)) return;
  const ids = [...c.byes];
  for (const m of day) {
    if (m.score![0] === m.score![1]) {
      m.penalties = random(g) < 0.5 ? [5, 4] : [4, 5];
      m.winner = m.penalties[0] > m.penalties[1] ? m.home : m.away;
    } else m.winner = m.score![0] > m.score![1] ? m.home : m.away;
    ids.push(m.winner);
  }
  c.day++;
  if (ids.length === 1) {
    c.winner = ids[0];
    g.domesticHistory ??= [];
    g.domesticHistory.unshift({
      season: g.season,
      key: c.key,
      name: c.name,
      winner: c.winner,
    });
    const prize = c.super ? 1500000 : 5000000;
    g.clubs[c.winner].budget += prize;
    g.clubs[c.winner].income += prize;
    g.news.unshift(`🏆 ${g.clubs[c.winner].name} — ${c.name}`);
  } else {
    c.stage++;
    draw(g, c, ids);
  }
}
export function advanceDomestic(g: Game, key: string) {
  const c = g.domestic?.[key];
  if (!c || c.winner !== undefined) return;
  if (g.live && g.live.status !== "finished")
    throw Error("Завершите текущий матч");
  prepareDomestic(g, c.key, true);
  const day = domesticDay(c);
  if (
    g.careerMode === "match" &&
    day.some((m) => !m.score && (m.home === g.club || m.away === g.club))
  )
    throw Error("Сыграйте матч клуба в центре матча");
  day.forEach((m) => playMatch(g, m));
  settleDomestic(g, key);
}
export function domesticCalendar(g: Game, date?: string) {
  prepareDomestic(g);
  for (const c of Object.values(g.domestic ?? {})) {
    let guard = 0;
    while (c.winner === undefined && guard++ < 8) {
      const day = domesticDay(c);
      const horizon = date ?? addDays(roundDate(g.season, g.round), -1);
      if (day.some((m) => m.date! > horizon)) break;
      if (
        g.careerMode === "match" &&
        day.some((m) => !m.score && (m.home === g.club || m.away === g.club))
      )
        break;
      advanceDomestic(g, c.key);
    }
  }
}

export function prepareDomestic(g: Game, key?: string, force = false) {
  for (const c of Object.values(g.domestic ?? {})) {
    if (
      c.name !== "MLS Cup" ||
      c.day !== 0 ||
      c.qualifiersLocked ||
      (key && c.key !== key) ||
      (!force && g.round < 32)
    )
      continue;
    const ids = table(g, c.league)
      .slice(0, 16)
      .map((r) => r.club.id);
    c.matches = [];
    c.entrants = ids;
    c.qualifiersLocked = true;
    draw(g, c, ids);
  }
}
