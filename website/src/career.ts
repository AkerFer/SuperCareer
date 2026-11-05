import { setPlayerRoles } from "./player-roles";
import {
  playerById,
  autoLineup,
  emptyStats,
  leagues,
  playMatch,
  random,
  squad,
  table,
  type Game,
  type Match,
  type Player,
  type Stats,
} from "./engine";
import { applyRealDatabase } from "./database";
import type {
  Award,
  AwardNominee,
  CoachTotals,
  EuropeanStage,
  PlayerBefore,
} from "./career-types";
const dates = [3, 6, 9, 12, 15, 18, 21, 24, 26, 27, 28, 29, 30, 31, 32, 33, 35];
export const stageNames: Record<EuropeanStage, string> = {
  league: "Общий этап",
  playoff: "Стыковые матчи",
  r16: "1/8 финала",
  qf: "Четвертьфинал",
  sf: "Полуфинал",
  final: "Финал",
  complete: "Турнир завершён",
};
export const totals = (): CoachTotals => ({
  played: 0,
  won: 0,
  drawn: 0,
  lost: 0,
  gf: 0,
  ga: 0,
  seasons: 0,
});
export function initializeCareer(g: Game) {
  if (!g.database) applyRealDatabase(g, true);
  g.edition = 2;
  g.awards ??= [];
  g.coach ??= { ...totals(), seasons: g.history.length };
  g.players.forEach((p) => {
    p.leagueStats ??= { ...p.stats };
    p.leagueById ??=
      p.club === null ? {} : { [g.clubs[p.club].league]: { ...p.leagueStats } };
    p.europeanStats ??= emptyStats();
    p.ratingSum ??= 0;
    p.ratedApps ??= 0;
    p.trophies ??= 0;
    p.ballon ??= 0;
    p.seasonClubs ??= [];
  });
  if (!g.europe) initializeEurope(g);
}
export function migrateGame(g: Game) {
  if (!g.rolesVersion) {
    g.players.forEach(setPlayerRoles);
    g.rolesVersion = 1;
  }
  g.careerMode ??= "calendar";

  if (g.edition !== 2 || !g.europe || !g.awards || !g.coach)
    initializeCareer(g);
  return g;
}
export function initializeEurope(g: Game, teams?: number[]) {
  teams ??= leagues.flatMap((_, l) =>
    g.clubs
      .filter((c) => c.league === l)
      .sort((a, b) => b.strength - a.strength || a.id - b.id)
      .slice(0, l === 0 ? 8 : 7)
      .map((c) => c.id),
  );
  const ids = [...teams];
  g.europe = {
    season: g.season,
    teams: [...teams],
    stage: "league",
    round: 0,
    day: 0,
    matches: [],
    qualified: [],
  };
  for (let r = 0; r < 8; r++) {
    for (let i = 0; i < 18; i++) {
      const a = ids[i],
        b = ids[35 - i];
      g.europe.matches.push({
        id: 100000 + g.europe.matches.length,
        competition: "ucl",
        stage: "league",
        league: -1,
        round: r,
        home: r % 2 ? b : a,
        away: r % 2 ? a : b,
      });
    }
    ids.splice(1, 0, ids.pop()!);
  }
}
export function europeanTable(g: Game) {
  const e = g.europe!;
  return e.teams
    .map((id) => {
      let played = 0,
        won = 0,
        drawn = 0,
        lost = 0,
        gf = 0,
        ga = 0;
      e.matches
        .filter(
          (m) =>
            m.stage === "league" && m.score && (m.home === id || m.away === id),
        )
        .forEach((m) => {
          const [a, b] = m.home === id ? m.score! : [m.score![1], m.score![0]];
          played++;
          gf += a;
          ga += b;
          if (a > b) won++;
          else if (a === b) drawn++;
          else lost++;
        });
      return { id, played, won, drawn, lost, gf, ga, pts: won * 3 + drawn };
    })
    .sort(
      (a, b) =>
        b.pts - a.pts ||
        b.gf - b.ga - (a.gf - a.ga) ||
        b.gf - a.gf ||
        g.clubs[a.id].name.localeCompare(g.clubs[b.id].name),
    );
}
function fixturesForStage(
  g: Game,
  stage: EuropeanStage,
  pairs: [number, number][],
) {
  const e = g.europe!;
  e.stage = stage;
  e.round = 0;
  pairs.forEach(([a, b], tie) => {
    e.matches.push({
      id: 100000 + e.matches.length,
      competition: "ucl",
      stage,
      league: -1,
      round: 0,
      home: b,
      away: a,
      tie,
    });
    if (stage !== "final")
      e.matches.push({
        id: 100000 + e.matches.length,
        competition: "ucl",
        stage,
        league: -1,
        round: 1,
        home: a,
        away: b,
        tie,
      });
  });
}
export function settleEuropeanDay(g: Game) {
  const e = g.europe!;
  if (e.stage === "complete") return;
  const day = e.matches.filter(
    (m) => m.stage === e.stage && m.round === e.round,
  );
  if (day.some((m) => !m.score) || !day.length) return;
  e.day++;
  if (e.stage === "league") {
    if (e.round < 7) {
      e.round++;
      return;
    }
    const rows = europeanTable(g);
    e.qualified = rows.slice(0, 8).map((r) => r.id);
    fixturesForStage(
      g,
      "playoff",
      Array.from({ length: 8 }, (_, i) => [rows[8 + i].id, rows[23 - i].id]),
    );
    return;
  }
  if (e.round === 0 && e.stage !== "final") {
    e.round = 1;
    return;
  }
  const ties = [
    ...new Set(e.matches.filter((m) => m.stage === e.stage).map((m) => m.tie!)),
  ].sort((a, b) => a - b);
  const winners = ties.map((t) => {
    const ms = e.matches.filter((m) => m.stage === e.stage && m.tie === t);
    const a = ms[0].home,
      b = ms[0].away;
    let ag = 0,
      bg = 0;
    ms.forEach((m) => {
      ag += m.home === a ? m.score![0] : m.score![1];
      bg += m.home === b ? m.score![0] : m.score![1];
    });
    const last = ms.at(-1)!;
    let winner = ag > bg ? a : bg > ag ? b : undefined;
    if (winner === undefined) {
      const homeWins = random(g) > 0.5;
      last.penalties = homeWins ? [5, 4] : [4, 5];
      winner = homeWins ? last.home : last.away;
      last.events ??= [];
      last.events.push(
        `90′ Серия пенальти: ${last.penalties.join(":")} — ${g.clubs[winner].name}`,
      );
    }
    last.winner = winner;
    return winner;
  });
  if (e.stage === "final") {
    e.winner = winners[0];
    e.stage = "complete";
    g.clubs[e.winner].budget += 30000000;
    g.clubs[e.winner].income += 30000000;
    g.news.unshift(
      `🏆 ${g.clubs[e.winner].name} — победитель UEFA Champions League ${g.season}!`,
    );
    return;
  }
  if (e.stage === "playoff") {
    fixturesForStage(
      g,
      "r16",
      e.qualified.map((id, i) => [id, winners[7 - i]]),
    );
    return;
  }
  const next = e.stage === "r16" ? "qf" : e.stage === "qf" ? "sf" : "final";
  fixturesForStage(
    g,
    next,
    Array.from({ length: winners.length / 2 }, (_, i) => [
      winners[i * 2],
      winners[i * 2 + 1],
    ]),
  );
}
export function europeanDayFixtures(g: Game) {
  const e = g.europe!;
  return e.matches.filter((m) => m.stage === e.stage && m.round === e.round);
}
export function advanceEurope(g: Game) {
  migrateGame(g);
  if (g.live && g.live.status !== "finished")
    throw Error("Завершите текущий матч");
  if (g.europe!.stage === "complete") return;
  if (
    g.careerMode === "match" &&
    europeanDayFixtures(g).some(
      (m) => !m.score && (m.home === g.club || m.away === g.club),
    )
  )
    throw Error("Сначала сыграйте матч клуба в центре матча");
  europeanDayFixtures(g).forEach((m) => playMatch(g, m));
  settleEuropeanDay(g);
}
export function advanceEuropeCalendar(g: Game) {
  while (
    g.europe!.stage !== "complete" &&
    (dates[g.europe!.day] ?? 38) <= g.round
  ) {
    if (
      g.careerMode === "match" &&
      europeanDayFixtures(g).some(
        (m) => !m.score && (m.home === g.club || m.away === g.club),
      )
    )
      break;
    advanceEurope(g);
  }
  if (seasonComplete(g)) finalizeSeason(g);
}
export function seasonComplete(g: Game) {
  return (
    g.matches.every((m) => !!m.score) &&
    g.europe?.stage === "complete" &&
    (!g.live || g.live.status === "finished")
  );
}
export function completeSeason(g: Game) {
  if (g.matches.some((m) => !m.score))
    throw Error("Сначала завершите чемпионаты");
  while (g.europe?.stage !== "complete") advanceEurope(g);
  finalizeSeason(g);
}
export function creditStatistics(g: Game, m: Match, before: PlayerBefore[]) {
  for (const saved of before) {
    const p = playerById(g, saved.id)!;
    if (!p) continue;
    if (m.competition !== "ucl") {
      p.leagueById ??= {};
      p.leagueById[m.league] ??= emptyStats();
      (Object.keys(p.stats) as (keyof Stats)[]).forEach((k) => {
        p.leagueById![m.league]![k] += p.stats[k] - saved.stats[k];
      });
    }
    const key = m.competition === "ucl" ? "europeanStats" : "leagueStats";
    p[key] ??= emptyStats();
    (Object.keys(p.stats) as (keyof Stats)[]).forEach((k) => {
      p[key]![k] += p.stats[k] - saved.stats[k];
    });
    const side = p.club === m.home ? 0 : 1;
    const rating = Math.max(
      4,
      Math.min(
        10,
        6.3 +
          (m.score![side] > m.score![1 - side] ? 0.55 : 0) +
          (p.stats.goals - saved.stats.goals) * 0.85 +
          (p.stats.assists - saved.stats.assists) * 0.5 +
          (p.stats.clean - saved.stats.clean) * 0.8 -
          (p.stats.red - saved.stats.red) * 1.5,
      ),
    );
    p.ratingSum = (p.ratingSum ?? 0) + rating;
    p.ratedApps = (p.ratedApps ?? 0) + 1;
    p.seasonClubs ??= [];
    if (p.club !== null && !p.seasonClubs.includes(p.club))
      p.seasonClubs.push(p.club);
  }
}
export function coachStats(g: Game) {
  const result = { ...(g.coach ?? totals()) };
  for (const m of [...g.matches, ...(g.europe?.matches ?? [])]) {
    if (!m.score || (m.home !== g.club && m.away !== g.club)) continue;
    const [a, b] = m.home === g.club ? m.score : [m.score[1], m.score[0]];
    result.played++;
    result.gf += a;
    result.ga += b;
    if (a > b) result.won++;
    else if (a === b) result.drawn++;
    else result.lost++;
  }
  return result;
}
export function archiveCoachSeason(g: Game) {
  g.coach = coachStats(g);
  g.coach.seasons++;
}
export const averageRating = (p: Player) =>
  (p.ratedApps ?? 0) ? (p.ratingSum ?? 0) / p.ratedApps! : 0;
