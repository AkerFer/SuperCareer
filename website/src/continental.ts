import { playMatch, random, table, type Game, type Match } from "./engine";
import type { Cup, ClubCupId, CupStage } from "./world-types";
import { europeanDate, uclSlots } from "./dates";
export const competitionNames = {
  domestic: "Кубок страны",
  league: "Чемпионат",
  ucl: "UEFA Champions League",
  uel: "UEFA Europa League",
  uecl: "UEFA Conference League",
  supercup: "UEFA Super Cup",
};
export const competitionMarks = {
  domestic: "🏆 Кубок",
  league: "Лига",
  ucl: "★ ЛЧ",
  uel: "◆ ЛЕ",
  uecl: "◇ ЛК",
  supercup: "◎ СК",
};
const offsets = { uel: 200000, uecl: 300000, supercup: 400000 };
export function allClubMatches(g: Game) {
  return [
    ...g.matches,
    ...Object.values(g.domestic ?? {}).flatMap((c) => c.matches),
    ...(g.europe?.matches ?? []),
    ...Object.values(g.continental ?? {}).flatMap((c) => c.matches),
  ];
}
export function matchDate(g: Game, m: Match) {
  if (m.date) return m.date;
  if (!m.competition)
    return new Date(Date.UTC(g.season, 7, 9 + m.round * 7))
      .toISOString()
      .slice(0, 10);
  if (m.competition === "ucl") {
    const start =
      m.stage === "league"
        ? 0
        : m.stage === "playoff"
          ? 8
          : m.stage === "r16"
            ? 10
            : m.stage === "qf"
              ? 12
              : m.stage === "sf"
                ? 14
                : 16;
    return europeanDate(g.season, uclSlots[start + m.round] ?? 35);
  }
  return "";
}
export function resultForClub(
  m: Match,
  club: number,
): "win" | "draw" | "loss" | "pending" {
  if (!m.score) return "pending";
  if (m.penalties && m.winner !== undefined)
    return m.winner === club ? "win" : "loss";
  const [a, b] = m.home === club ? m.score : [m.score[1], m.score[0]];
  return a > b ? "win" : a === b ? "draw" : "loss";
}
function groups(teams: number[], n: number) {
  return Array.from({ length: n }, (_, i) =>
    teams.filter((_, j) => j % n === i),
  );
}
export function makeCup(g: Game, id: Cup["id"], teams: number[]): Cup {
  const c: Cup = {
    id,
    season: g.season,
    teams,
    groups: [],
    stage: teams.length ? "groups" : "complete",
    round: 0,
    day: 0,
    matches: [],
    slots:
      id === "supercup"
        ? [1]
        : [3, 6, 9, 12, 15, 18, 24, 25, 28, 29, 32, 33, 36],
  };
  if (!teams.length) return c;
  if (id === "supercup") {
    drawKnockout(c, [[teams[0], teams[1]]], "final");
    return c;
  }
  c.groups = groups(teams, id === "uel" ? 8 : 6);
  for (let r = 0; r < 6; r++)
    c.groups.forEach((group, groupIndex) => {
      const ids = [...group];
      for (let i = 0; i < r % 3; i++) ids.splice(1, 0, ids.pop()!);
      for (let i = 0; i < 2; i++) {
        const a = ids[i],
          b = ids[3 - i];
        c.matches.push({
          id: offsets[id] + c.matches.length,
          competition: id,
          league: -1,
          stage: "groups",
          round: r,
          tie: groupIndex,
          home: r >= 3 ? b : a,
          away: r >= 3 ? a : b,
          date: europeanDate(c.season, c.slots[r], true),
        });
      }
    });
  return c;
}
export function initializeContinental(g: Game, rankings?: number[][]) {
  const excluded = new Set(g.europe!.teams);
  const rest =
    rankings ??
    Array.from({ length: 9 }, (_, l) =>
      g.clubs
        .filter((c) => c.league === l && l!==5 && l!==6)
        .sort((a, b) => b.strength - a.strength)
        .map((c) => c.id),
    );
  const order = Array.from({ length: 20 }, (_, rank) =>
    rest
      .map((list) => list[rank])
      .filter((id): id is number => id !== undefined && !excluded.has(id)),
  ).flat();
  const previous = g.cupHistory?.filter((t) => t.season === g.season - 1);
  const cl = previous?.find((t) => t.competition === "ucl")?.winner;
  const el = previous?.find((t) => t.competition === "uel")?.winner;
  g.continental = {
    uel: makeCup(g, "uel", order.slice(0, 32)),
    uecl: makeCup(g, "uecl", order.slice(32, 56)),
    supercup: makeCup(
      g,
      "supercup",
      cl !== undefined && el !== undefined && cl !== el ? [cl, el] : [],
    ),
  };
  g.cupHistory ??= [];
}
export function groupTable(
  matches: Pick<Match, "home" | "away" | "score">[],
  teams: number[],
) {
  return teams
    .map((id) => {
      let played = 0,
        w = 0,
        d = 0,
        l = 0,
        gf = 0,
        ga = 0;
      matches
        .filter((m) => m.score && (m.home === id || m.away === id))
        .forEach((m) => {
          const [a, b] = m.home === id ? m.score! : [m.score![1], m.score![0]];
          played++;
          gf += a;
          ga += b;
          if (a > b) w++;
          else if (a === b) d++;
          else l++;
        });
      return { id, played, w, d, l, gf, ga, pts: w * 3 + d };
    })
    .sort(
      (a, b) =>
        b.pts - a.pts ||
        b.gf - b.ga - (a.gf - a.ga) ||
        b.gf - a.gf ||
        a.id - b.id,
    );
}
export function cupDay(c: Cup) {
  return c.matches.filter((m) => m.stage === c.stage && m.round === c.round);
}
function drawKnockout(c: Cup, pairs: number[][], stage: CupStage) {
  c.stage = stage;
  c.round = 0;
  const slotStart =
    stage === "r16" ? 6 : stage === "qf" ? 8 : stage === "sf" ? 10 : 12;
  pairs.forEach(([a, b], tie) => {
    for (let leg = 0; leg < (stage === "final" ? 1 : 2); leg++)
      c.matches.push({
        id: offsets[c.id] + c.matches.length,
        competition: c.id,
        league: -1,
        stage,
        round: leg,
        tie,
        home: leg === 0 ? a : b,
        away: leg === 0 ? b : a,
        date: europeanDate(
          c.season,
          c.id === "supercup" ? 1 : c.slots[slotStart + leg],
          true,
        ),
      });
  });
}
export function recordTrophy(
  g: Game,
  competition: ClubCupId,
  winner: number,
  runnerUp: number,
) {
  g.cupHistory ??= [];
  if (
    g.cupHistory.some(
      (t) => t.season === g.season && t.competition === competition,
    )
  )
    return;
  g.cupHistory.unshift({ season: g.season, competition, winner, runnerUp });
  const prize =
    competition === "ucl"
      ? 30000000
      : competition === "uel"
        ? 14000000
        : competition === "uecl"
          ? 8000000
          : 5000000;
  if (competition !== "ucl") {
    g.clubs[winner].budget += prize;
    g.clubs[winner].income += prize;
  }
}
export function settleCup(g: Game, c: Cup) {
  if (c.stage === "complete") return;
  const day = cupDay(c);
  if (!day.length || day.some((m) => !m.score)) return;
  c.day++;
  if (c.stage === "groups") {
    if (c.round < 5) {
      c.round++;
      return;
    }
    const rows = c.groups.map((ids) =>
      groupTable(
        c.matches.filter((m) => m.stage === "groups"),
        ids,
      ),
    );
    const qualified = rows.flatMap((r) => r.slice(0, 2).map((row) => row.id));
    if (c.id === "uecl") {
      const third = rows
        .map((r) => r[2])
        .sort(
          (a, b) =>
            b.pts - a.pts ||
            b.gf - b.ga - (a.gf - a.ga) ||
            b.gf - a.gf ||
            a.id - b.id,
        );
      qualified.push(...third.slice(0, 4).map((r) => r.id));
    }
    drawKnockout(
      c,
      Array.from({ length: 8 }, (_, i) => [qualified[i], qualified[15 - i]]),
      "r16",
    );
    return;
  }
  if (c.round === 0 && c.stage !== "final") {
    c.round = 1;
    return;
  }
  const ms = c.matches.filter((m) => m.stage === c.stage);
  const ties = [...new Set(ms.map((m) => m.tie!))].sort((a, b) => a - b);
  const winners = ties.map((tie) => {
    const games = ms.filter((m) => m.tie === tie);
    const a = games[0].home,
      b = games[0].away;
    let ag = 0,
      bg = 0;
    games.forEach((m) => {
      ag += m.home === a ? m.score![0] : m.score![1];
      bg += m.home === b ? m.score![0] : m.score![1];
    });
    const last = games.at(-1)!;
    if (ag === bg) {
      const homeWins = random(g) > 0.5;
      last.penalties = homeWins ? [5, 4] : [4, 5];
      last.winner = homeWins ? last.home : last.away;
      last.events ??= [];
      last.events.push(`90′ Пенальти ${last.penalties.join(":")}`);
    } else last.winner = ag > bg ? a : b;
    return last.winner!;
  });
  if (c.stage === "final") {
    c.winner = winners[0];
    c.stage = "complete";
    const f = ms[0];
    recordTrophy(g, c.id, c.winner, f.home === c.winner ? f.away : f.home);
    g.news.unshift(`🏆 ${g.clubs[c.winner].name}: ${competitionNames[c.id]}`);
  } else
    drawKnockout(
      c,
      Array.from({ length: winners.length / 2 }, (_, i) => [
        winners[i * 2],
        winners[i * 2 + 1],
      ]),
      c.stage === "r16" ? "qf" : c.stage === "qf" ? "sf" : "final",
    );
}
export function advanceCup(g: Game, id: Cup["id"]) {
  const c = g.continental?.[id];
  if (!c || c.stage === "complete") return;
  if (g.live && g.live.status !== "finished")
    throw Error("Завершите текущий матч");
  if (
    g.careerMode === "match" &&
    cupDay(c).some((m) => !m.score && (m.home === g.club || m.away === g.club))
  )
    throw Error("Сыграйте матч клуба в центре матча");
  cupDay(c).forEach((m) => playMatch(g, m));
  settleCup(g, c);
}
export function advanceContinentalCalendar(g: Game, throughDate?: string) {
  for (const c of Object.values(g.continental ?? {})) {
    let guard = 0;
    while (
      c.stage !== "complete" &&
      (c.slots[c.day] ?? 99) <= g.round &&
      guard++ < 20
    ) {
      const day = cupDay(c);
      if (throughDate && (day[0]?.date ?? "") > throughDate) break;
      if (
        g.careerMode === "match" &&
        day.some((m) => !m.score && (m.home === g.club || m.away === g.club))
      )
        break;
      advanceCup(g, c.id);
    }
  }
}
