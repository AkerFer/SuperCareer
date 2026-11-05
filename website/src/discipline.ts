import type { Game, Player } from "./engine";
export type Competition =
  "league" | "domestic" | import("./world-types").ClubCupId;
export const banFor = (p: Player, competition: Competition = "league") =>
  p.bans?.[competition] ?? (competition === "league" ? (p.suspension ?? 0) : 0);
export function assignCard(
  g: Game,
  side: 0 | 1,
  id: number,
  kind: "yellow" | "red",
) {
  const live = g.live;
  if (!live || live.sentOff.includes(id)) return;
  const p = g.players.find((p) => p.id === id)!;
  const comp = live.competition;
  p.bans ??= { league: p.suspension ?? 0, ucl: 0 };
  p.yellowCarryByCompetition ??= { league: p.yellowCarry ?? 0, ucl: 0 };
  live.yellowCards ??= {};
  if (kind === "yellow") {
    p.stats.yellow++;
    live.yellowCards[id] = (live.yellowCards[id] ?? 0) + 1;
    p.yellowCarryByCompetition[comp] =
      (p.yellowCarryByCompetition[comp] ?? 0) + 1;
    if ((p.yellowCarryByCompetition[comp] ?? 0) >= 5) {
      p.yellowCarryByCompetition[comp] = 0;
      p.bans[comp] = Math.max(p.bans[comp] ?? 0, 1);
    }
    if (live.yellowCards[id] === 2) {
      p.stats.red++;
      live.sentOff.push(id);
      p.bans[comp] = Math.max(p.bans[comp] ?? 0, 1);
      live.events.push({
        minute: live.minute,
        type: "red",
        side,
        player: id,
        text: `${live.minute}′ ${p.name} — вторая жёлтая и удаление (дисквалификация 1 матч)`,
      });
    } else
      live.events.push({
        minute: live.minute,
        type: "yellow",
        side,
        player: id,
        text: `${live.minute}′ ${p.name} — жёлтая карточка`,
      });
  } else {
    p.stats.red++;
    live.sentOff.push(id);
    p.bans[comp] = Math.max(p.bans[comp] ?? 0, 3);
    live.events.push({
      minute: live.minute,
      type: "red",
      side,
      player: id,
      text: `${live.minute}′ ${p.name} — прямая красная (дисквалификация 3 матча)`,
    });
  }
}
export function serveBans(g: Game, ids: number[], competition: Competition) {
  for (const id of ids) {
    const p = g.players.find((p) => p.id === id);
    if (!p) continue;
    p.bans ??= { league: p.suspension ?? 0, ucl: 0 };
    p.bans[competition] = Math.max(0, (p.bans[competition] ?? 0) - 1);
    if (competition === "league") p.suspension = 0;
  }
}
