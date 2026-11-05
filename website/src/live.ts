import { makeSubstitution } from "./lineup";
import { roleFamily, formationRows, positionMultiplier } from "./tactics";
import {
  playerById,
  autoLineup,
  random,
  squad,
  advance,
  type Game,
  type Match,
} from "./engine";
import {
  creditStatistics,
  europeanDayFixtures,
  migrateGame,
  settleEuropeanDay,
  seasonComplete,
  finalizeSeason,
} from "./career";
import type { LiveMatch } from "./career-types";
export function liveFixture(g: Game) {
  return g.live?.competition === "ucl"
    ? g.europe?.matches.find((m) => m.id === g.live!.matchId)
    : g.matches.find((m) => m.id === g.live?.matchId);
}
export function beginLive(g: Game, competition: "league" | "ucl" = "league") {
  migrateGame(g);
  if (g.live && g.live.status !== "finished") return;
  let m =
    competition === "ucl"
      ? europeanDayFixtures(g).find(
          (m) => !m.score && (m.home === g.club || m.away === g.club),
        )
      : g.matches
          .filter((m) => m.round === g.round)
          .find((m) => !m.score && (m.home === g.club || m.away === g.club));
  if (
    !m &&
    competition === "league" &&
    g.matches.some((m) => !m.score && (m.home === g.club || m.away === g.club))
  ) {
    g.live = undefined;
    advance(g, 1);
    m = g.matches.find(
      (m) =>
        m.round === g.round &&
        !m.score &&
        (m.home === g.club || m.away === g.club),
    );
  }
  if (!m)
    throw Error(
      competition === "ucl"
        ? "Матч клуба в текущем дне ЛЧ не найден. Симулируйте игровой день ЛЧ."
        : "Сезон клуба завершён. Симулируйте оставшиеся туры и переходите к следующему сезону.",
    );
  const lineups = [m.home, m.away].map((id) => {
    const c = g.clubs[id];
    if (
      c.lineup.length !== 11 ||
      c.lineup.some((pid) => {
        const p = playerById(g, pid);
        return !p || p.club !== id || p.injury > 0;
      })
    )
      autoLineup(g, id);
    return [...c.lineup];
  }) as [number[], number[]];
  g.live = {
    competition,
    matchId: m.id,
    minute: 0,
    status: "playing",
    score: [0, 0],
    shots: [0, 0],
    events: [],
    lineups,
    before: lineups
      .flat()
      .map((id) => ({ id, stats: { ...playerById(g, id)!.stats } })),
    sentOff: [],
    bench: [m.home, m.away].map((clubId, i) =>
      squad(g, clubId)
        .filter((p) => !lineups[i].includes(p.id) && !p.injury)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 9)
        .map((p) => p.id),
    ) as [number[], number[]],
    substitutions: [],
    minutes: {},
    conceded: Object.fromEntries(
      lineups
        .flat()
        .filter((id) => playerById(g, id)?.pos === "GK")
        .map((id) => [id, 0]),
    ),
  };
  lineups.flat().forEach((id) => playerById(g, id)!.stats.apps++);
}
function power(g: Game, live: LiveMatch, side: number) {
  const m = liveFixture(g)!;
  const c = g.clubs[side === 0 ? m.home : m.away];
  const slots = formationRows(c.formation).flat();
  return (
    live.lineups[side].reduce((s, id, index) => {
      const p = playerById(g, id)!;
      if (live.sentOff.includes(id) || p.injury) return s;
      return (
        s +
        p.rating *
          (0.65 + p.fitness / 285) *
          (0.9 + p.morale / 750) *
          positionMultiplier(p.pos, slots[index] ?? p.pos)
      );
    }, 0) / 11
  );
}
function finish(g: Game, m: Match, live: LiveMatch) {
  m.score = [...live.score];
  m.shots = [...live.shots];
  m.timeline = [...live.events];
  m.events = live.events.map((e) => e.text);
  live.status = "finished";
  live.before.forEach((saved) => {
    const p = playerById(g, saved.id)!;
    const side = p.club === m.home ? 0 : 1;
    const minutes = live.minutes?.[p.id] ?? 90;
    p.fitness = Math.max(
      30,
      p.fitness - Math.round(((7 + Math.floor(random(g) * 8)) * minutes) / 90),
    );
    p.morale = Math.max(
      20,
      Math.min(
        100,
        p.morale + (live.score[side] > live.score[1 - side] ? 3 : -1),
      ),
    );
    if (
      p.pos === "GK" &&
      minutes >= 60 &&
      (live.conceded?.[p.id] ?? live.score[1 - side]) === 0
    )
      p.stats.clean++;
  });
  g.clubs[m.home].budget += 750000;
  g.clubs[m.home].income += 750000;
  creditStatistics(g, m, live.before);
  if (live.competition === "ucl") settleEuropeanDay(g);
  if (seasonComplete(g)) finalizeSeason(g);
}
export function tickLive(g: Game) {
  const live = g.live;
  if (!live || live.status !== "playing") return;
  const m = liveFixture(g);
  if (!m || m.score) return;
  live.minute++;
  live.minutes ??= {};
  live.conceded ??= {};
  live.lineups
    .flat()
    .filter((id) => !live.sentOff.includes(id) && !playerById(g, id)?.injury)
    .forEach((id) => {
      live.minutes![id] = (live.minutes![id] ?? live.minute - 1) + 1;
    });
  if ([60, 75].includes(live.minute) && live.bench) {
    const side = (m.home === g.club ? 1 : 0) as 0 | 1;
    const outgoing = live.lineups[side]
      .map((id) => playerById(g, id)!)
      .filter((p) => p.pos !== "GK" && !live.sentOff.includes(p.id))
      .sort((a, b) => b.injury - a.injury || a.fitness - b.fitness)[0];
    if (outgoing) {
      const incoming = live.bench[side]
        .map((id) => playerById(g, id)!)
        .filter(
          (p) => p && !p.injury && !live.before.some((b) => b.id === p.id),
        )
        .sort(
          (a, b) =>
            b.rating +
            (roleFamily(b.pos) === roleFamily(outgoing.pos) ? 20 : 0) -
            (a.rating +
              (roleFamily(a.pos) === roleFamily(outgoing.pos) ? 20 : 0)),
        )[0];
      if (incoming) makeSubstitution(g, side, outgoing.id, incoming.id);
    }
  }

  const powers = [power(g, live, 0), power(g, live, 1)];
  for (const side of [0, 1] as const) {
    const club = g.clubs[side === 0 ? m.home : m.away],
      other = g.clubs[side === 0 ? m.away : m.home];
    const ps = live.lineups[side]
      .filter((id) => !live.sentOff.includes(id))
      .map((id) => playerById(g, id)!)
      .filter((p) => p.injury === 0);
    const modifier =
      (club.style === "Атака" ? 1.25 : club.style === "Оборона" ? 0.8 : 1) *
      (other.style === "Атака" ? 1.15 : other.style === "Оборона" ? 0.85 : 1);
    const difficulty =
      club.id === g.club
        ? g.difficulty === "Сложно"
          ? 0.87
          : g.difficulty === "Легко"
            ? 1.14
            : 1
        : 1;
    const chance = Math.max(
      0.002,
      (1.25 *
        Math.exp((powers[side] - powers[1 - side]) / 25) *
        (side === 0 ? 1.18 : 1) *
        modifier *
        difficulty) /
        90,
    );
    if (random(g) < 0.11) live.shots[side]++;
    if (ps.length && random(g) < chance) {
      const weighted = ps.flatMap((p) =>
        Array(
          p.pos === "ST"
            ? 7
            : ["LW", "RW", "CAM"].includes(p.pos)
              ? 4
              : p.pos === "GK"
                ? 0
                : 1,
        ).fill(p),
      );
      if (weighted.length) {
        const p = weighted[Math.floor(random(g) * weighted.length)];
        const assists = ps.filter((a) => a.id !== p.id && a.pos !== "GK");
        const assist =
          assists.length && random(g) < 0.8
            ? assists[Math.floor(random(g) * assists.length)]
            : undefined;
        p.stats.goals++;
        if (assist) assist.stats.assists++;
        live.score[side]++;
        live.lineups[1 - side]
          .map((id) => playerById(g, id)!)
          .filter((p) => p.pos === "GK" && !live.sentOff.includes(p.id))
          .forEach((p) => {
            live.conceded![p.id] = (live.conceded![p.id] ?? 0) + 1;
          });
        live.shots[side]++;
        live.events.push({
          minute: live.minute,
          type: "goal",
          side,
          player: p.id,
          assist: assist?.id,
          text: `${live.minute}′ ${p.name} — ГОЛ${assist ? ` (пас: ${assist.name})` : ""}`,
        });
      }
    }
    if (ps.length && random(g) < 0.014) {
      const p = ps[Math.floor(random(g) * ps.length)];
      const red = random(g) < 0.06;
      if (red) {
        p.stats.red++;
        live.sentOff.push(p.id);
      } else p.stats.yellow++;
      live.events.push({
        minute: live.minute,
        type: red ? "red" : "yellow",
        side,
        player: p.id,
        text: `${live.minute}′ ${p.name} — ${red ? "красная" : "жёлтая"} карточка`,
      });
    }
    if (ps.length && random(g) < 0.0015) {
      const p = ps[Math.floor(random(g) * ps.length)];
      p.injury = 1 + Math.floor(random(g) * 4);
      live.events.push({
        minute: live.minute,
        type: "injury",
        side,
        player: p.id,
        text: `${live.minute}′ ${p.name} — травма (${p.injury} тур.)`,
      });
    }
  }
  if (live.minute === 45) live.status = "halftime";
  if (live.minute >= 90) finish(g, m, live);
}
export function resumeLive(g: Game) {
  if (g.live && (g.live.status === "halftime" || g.live.status === "paused"))
    g.live.status = "playing";
}
export function skipLive(g: Game) {
  if (!g.live) return;
  resumeLive(g);
  while (g.live.status === "playing") {
    tickLive(g);
    if ((g.live.status as string) === "halftime") resumeLive(g);
  }
}
