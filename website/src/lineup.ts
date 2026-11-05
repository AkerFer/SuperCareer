import { autoLineup, playerById, squad, type Game } from "./engine";
import { liveFixture } from "./live";
export function liveSide(g: Game): 0 | 1 {
  const m = liveFixture(g);
  if (!m || (m.home !== g.club && m.away !== g.club))
    throw Error("Матч вашего клуба не найден");
  return m.home === g.club ? 0 : 1;
}
export function setLineupPlayer(
  g: Game,
  index: number,
  inId: number,
  liveMode = false,
) {
  if (index < 0 || index > 10) throw Error("Неверная позиция");
  const p = playerById(g, inId);
  if (!p || p.club !== g.club) throw Error("Игрок не в вашем клубе");
  if (p.injury) throw Error("Травмированный игрок не может выйти на поле");
  if (liveMode) {
    const live = g.live;
    if (!live || !["halftime", "paused"].includes(live.status))
      throw Error("Сначала поставьте матч на паузу");
    const side = liveSide(g);
    const ids = live.lineups[side];
    if (live.sentOff.includes(ids[index]))
      throw Error("Удалённого игрока нельзя заменить");
    const existing = ids.indexOf(inId);
    if (existing >= 0) {
      [ids[index], ids[existing]] = [ids[existing], ids[index]];
      return;
    }
    makeSubstitution(g, side, ids[index], inId);
    return;
  }
  if (g.live && g.live.status !== "finished")
    throw Error("Меняйте состав через меню текущего матча");
  const c = g.clubs[g.club];
  const existing = c.lineup.indexOf(inId);
  if (existing >= 0)
    [c.lineup[index], c.lineup[existing]] = [
      c.lineup[existing],
      c.lineup[index],
    ];
  else c.lineup[index] = inId;
  c.lineup = c.lineup.filter((id) => id !== undefined);
  if (c.captain === null || !c.lineup.includes(c.captain))
    c.captain = c.lineup[0] ?? null;
}
export function makeSubstitution(
  g: Game,
  side: 0 | 1,
  outId: number,
  inId: number,
) {
  const live = g.live,
    m = liveFixture(g);
  if (!live || !m || live.status === "finished") throw Error("Матч завершён");
  const ids = live.lineups[side],
    clubId = side === 0 ? m.home : m.away;
  const out = playerById(g, outId),
    incoming = playerById(g, inId);
  if (!out || !incoming || incoming.club !== clubId || !ids.includes(outId))
    throw Error("Неверные игроки для замены");
  if (live.sentOff.includes(outId) || live.sentOff.includes(inId))
    throw Error("Удалённого игрока нельзя заменять");
  if (incoming.injury) throw Error("Игрок травмирован");
  if (live.before.some((p) => p.id === inId))
    throw Error("Вышедший с поля игрок не может вернуться");
  live.bench ??= [
    squad(g, m.home)
      .filter((p) => !live.before.some((b) => b.id === p.id) && !p.injury)
      .slice(0, 9)
      .map((p) => p.id),
    squad(g, m.away)
      .filter((p) => !live.before.some((b) => b.id === p.id) && !p.injury)
      .slice(0, 9)
      .map((p) => p.id),
  ];
  if (!live.bench[side].includes(inId))
    throw Error("Игрок не включён в заявку матча");
  live.substitutions ??= [];
  if (live.substitutions.filter((s) => s.side === side).length >= 5)
    throw Error("Лимит пяти замен исчерпан");
  live.minutes ??= {};
  live.minutes[outId] ??= live.minute;
  live.minutes[inId] = 0;
  if (incoming.pos === "GK") {
    live.conceded ??= {};
    live.conceded[inId] = 0;
  }
  live.before.push({ id: incoming.id, stats: { ...incoming.stats } });
  incoming.stats.apps++;
  ids[ids.indexOf(outId)] = inId;
  live.substitutions.push({ side, out: outId, in: inId, minute: live.minute });
  live.events.push({
    minute: live.minute,
    type: "sub",
    side,
    player: inId,
    text: `${live.minute}′ ${out.name} → ${incoming.name} — замена`,
  });
}
export function resetBestLineup(g: Game) {
  if (g.live && g.live.status !== "finished")
    throw Error("Во время матча авторасстановка недоступна");
  autoLineup(g, g.club);
}