export function finalizeSeason(g: Game) {
  if (!seasonComplete(g)) throw Error("Сезон ещё не завершён");
  g.awards ??= [];
  if (g.awards.some((a) => a.season === g.season)) return;
  const champions = leagues.map((_, l) => table(g, l)[0].club.id);
  const ucl = g.europe!.winner;
  const titles = (p: Player) =>
    champions.filter((c) => (p.seasonClubs ?? []).includes(c)).length +
    (ucl !== undefined && (p.seasonClubs ?? []).includes(ucl) ? 2 : 0);
  const nominee = (p: Player, score: number, detail: string): AwardNominee => ({
    id: p.id,
    name: p.name,
    club: p.club === null ? "Free agent" : g.clubs[p.club].name,
    score: Math.round(score * 100) / 100,
    photo: p.photo,
    detail,
  });
  const ranking = (
    ps: Player[],
    fn: (p: Player) => number,
    detail: (p: Player) => string,
  ) =>
    ps
      .filter((p) => p.stats.apps > 0)
      .map((p) => nominee(p, fn(p), detail(p)))
      .sort((a, b) => b.score - a.score || a.id - b.id)
      .slice(0, 30);
  const awards: Award[] = [];
  const add = (
    id: string,
    title: string,
    category: Award["category"],
    nominees: AwardNominee[],
    formula: string,
    team?: AwardNominee[],
  ) => {
    if (nominees.length)
      awards.push({
        id,
        title,
        category,
        winner: nominees[0],
        nominees: nominees.slice(0, id === "ballon" ? 30 : 5),
        formula,
        team,
      });
  };
  const influence = (p: Player) =>
    p.stats.goals * 4 +
    p.stats.assists * 3 +
    averageRating(p) * 10 +
    titles(p) * 25 +
    (p.europeanStats?.goals ?? 0) * 2;
  const detail = (p: Player) =>
    `${p.stats.goals} голов · ${p.stats.assists} передач · оценка ${averageRating(p).toFixed(2)}`;
  const world = ranking(g.players, influence, detail);
  add(
    "ballon",
    "Ballon d’Or — Золотой мяч",
    "world",
    world,
    "4 × голы + 3 × передачи + 10 × средняя оценка + 25 × вес трофеев + 2 × голы ЛЧ",
  );
  add(
    "shoe",
    "European Golden Shoe — Золотая бутса",
    "world",
    ranking(
      g.players,
      (p) => (p.leagueStats?.goals ?? 0) * 2,
      (p) => `${p.leagueStats?.goals ?? 0} голов в лигах × 2`,
    ),
    "Только голы национальных чемпионатов × коэффициент 2 (все пять топ-лиг)",
  );
  add(
    "fifa-player",
    "The Best FIFA Men’s Player",
    "world",
    world,
    "Индекс влияния: результативность, средняя оценка и трофеи",
  );
  const gk = ranking(
    g.players.filter((p) => p.pos === "GK"),
    (p) => p.stats.clean * 5 + averageRating(p) * 8 + titles(p) * 15,
    (p) =>
      `${p.stats.clean} сухих матчей · оценка ${averageRating(p).toFixed(2)}`,
  );
  add(
    "fifa-gk",
    "The Best FIFA Men’s Goalkeeper",
    "world",
    gk,
    "5 × сухие матчи + 8 × оценка + 15 × вес трофеев",
  );
  const xi: AwardNominee[] = [];
  for (const [ps, n] of [
    [["GK"], 1],
    [["CB", "LB", "RB"], 4],
    [["CM", "CDM", "CAM"], 3],
    [["LW", "RW", "ST"], 3],
  ] as [string[], number][]) {
    xi.push(
      ...ranking(
        g.players.filter((p) => ps.includes(p.pos)),
        influence,
        detail,
      ).slice(0, n),
    );
  }
  add(
    "world-xi",
    "FIFA World XI",
    "world",
    world,
    "Лучшие по индексу влияния в схеме 4-3-3",
    xi,
  );
  const europ = g.players.filter((p) => (p.europeanStats?.apps ?? 0) > 0);
  const euroScore = (p: Player) =>
    p.europeanStats!.goals * 4 +
    p.europeanStats!.assists * 3 +
    averageRating(p) * 5 +
    ((p.seasonClubs ?? []).includes(ucl!) ? 30 : 0);
  const euroDetail = (p: Player) =>
    `${p.europeanStats!.goals} голов · ${p.europeanStats!.assists} передач в ЛЧ`;
  const euro = ranking(europ, euroScore, euroDetail);
  add(
    "ucl-player",
    "UEFA — лучший игрок ЛЧ",
    "uefa",
    euro,
    "4 × голы ЛЧ + 3 × передачи ЛЧ + 5 × оценка + 30 за победу в ЛЧ",
  );
  add(
    "ucl-young",
    "UEFA — лучший молодой игрок",
    "uefa",
    ranking(
      europ.filter((p) => p.age <= 21 && !p.ageEstimated),
      euroScore,
      euroDetail,
    ),
    "Индекс ЛЧ, возраст не старше 21 года",
  );
  add(
    "ucl-gk",
    "UEFA — лучший вратарь",
    "uefa",
    ranking(
      europ.filter((p) => p.pos === "GK"),
      (p) => p.europeanStats!.clean * 5 + averageRating(p) * 5,
      (p) => `${p.europeanStats!.clean} сухих матчей в ЛЧ`,
    ),
    "5 × сухие матчи ЛЧ + 5 × оценка",
  );
  add(
    "ucl-scorer",
    "UEFA — бомбардир ЛЧ",
    "uefa",
    ranking(europ, (p) => p.europeanStats!.goals, euroDetail),
    "Голы только в ЛЧ; при равенстве — стабильный ID",
  );
  const exi: AwardNominee[] = [];
  for (const [ps, n] of [
    [["GK"], 1],
    [["CB", "LB", "RB"], 4],
    [["CM", "CDM", "CAM"], 3],
    [["LW", "RW", "ST"], 3],
  ] as [string[], number][]) {
    exi.push(
      ...ranking(
        europ.filter((p) => ps.includes(p.pos)),
        euroScore,
        euroDetail,
      ).slice(0, n),
    );
  }
  add(
    "ucl-xi",
    "UEFA — команда сезона",
    "uefa",
    euro,
    "Лучшие игроки ЛЧ по позициям 4-3-3",
    exi,
  );
  add(
    "all-scorer",
    "Бомбардир всех турниров",
    "world",
    ranking(g.players, (p) => p.stats.goals, detail),
    "Сумма голов чемпионата и ЛЧ",
  );
  const coaches = g.clubs
    .map((c) => {
      const matches = [...g.matches, ...g.europe!.matches].filter(
        (m) => m.score && (m.home === c.id || m.away === c.id),
      );
      const wins = matches.filter((m) =>
        m.home === c.id ? m.score![0] > m.score![1] : m.score![1] > m.score![0],
      ).length;
      const draws = matches.filter((m) => m.score![0] === m.score![1]).length;
      return {
        id: c.id,
        name: c.id === g.club ? g.manager : `Тренер ${c.name}`,
        club: c.name,
        score:
          wins * 3 +
          draws +
          (champions.includes(c.id) ? 35 : 0) +
          (ucl === c.id ? 60 : 0),
        detail: `${wins} побед · ${draws} ничьих`,
      };
    })
    .sort((a, b) => b.score - a.score || a.id - b.id);
  add(
    "fifa-coach",
    "The Best FIFA Men’s Coach",
    "coach",
    coaches.slice(0, 30),
    "3 × победы + ничьи + 35 за лигу + 60 за ЛЧ",
  );
  leagues.forEach((l, i) => {
    const ps = g.players.filter((p) => (p.leagueById?.[i]?.apps ?? 0) > 0);
    add(
      `league-${i}-goals`,
      `${l} — лучший бомбардир`,
      "league",
      ranking(
        ps,
        (p) => p.leagueById?.[i]?.goals ?? 0,
        (p) => `${p.leagueById?.[i]?.goals ?? 0} голов`,
      ),
      "Голы национального чемпионата",
    );
    add(
      `league-${i}-assists`,
      `${l} — лучший ассистент`,
      "league",
      ranking(
        ps,
        (p) => p.leagueById?.[i]?.assists ?? 0,
        (p) => `${p.leagueById?.[i]?.assists ?? 0} передач`,
      ),
      "Передачи национального чемпионата",
    );
    add(
      `league-${i}-player`,
      `${l} — игрок сезона`,
      "league",
      ranking(
        ps,
        (p) =>
          (p.leagueById?.[i]?.goals ?? 0) * 4 +
          (p.leagueById?.[i]?.assists ?? 0) * 3 +
          averageRating(p) * 10,
        detail,
      ),
      "Голы × 4 + передачи × 3 + оценка × 10",
    );
    add(
      `league-${i}-young`,
      `${l} — молодой игрок`,
      "league",
      ranking(
        ps.filter((p) => p.age <= 21 && !p.ageEstimated),
        influence,
        detail,
      ),
      "Индекс влияния, возраст до 21 года",
    );
    add(
      `league-${i}-gk`,
      `${l} — лучший вратарь`,
      "league",
      ranking(
        ps.filter((p) => p.pos === "GK"),
        (p) => (p.leagueById?.[i]?.clean ?? 0) * 5 + averageRating(p) * 5,
        (p) => `${p.leagueById?.[i]?.clean ?? 0} сухих матчей`,
      ),
      "Сухие матчи × 5 + оценка × 5",
    );
    add(
      `league-${i}-coach`,
      `${l} — тренер сезона`,
      "coach",
      coaches.filter((c) => g.clubs[c.id].league === i),
      "Победы, ничьи и трофеи",
    );
  });
  g.awards.unshift({ season: g.season, awards, champions, europeWinner: ucl });
  const winner = g.players.find((p) => p.id === world[0]?.id);
  if (winner) winner.ballon = (winner.ballon ?? 0) + 1;
  g.players.forEach((p) => {
    p.trophies =
      (p.trophies ?? 0) +
      champions.filter((c) => (p.seasonClubs ?? []).includes(c)).length +
      (ucl !== undefined && (p.seasonClubs ?? []).includes(ucl) ? 1 : 0);
  });
  g.news.unshift(
    `✨ Награды сезона ${g.season} рассчитаны. Церемония доступна во вкладке «Награды».`,
  );
}
