import { prepareDomestic, domesticDay, settleDomestic } from "./domestic";
import { assignCard, banFor, serveBans } from "./discipline";
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
import { allClubMatches, cupDay, settleCup } from "./continental";
import type { Competition } from "./discipline";
import { injure } from "./injuries";
export function liveFixture(g: Game) {
  return allClubMatches(g).find((m) => m.id === g.live?.matchId);
}
export function beginLive(g: Game, competition: Competition = "league") {
  migrateGame(g);
  if (g.live && g.live.status !== "finished") return;
  if (competition === "domestic") prepareDomestic(g);
  let m =
    competition === "domestic"
      ? Object.values(g.domestic ?? {})
          .flatMap(domesticDay)
          .filter((m) => !m.score && (m.home === g.club || m.away === g.club))
          .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))[0]
      : competition !== "ucl" && competition !== "league"
        ? cupDay(g.continental![competition]!).find(
            (m) => !m.score && (m.home === g.club || m.away === g.club),
          )
        : competition === "ucl"
          ? europeanDayFixtures(g).find(
              (m) => !m.score && (m.home === g.club || m.away === g.club),
            )
          : g.matches
              .filter((m) => m.round === g.round)
              .find(
                (m) => !m.score && (m.home === g.club || m.away === g.club),
              );
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
        return (
          !p || p.club !== id || p.injury > 0 || banFor(p, competition) > 0
        );
      })
    )
      autoLineup(g, id, competition);
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
    yellowCards: {},
    bansAtStart: g.players
      .filter(
        (p) =>
          (p.club === m.home || p.club === m.away) &&
          banFor(p, competition) > 0,
      )
      .map((p) => p.id),
    sentOff: [],
    bench: [m.home, m.away].map((clubId, i) =>
      squad(g, clubId)
        .filter(
          (p) =>
            !lineups[i].includes(p.id) && !p.injury && !banFor(p, competition),
        )
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
          positionMultiplier(p, slots[index] ?? p.pos)
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
  serveBans(g, live.bansAtStart ?? [], live.competition);
  creditStatistics(g, m, live.before);
  if (live.competition === "ucl") settleEuropeanDay(g);
  else if (live.competition === "domestic") settleDomestic(g, m.tournament!);
  else if (live.competition !== "league")
    settleCup(g, g.continental![live.competition]!);
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
          ["ST", "CF", "FW"].includes(p.pos)
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
        if (random(g) < 0.24) {
          queueVAR(g, "goal", side, p.id, assist?.id);
          return;
        }
        creditGoal(g, side, p.id, assist?.id);
      }
    }
    if (ps.length && random(g) < 0.014) {
      const p = ps[Math.floor(random(g) * ps.length)];
      if (random(g) < 0.06) {
        if (random(g) < 0.45) {
          queueVAR(g, "red", side, p.id);
          return;
        }
        assignCard(g, side, p.id, "red");
      } else assignCard(g, side, p.id, "yellow");
    }
    if (
      ps.length &&
      random(g) <
        0.0015 *
          (ps.reduce((s, p) => s + p.fitness, 0) / ps.length < 65 ? 2 : 1)
    ) {
      const p = ps[Math.floor(random(g) * ps.length)];
      injure(g, p, liveFixture(g)?.date);
      live.events.push({
        minute: live.minute,
        type: "injury",
        side,
        player: p.id,
        text: `${live.minute}′ ${p.name} — ${p.injuryDetail?.kind} (${p.injuryDetail?.days} дн.)`,
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
  while (["playing", "review"].includes(g.live.status)) {
    if (g.live.status === "review") resolveVAR(g);
    else tickLive(g);
    if ((g.live.status as string) === "halftime") resumeLive(g);
  }
}

export function creditGoal(
  g: Game,
  side: 0 | 1,
  id: number,
  assistId?: number,
) {
  const l = g.live!;
  const p = playerById(g, id)!;
  const a = assistId === undefined ? undefined : playerById(g, assistId);
  p.stats.goals++;
  if (a) a.stats.assists++;
  l.score[side]++;
  l.shots[side]++;
  l.conceded ??= {};
  l.lineups[1 - side]
    .map((id) => playerById(g, id)!)
    .filter((p) => p.pos === "GK" && !l.sentOff.includes(p.id))
    .forEach((p) => {
      l.conceded![p.id] = (l.conceded![p.id] ?? 0) + 1;
    });
  l.events.push({
    minute: l.minute,
    type: "goal",
    side,
    player: id,
    assist: assistId,
    text: `${l.minute}′ ${p.name} — ГОЛ${a ? ` (пас: ${a.name})` : ""}`,
  });
}
export function queueVAR(
  g: Game,
  kind: "goal" | "red",
  side: 0 | 1,
  id: number,
  assist?: number,
) {
  const l = g.live!;
  const r = random(g);
  l.pendingVAR = {
    kind,
    side,
    player: id,
    assist,
    reason:
      kind === "goal"
        ? "Возможный офсайд / нарушение в атаке"
        : "Проверка серьёзного нарушения",
    decision:
      kind === "goal"
        ? r < 0.32
          ? "cancel"
          : "confirm"
        : r < 0.25
          ? "cancel"
          : r < 0.48
            ? "yellow"
            : "confirm",
  };
  l.status = "review";
  l.events.push({
    minute: l.minute,
    type: "var",
    side,
    player: id,
    text: `${l.minute}′ VAR — ${l.pendingVAR.reason}`,
  });
}
export function resolveVAR(g: Game) {
  const l = g.live;
  const review = l?.pendingVAR;
  if (!l || l.status !== "review" || !review) return;
  const p = playerById(g, review.player)!;
  if (review.kind === "goal" && review.decision === "confirm") {
    l.events.push({
      minute: l.minute,
      type: "var",
      side: review.side,
      player: p.id,
      text: `${l.minute}′ VAR: гол засчитан`,
    });
    creditGoal(g, review.side, p.id, review.assist);
  } else if (review.kind === "red" && review.decision === "confirm")
    assignCard(g, review.side, p.id, "red");
  else if (review.kind === "red" && review.decision === "yellow") {
    l.events.push({
      minute: l.minute,
      type: "var",
      side: review.side,
      player: p.id,
      text: `${l.minute}′ VAR: жёлтая вместо прямой красной`,
    });
    assignCard(g, review.side, p.id, "yellow");
  } else
    l.events.push({
      minute: l.minute,
      type: "var",
      side: review.side,
      player: p.id,
      text: `${l.minute}′ VAR: ${review.kind === "goal" ? "гол отменён — счёт не изменился" : "удаление отменено"}`,
    });
  delete l.pendingVAR;
  l.status = l.minute === 45 ? "halftime" : "playing";
  if (l.minute >= 90) finish(g, liveFixture(g)!, l);
}

/** Normal minute ticks touch only the live teams. The final minute needs a full copy for trophies and tables. */
export function cloneLiveFrame(g: Game, target: number): Game {
  const m = liveFixture(g);
  if (!m || !g.live || target >= 90) return structuredClone(g);
  return {
    ...g,
    live: structuredClone(g.live),
    players: g.players.map((p) =>
      p.club === m.home || p.club === m.away ? structuredClone(p) : p,
    ),
  };
}
