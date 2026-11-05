import { useState } from "react";
import { LineupView } from "./LineupView";
import type { Game } from "./engine";
import { liveFixture, resumeLive, skipLive } from "./live";
import { Photo } from "./Media";
export function LiveView({
  game: g,
  act,
}: {
  game: Game;
  act: (fn: (x: Game) => void) => void;
}) {
  const [showLineup, setShowLineup] = useState(false);
  const live = g.live;
  if (!live) return null;
  const m = liveFixture(g);
  if (!m) return null;
  const home = g.clubs[m.home],
    away = g.clubs[m.away];
  return (
    <div className="modal-backdrop live-backdrop">
      <section className="live-stadium">
        <div className="live-top">
          <span className="tag">
            {live.competition === "ucl"
              ? "UEFA CHAMPIONS LEAGUE"
              : "ПРЯМОЙ ЭФИР"}
          </span>
          <span className={live.status === "playing" ? "live-light" : ""}>
            {live.status === "halftime"
              ? "ПЕРЕРЫВ"
              : live.status === "finished"
                ? "ФИНАЛЬНЫЙ СВИСТОК"
                : live.status === "paused"
                  ? "ПАУЗА"
                  : "● LIVE"}
          </span>
        </div>
        <div className="live-score">
          <div>
            <Photo src={home.logo} name={home.name} className="club-photo" />
            <b>{home.name}</b>
          </div>
          <div>
            <strong aria-label="Счёт матча">{live.score.join(" : ")}</strong>
            <div className="minute" data-testid="live-minute">
              {live.minute}′
            </div>
          </div>
          <div>
            <Photo src={away.logo} name={away.name} className="club-photo" />
            <b>{away.name}</b>
          </div>
        </div>
        <div className="match-progress">
          <span style={{ width: `${(live.minute / 90) * 100}%` }} />
        </div>
        <p className="muted center">
          Удары {live.shots.join(" : ")} · 90 минут ≈ 10 секунд активной
          симуляции
        </p>
        <div className="live-events" aria-live="polite">
          {!live.events.length && (
            <p className="muted center">Команды ищут свободные зоны…</p>
          )}
          {[...live.events].reverse().map((e, i) => (
            <div
              className={`live-event ${e.type}`}
              key={e.minute + "-" + e.player + "-" + i}
            >
              <span>{e.minute}′</span>
              <Photo
                src={g.players.find((p) => p.id === e.player)?.photo}
                name={g.players.find((p) => p.id === e.player)?.name ?? ""}
              />
              <div>
                <b>
                  {e.type === "goal"
                    ? "⚽ ГОЛ!"
                    : e.type === "injury"
                      ? "✚ Травма"
                      : e.type === "red"
                        ? "🟥 Удаление"
                        : e.type === "sub"
                          ? "⇄ Замена"
                          : "🟨 Предупреждение"}
                </b>
                <small>{e.text.slice(e.text.indexOf(" ") + 1)}</small>
              </div>
              <small>{e.side === 0 ? home.name : away.name}</small>
            </div>
          ))}
        </div>
        {m.penalties && (
          <p className="center">
            Пенальти: {m.penalties.join(" : ")} · Победитель:{" "}
            {g.clubs[m.winner!].name}
          </p>
        )}
        {showLineup && live.status !== "finished" && (
          <div className="live-lineup">
            <LineupView game={g} act={act} liveMode />
            <button className="wide" onClick={() => setShowLineup(false)}>
              Вернуться к матчу
            </button>
          </div>
        )}
        <div className="actions live-controls">
          {live.status === "halftime" && (
            <button
              className="primary"
              onClick={() => {
                setShowLineup(false);
                act(resumeLive);
              }}
            >
              Начать второй тайм →
            </button>
          )}
          {live.status === "paused" && (
            <button
              className="primary"
              onClick={() => {
                setShowLineup(false);
                act(resumeLive);
              }}
            >
              Продолжить матч
            </button>
          )}
          {live.status === "playing" && (
            <button
              onClick={() =>
                act((x) => {
                  x.live!.status = "paused";
                })
              }
            >
              Пауза
            </button>
          )}
          {live.status !== "finished" && (
            <button
              className="primary"
              onClick={() => {
                if (live.status === "playing")
                  act((x) => {
                    x.live!.status = "paused";
                  });
                setShowLineup((v) => !v);
              }}
            >
              Состав и замены
            </button>
          )}
          {live.status !== "finished" && (
            <button onClick={() => act(skipLive)}>Досмотреть мгновенно</button>
          )}
          {live.status === "finished" && (
            <button
              className="primary"
              onClick={() =>
                act((x) => {
                  x.live = undefined;
                })
              }
            >
              Готово →
            </button>
          )}
        </div>
        <small className="center">
          События и текущая минута автоматически сохраняются. Перерыв длится до
          вашего нажатия.
        </small>
      </section>
    </div>
  );
}
