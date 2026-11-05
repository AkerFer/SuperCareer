import { advance, type Game, type Match } from "./engine";
import {
  advanceEuropeCalendar,
  europeanDayFixtures,
  seasonComplete,
} from "./career";
import { beginLive } from "./live";
import {
  allClubMatches,
  matchDate,
  advanceContinentalCalendar,
} from "./continental";
import type { Competition } from "./discipline";
import { advanceInternationals } from "./international";
import { domesticCalendar } from "./domestic";
import { recoverInjuries } from "./injuries";
export const europeanDates = [
  3, 6, 9, 12, 15, 18, 21, 24, 26, 27, 28, 29, 30, 31, 32, 33, 35,
];
export function roundDate(season: number, round: number) {
  return new Date(Date.UTC(season, 7, 9 + round * 7))
    .toISOString()
    .slice(0, 10);
}
export function careerDate(g: Game) {
  return g.calendarDay ?? roundDate(g.season, g.round);
}
export function nextCareerMatch(
  g: Game,
): { match: Match; competition: Competition } | undefined {
  const m = allClubMatches(g)
    .filter((m) => !m.score && (m.home === g.club || m.away === g.club))
    .sort((a, b) => matchDate(g, a).localeCompare(matchDate(g, b)))[0];
  return m ? { match: m, competition: m.competition ?? "league" } : undefined;
}
export function beginNextCareerMatch(g: Game) {
  if (g.live && g.live.status !== "finished") return;
  g.live = undefined;
  const current = g.matches.some(
    (m) =>
      m.round === g.round &&
      !m.score &&
      (m.home === g.club || m.away === g.club),
  );
  if (!current && g.round < 38 && g.matches.some((m) => !m.score))
    advance(g, 1);
  advanceEuropeCalendar(g);
  advanceContinentalCalendar(g);
  domesticCalendar(g);
  const next = nextCareerMatch(g);
  if (!next)
    throw Error(
      seasonComplete(g)
        ? "Сезон завершён — начните новый"
        : "Завершите оставшиеся матчи турниров",
    );
  beginLive(g, next.competition);
}
export function advanceCalendar(g: Game, days: number) {
  if (g.careerMode === "match")
    throw Error("В этом режиме каждый матч клуба нужно сыграть в центре матча");
  if (g.live && g.live.status !== "finished")
    throw Error("Завершите текущий матч");
  if (!Number.isInteger(days) || days < 0 || days > 400)
    throw Error("Неверное число дней");
  const end = new Date(careerDate(g) + "T12:00:00Z");
  end.setUTCDate(end.getUTCDate() + days);
  const target = end.toISOString().slice(0, 10);
  while (g.round < 38 && roundDate(g.season, g.round) <= target)
    advance(g, 1, false, target);
  advanceEuropeCalendar(g, target);
  advanceContinentalCalendar(g, target);
  domesticCalendar(g, target);
  advanceInternationals(g, target);
  recoverInjuries(g, target);
  g.calendarDay = target;
}
export function finishOtherFixtures(g: Game) {
  if (g.live && g.live.status !== "finished") throw Error("Завершите матч");
  if (
    g.matches.some(
      (m) =>
        m.round === g.round &&
        !m.score &&
        (m.home === g.club || m.away === g.club),
    )
  )
    throw Error("Сначала сыграйте матч клуба");
  advance(g, 1);
}
