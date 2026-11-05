import { useState } from "react";
import type { Game, Player } from "./engine";
import { negotiate, signDeal, loanPlayer } from "./market";
import { Photo } from "./Media";
export function TransferDeal({
  game: g,
  player: p,
  fee,
  salary,
  act,
}: {
  game: Game;
  player: Player;
  fee: number;
  salary: number;
  act: (f: (g: Game) => void) => unknown;
}) {
  const [arrival, setArrival] = useState(false);
  const n = g.negotiation?.player === p.id ? g.negotiation : undefined;
  return (
    <div className="deal-room">
      {p.club !== g.club && (
        <>
          <span className="eyebrow">ПЕРЕГОВОРНАЯ КОМНАТА</span>
          <p>
            {n?.status === "counter"
              ? `Клуб предлагает €${n.counter.toLocaleString("ru")}. Измените сумму или примите встречное предложение.`
              : n?.status === "club-agreed"
                ? `Согласовано €${n.fee.toLocaleString("ru")} и €${n.salary.toLocaleString("ru")}/нед. Осталось подписать контракт. Изменённое предложение нужно обсудить заново.`
                : "Согласуйте стоимость и зарплату игрока."}
          </p>
          <div className="actions">
            <button
              className="primary"
              onClick={() => act((x) => negotiate(x, p.id, fee, salary))}
            >
              Обсудить предложение
            </button>
            {n?.status === "counter" && (
              <button
                onClick={() =>
                  act((x) => negotiate(x, p.id, n.counter, salary))
                }
              >
                Принять цену клуба
              </button>
            )}
            {n?.status === "club-agreed" && (
              <button
                className="gold-button"
                onClick={() => {
                  const ok = act(signDeal);
                  if (ok !== false) setArrival(true);
                }}
              >
                Подписать контракт
              </button>
            )}
            {p.club !== null && (
              <button
                onClick={() =>
                  act((x) =>
                    loanPlayer(x, p.id, x.club, Math.round(p.value * 0.05)),
                  )
                }
              >
                Арендовать до июня · €
                {Math.round(p.value * 0.05).toLocaleString("ru")}
              </button>
            )}
          </div>
          <small>
            Аренда: 5% стоимости, принимающий клуб платит всю зарплату. Покупка
            и аренда — только в окно; свободные агенты — круглый год.
          </small>
        </>
      )}
      {arrival && (
        <div className="modal-backdrop ceremony-backdrop">
          <section className="ceremony winner-reveal">
            <span className="eyebrow">КОНТРАКТ ПОДПИСАН</span>
            <div className="confetti">✦ ✧ ✦ ✨ ✦ ✧ ✦</div>
            <Photo src={p.photo} name={p.name} />
            <h1>{p.name}</h1>
            <h2>Добро пожаловать в {g.clubs[g.club].name}</h2>
            <p>€{(n?.fee ?? fee).toLocaleString("ru")} · 4 сезона</p>
            <button onClick={() => setArrival(false)}>
              Продолжить карьеру
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
