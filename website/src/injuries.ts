import { random, type Game, type Player } from "./engine";
import { addDays, roundDate } from "./dates";
export function injure(
  g: Game,
  p: Player,
  date = g.calendarDay ?? roundDate(g.season, g.round),
) {
  const draw = random(g);
  const [kind, min, max] =
    draw < 0.45
      ? (["Ушиб", 3, 8] as const)
      : draw < 0.72
        ? (["Растяжение", 10, 21] as const)
        : draw < 0.92
          ? (["Повреждение мышц", 21, 42] as const)
          : draw < 0.985
            ? (["Травма голеностопа", 35, 70] as const)
            : (["Разрыв крестообразной связки", 180, 300] as const);
  const days = min + Math.floor(random(g) * (max - min + 1));
  p.injuryDetail = {
    kind,
    days,
    start: date,
    until: addDays(date, days),
    cause: p.fitness < 65 && random(g) < 0.7 ? "overload" : "contact",
  };
  p.injury = Math.ceil(days / 7);
  return `${kind} · ${days} дн. · ${p.injuryDetail.cause === "overload" ? "перегрузка" : "столкновение"}`;
}
export function recoverInjuries(g: Game, date: string) {
  for (const p of g.players)
    if (p.injuryDetail) {
      p.injury = Math.max(
        0,
        Math.ceil(
          (Date.parse(p.injuryDetail.until) - Date.parse(date)) / 604800000,
        ),
      );
      if (!p.injury) p.injuryDetail = undefined;
    }
}
export function injuryRisk(p: Player) {
  return 0.012 * (p.fitness < 55 ? 2.5 : p.fitness < 75 ? 1.5 : 1);
}
