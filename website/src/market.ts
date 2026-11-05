import {
  invalidateSquads,
  autoLineup,
  squad,
  transfer,
  type Game,
} from "./engine";
import { careerDate } from "./calendar";
export function windowOpen(g: Game) {
  const date = careerDate(g);
  const month = +date.slice(5, 7);
  return month === 1 || month === 7 || month === 8;
}
export function negotiate(
  g: Game,
  player: number,
  fee: number,
  salary: number,
) {
  if (g.live && g.live.status !== "finished") throw Error("Завершите матч");
  const p = g.players.find((p) => p.id === player);
  if (!p || p.club === g.club) throw Error("Игрок недоступен");
  if (p.club !== null && !windowOpen(g))
    throw Error("Окно закрыто: доступны только свободные агенты");
  if (g.loans?.some((l) => l.player === player))
    throw Error("Игрок находится в аренде");
  if (
    !Number.isFinite(fee) ||
    fee < 0 ||
    !Number.isFinite(salary) ||
    salary < p.salary
  )
    throw Error("Игрок требует зарплату не ниже текущей");
  if (g.clubs[g.club].budget < fee)
    throw Error(
      "Недостаточно средств: уменьшите предложение или продайте игроков",
    );
  const counter =
    p.club === null ? 0 : Math.round(p.value * (p.contract <= 1 ? 0.9 : 1.1));
  g.negotiation = {
    player,
    buyer: g.club,
    fee,
    salary,
    counter,
    round: (g.negotiation?.player === player ? g.negotiation.round : 0) + 1,
    status: fee >= counter ? "club-agreed" : "counter",
    created: careerDate(g),
  };
}
export function signDeal(g: Game) {
  const n = g.negotiation;
  if (!n || n.status !== "club-agreed") throw Error("Сначала согласуйте цену");
  if (n.buyer !== g.club) throw Error("Предложение относится к другому клубу");
  transfer(g, n.player, n.buyer, n.fee, n.salary);
  n.status = "signed";
}
export function loanPlayer(
  g: Game,
  player: number,
  buyer: number,
  fee: number,
) {
  if (g.live && g.live.status !== "finished") throw Error("Завершите матч");
  if (!windowOpen(g)) throw Error("Аренда доступна только в трансферное окно");
  const p = g.players.find((p) => p.id === player);
  if (
    !p ||
    p.club === null ||
    p.club === buyer ||
    g.loans?.some((l) => l.player === player)
  )
    throw Error("Игрок недоступен для аренды");
  if (squad(g, p.club).length <= 16)
    throw Error("В клубе недостаточно игроков");
  const minimum = Math.round(p.value * 0.05);
  if (!Number.isFinite(fee) || fee < minimum)
    throw Error(`Аренда стоит минимум €${minimum}`);
  if (g.clubs[buyer].budget < fee) throw Error("Недостаточно средств");
  const owner = p.club;
  g.clubs[owner].budget += fee;
  g.clubs[owner].income += fee;
  g.clubs[buyer].budget -= fee;
  g.clubs[buyer].expenses += fee;
  g.loans ??= [];
  g.loans.push({
    player,
    owner,
    club: buyer,
    end: `${g.season + 1}-06-30`,
    fee,
    salaryShare: 1,
  });
  p.club = buyer;
  invalidateSquads(g);
  autoLineup(g, owner);
  autoLineup(g, buyer);
  g.news.unshift(`${p.name}: аренда в ${g.clubs[buyer].name} до 30 июня`);
}
export function returnLoans(g: Game, date: string) {
  const due = (g.loans ?? []).filter((l) => l.end <= date);
  for (const l of due) {
    const p = g.players.find((p) => p.id === l.player);
    if (p) {
      p.club = l.owner;
      invalidateSquads(g);
      autoLineup(g, l.owner);
      autoLineup(g, l.club);
    }
  }
  g.loans = (g.loans ?? []).filter((l) => l.end > date);
}
