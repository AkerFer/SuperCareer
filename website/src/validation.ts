import type { Game, Match, Stats } from "./engine";
const statsKeys: (keyof Stats)[] = [
  "goals",
  "assists",
  "apps",
  "clean",
  "yellow",
  "red",
];
export function validStats(s: Stats | undefined): boolean {
  return !!s && statsKeys.every((k) => Number.isInteger(s[k]) && s[k] >= 0);
}
export function validCareerFields(g: Game): boolean {
  const club = (id: number) =>
    Number.isInteger(id) && id >= 0 && id < g.clubs.length;
  const playerIds = new Set(g.players.map((p) => p.id));
  const stages = ["league", "playoff", "r16", "qf", "sf", "final", "complete"];
  const match = (m: Match) =>
    Number.isInteger(m.id) &&
    club(m.home) &&
    club(m.away) &&
    m.home !== m.away &&
    Number.isInteger(m.round) &&
    (!m.score ||
      (Array.isArray(m.score) &&
        m.score.length === 2 &&
        m.score.every((n) => Number.isInteger(n) && n >= 0))) &&
    (!m.events ||
      (Array.isArray(m.events) &&
        m.events.every((e) => typeof e === "string")));
  if (
    !g.players.every(
      (p) =>
        Number.isInteger(p.id) &&
        p.id >= 0 &&
        (!p.positions ||
          (Array.isArray(p.positions) &&
            p.positions.length <= 10 &&
            p.positions.every((v) =>
              [
                "GK",
                "CB",
                "LB",
                "RB",
                "CDM",
                "CM",
                "CAM",
                "LW",
                "RW",
                "ST",
                "CF",
                "LM",
                "RM",
                "LWB",
                "RWB",
                "DF",
                "MF",
                "FW",
              ].includes(v),
            ))) &&
        (!p.bans ||
          ["league", "ucl"].every(
            (k) =>
              Number.isInteger(p.bans![k as "league" | "ucl"]) &&
              p.bans![k as "league" | "ucl"] >= 0,
          )) &&
        validStats(p.stats) &&
        validStats(p.career) &&
        (!p.leagueStats || validStats(p.leagueStats)) &&
        (!p.europeanStats || validStats(p.europeanStats)) &&
        (!p.leagueById ||
          Object.entries(p.leagueById).every(
            ([k, s]) =>
              Number.isInteger(+k) && +k >= 0 && +k < 5 && validStats(s),
          )) &&
        Number.isInteger(p.age) &&
        p.age >= 16 &&
        p.age <= 60 &&
        Number.isFinite(p.fitness) &&
        p.fitness >= 0 &&
        p.fitness <= 100 &&
        Number.isFinite(p.morale) &&
        p.morale >= 0 &&
        p.morale <= 100 &&
        Number.isInteger(p.injury) &&
        p.injury >= 0 &&
        Number.isInteger(p.contract) &&
        (!p.photo || typeof p.photo === "string"),
    )
  )
    return false;
  if (g.careerMode && !["calendar", "match"].includes(g.careerMode))
    return false;
  if (
    g.calendarDay &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(g.calendarDay) ||
      !Number.isFinite(Date.parse(g.calendarDay)))
  )
    return false;
  if (!g.matches.every(match)) return false;
  if (
    g.coach &&
    !["played", "won", "drawn", "lost", "gf", "ga", "seasons"].every(
      (k) =>
        Number.isInteger(g.coach![k as keyof typeof g.coach]) &&
        g.coach![k as keyof typeof g.coach] >= 0,
    )
  )
    return false;
  if (g.europe) {
    const e = g.europe;
    if (
      !Array.isArray(e.teams) ||
      e.teams.length !== 36 ||
      new Set(e.teams).size !== 36 ||
      !e.teams.every(club) ||
      !stages.includes(e.stage) ||
      !Number.isInteger(e.day) ||
      e.day < 0 ||
      e.day > 17 ||
      !Number.isInteger(e.round) ||
      e.round < 0 ||
      e.round > 7 ||
      !Array.isArray(e.qualified) ||
      !e.qualified.every(club) ||
      !Array.isArray(e.matches) ||
      !e.matches.every(
        (m) =>
          match(m) &&
          m.competition === "ucl" &&
          !!m.stage &&
          stages.includes(m.stage),
      ) ||
      new Set(e.matches.map((m) => m.id)).size !== e.matches.length ||
      (e.stage === "complete" &&
        (e.winner === undefined || !e.teams.includes(e.winner)))
    )
      return false;
  }
  if (g.awards && !Array.isArray(g.awards)) return false;
  if (
    g.awards &&
    !g.awards.every(
      (y) =>
        Number.isInteger(y.season) &&
        Array.isArray(y.champions) &&
        y.champions.every(club) &&
        Array.isArray(y.awards) &&
        y.awards.every(
          (a) =>
            typeof a.id === "string" &&
            typeof a.title === "string" &&
            typeof a.formula === "string" &&
            ["world", "uefa", "league", "coach"].includes(a.category) &&
            a.winner &&
            typeof a.winner.name === "string" &&
            Array.isArray(a.nominees) &&
            a.nominees.every(
              (n) =>
                typeof n.name === "string" &&
                typeof n.club === "string" &&
                Number.isFinite(n.score),
            ) &&
            (!a.team ||
              (Array.isArray(a.team) &&
                a.team.every((n) => typeof n.name === "string"))),
        ),
    )
  )
    return false;
  if (g.live) {
    const l = g.live;
    const ms = l.competition === "ucl" ? g.europe?.matches : g.matches;
    const m = ms?.find((m) => m.id === l.matchId);
    if (
      !m ||
      !["league", "ucl"].includes(l.competition) ||
      !Number.isInteger(l.minute) ||
      l.minute < 0 ||
      l.minute > 90 ||
      !["playing", "halftime", "paused", "finished", "review"].includes(
        l.status,
      ) ||
      (l.status === "halftime" && l.minute !== 45) ||
      (l.status === "finished" && (!m.score || l.minute !== 90)) ||
      !Array.isArray(l.score) ||
      l.score.length !== 2 ||
      !l.score.every((n) => Number.isInteger(n) && n >= 0) ||
      !Array.isArray(l.shots) ||
      l.shots.length !== 2 ||
      !l.shots.every((n) => Number.isInteger(n) && n >= 0) ||
      !Array.isArray(l.lineups) ||
      l.lineups.length !== 2 ||
      !l.lineups.every(
        (ids) =>
          Array.isArray(ids) &&
          ids.length <= 11 &&
          ids.every((id) => playerIds.has(id)),
      ) ||
      !Array.isArray(l.before) ||
      !l.before.every((p) => playerIds.has(p.id) && validStats(p.stats)) ||
      !Array.isArray(l.sentOff) ||
      !l.sentOff.every((id) => playerIds.has(id)) ||
      (l.bench !== undefined &&
        (!Array.isArray(l.bench) ||
          l.bench.length !== 2 ||
          !l.bench.every(
            (ids) =>
              Array.isArray(ids) &&
              ids.length <= 9 &&
              ids.every((id) => playerIds.has(id)),
          ))) ||
      (l.substitutions !== undefined &&
        (!Array.isArray(l.substitutions) ||
          !l.substitutions.every(
            (s) =>
              [0, 1].includes(s.side) &&
              playerIds.has(s.out) &&
              playerIds.has(s.in) &&
              Number.isInteger(s.minute) &&
              s.minute >= 0 &&
              s.minute <= 90,
          ))) ||
      (l.minutes !== undefined &&
        !Object.entries(l.minutes).every(
          ([id, n]) =>
            playerIds.has(+id) && Number.isInteger(n) && n >= 0 && n <= 90,
        )) ||
      (l.conceded !== undefined &&
        !Object.entries(l.conceded).every(
          ([id, n]) => playerIds.has(+id) && Number.isInteger(n) && n >= 0,
        )) ||
      (l.pendingVAR !== undefined &&
        (!["goal", "red"].includes(l.pendingVAR.kind) ||
          !["confirm", "cancel", "yellow"].includes(l.pendingVAR.decision) ||
          !playerIds.has(l.pendingVAR.player) ||
          ![0, 1].includes(l.pendingVAR.side))) ||
      (l.status === "review" && !l.pendingVAR) ||
      (l.yellowCards !== undefined &&
        !Object.entries(l.yellowCards).every(
          ([id, n]) =>
            playerIds.has(+id) && Number.isInteger(n) && n >= 0 && n <= 2,
        )) ||
      !Array.isArray(l.events) ||
      !l.events.every(
        (e) =>
          Number.isInteger(e.minute) &&
          e.minute >= (e.type === "sub" ? 0 : 1) &&
          e.minute <= 90 &&
          typeof e.text === "string" &&
          [0, 1].includes(e.side) &&
          playerIds.has(e.player),
      )
    )
      return false;
  }
  return true;
}
