import { useState } from "react";
import type { Game, Player } from "./engine";
import { playerPositions } from "./player-roles";
export function PlayerProfile({
  game: g,
  player: p,
  onClose,
}: {
  game: Game;
  player: Player;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal panel player-dossier"
        role="dialog"
        aria-modal="true"
        aria-label={`Досье ${p.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close" aria-label="Закрыть досье" onClick={onClose}>
          ×
        </button>
        <span className="eyebrow">ДОСЬЕ ФУТБОЛИСТА</span>
        <div className="profile-heading">
          <span className="profile-number">{p.rating}</span>
          <div>
            <h1>{p.name}</h1>
            <p>
              {playerPositions(p).join(" / ")} · {p.age} лет · {p.nation}
            </p>
          </div>
        </div>
        <p>
          {p.club === null ? "Свободный агент" : g.clubs[p.club].name} ·
          потенциал {p.potential} · форма {p.fitness}%
        </p>
        <div className="metrics">
          <div>
            <small>ГОЛЫ В КЛУБАХ</small>
            <b>{p.career.goals + p.stats.goals}</b>
          </div>
          <div>
            <small>ПЕРЕДАЧИ</small>
            <b>{p.career.assists + p.stats.assists}</b>
          </div>
          <div>
            <small>МАТЧИ</small>
            <b>{p.career.apps + p.stats.apps}</b>
          </div>
          <div>
            <small>ГОЛЫ ЗА СБОРНУЮ</small>
            <b>{p.nationalStats?.goals ?? 0}</b>
          </div>
        </div>
        <h3>Текущий сезон</h3>
        <p>
          {p.stats.apps} матчей · {p.stats.goals} голов · {p.stats.assists}{" "}
          передач · {p.stats.clean} сухих · {p.stats.yellow} ЖК · {p.stats.red}{" "}
          КК
        </p>
        <h3>Клубы и сезоны в этой карьере</h3>
        {p.clubHistory?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Сезон / клуб</th>
                  <th>И</th>
                  <th>Г</th>
                  <th>П</th>
                  <th>Сухие</th>
                </tr>
              </thead>
              <tbody>
                {[...p.clubHistory].reverse().map((r) => (
                  <tr key={r.season + ":" + r.club}>
                    <td>
                      {r.season}/{r.season + 1}
                      <small>{g.clubs[r.club]?.name ?? "Архивный клуб"}</small>
                    </td>
                    <td>{r.apps}</td>
                    <td>{r.goals}</td>
                    <td>{r.assists}</td>
                    <td>{r.clean}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">
            Детальная клубная история начнёт заполняться после сыгранного матча.
          </p>
        )}
        <h3>Сборная · статистика внутри карьеры</h3>
        <p>
          {p.nationalStats?.apps ?? 0} матчей · {p.nationalStats?.goals ?? 0}{" "}
          голов · {p.nationalStats?.assists ?? 0} передач
        </p>
        <h3>Награды</h3>
        <p>
          🏆 {p.trophies ?? 0} трофеев · Золотых мячей: {p.ballon ?? 0}
        </p>
        <h3>Переходы</h3>
        {g.transfers
          .filter((t) => t.name === p.name)
          .map((t, i) => (
            <p key={i}>
              {t.from} → {t.to} · €{t.fee.toLocaleString("ru")}
            </p>
          ))}
        <p className="muted">
          Показатели относятся к симуляции. История до начала карьеры и
          недетализированные старые сезоны не выдумываются.
        </p>
      </section>
    </div>
  );
}
export function PlayerDetails({
  game,
  player,
}: {
  game: Game;
  player: Player;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="player-inspect"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={`Статистика ${player.name}`}
      >
        ↗ Досье
      </button>
      {open && (
        <PlayerProfile
          game={game}
          player={player}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
