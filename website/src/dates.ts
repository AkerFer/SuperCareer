export function roundDate(season: number, round: number) {
  return new Date(Date.UTC(season, 7, 9 + round * 7))
    .toISOString()
    .slice(0, 10);
}
export function addDays(date: string, n: number) {
  const d = new Date(date + "T12:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const uclSlots = [
  3, 6, 9, 12, 15, 18, 21, 24, 26, 27, 28, 29, 30, 31, 32, 33, 35,
];
export function europeanDate(season: number, slot: number, thursday = false) {
  return addDays(roundDate(season, Math.max(0, slot - 1)), thursday ? 5 : 4);
}
