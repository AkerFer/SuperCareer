import { useState } from "react";
import { playerById, squad, type Game } from "./engine";
import { Photo } from "./Media";
import { formations, formationRows, roleFamily } from "./tactics";
import { liveSide, resetBestLineup, setLineupPlayer } from "./lineup";
export function LineupView({
  game: g,
  act,
  liveMode = false,
  onPlayer,
}: {
  game: Game;
  act: (fn: (x: Game) => void) => void;
  liveMode?: boolean;
  onPlayer?: (id: number) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [benchPick, setBenchPick] = useState<number | null>(null);
  const c = g.clubs[g.club];
  const side = liveMode ? liveSide(g) : 0;
  const live = liveMode ? g.live : undefined;
  const ids = live ? live.lineups[side] : c.lineup;
  const benchIds = live
    ? (live.bench?.[side] ??
      squad(g, g.club)
        .filter((p) => !live.before.some((b) => b.id === p.id))
        .slice(0, 9)
        .map((p) => p.id))
    : squad(g, g.club)
        .filter((p) => !ids.includes(p.id))
        .sort((a, b) => b.rating - a.rating)
        .map((p) => p.id);
  const used = live?.substitutions?.filter((s) => s.side === side) ?? [];
  const rows = formationRows(c.formation);
  const rowIndices = rows
    .map((row, i) => ({ row, offset: rows.slice(0, i).flat().length }))
    .reverse();
  const chosen = selected === null ? undefined : playerById(g, ids[selected]);
  const apply = (index: number, id: number) => {
    act((x) => setLineupPlayer(x, index, id, liveMode));
    setSelected(null);
    setBenchPick(null);
  };
  function tapSlot(index: number) {
    if (benchPick !== null) {
      apply(index, benchPick);
      return;
    }
    if (selected !== null && selected !== index && ids[index] !== undefined) {
      apply(selected, ids[index]);
      return;
    }
    setSelected(selected === index ? null : index);
  }
  return (
    <section className={"squad-board " + (liveMode ? "in-match-board" : "")}>
      <div className="squad-toolbar">
        <div>
          <span className="eyebrow">
            {liveMode ? "УПРАВЛЕНИЕ МАТЧЕМ" : "ТАКТИЧЕСКАЯ ДОСКА"}
          </span>
          <h3>
            {liveMode ? `Замены: ${used.length} / 5` : "Стартовый состав"}
          </h3>
        </div>
        <select
          aria-label={liveMode ? "Расстановка в матче" : "Расстановка на поле"}
          value={c.formation}
          onChange={(e) => {
            act((x) => {
              x.clubs[x.club].formation = e.target.value;
              if (!liveMode) resetBestLineup(x);
            });
            setSelected(null);
            setBenchPick(null);
          }}
        >
          {formations.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
        {!liveMode && (
          <button
            onClick={() => {
              act(resetBestLineup);
              setSelected(null);
              setBenchPick(null);
            }}
          >
            Автовыбор 11
          </button>
        )}
      </div>
      <div className="pitch-layout">
        <div className="football-pitch" aria-label="Футбольное поле">
          <div className="pitch-markings">
            <span className="centre-circle" />
            <span className="penalty-box top-box" />
            <span className="penalty-box bottom-box" />
            <span className="goal-box top-goal" />
            <span className="goal-box bottom-goal" />
          </div>
          {rowIndices.map(({ row, offset }, r) => (
            <div
              className="pitch-row"
              key={offset}
              style={{ top: `${11 + r * (78 / (rows.length - 1))}%` }}
            >
              {row.map((role, j) => {
                const index = offset + j;
                const p = playerById(g, ids[index]);
                const off = p && live?.sentOff.includes(p.id);
                const wrong = p && roleFamily(p.pos) !== roleFamily(role);
                return (
                  <button
                    className={`pitch-player ${selected === index ? "selected" : ""} ${off ? "sent-off" : ""} ${wrong ? "out-of-position" : ""}`}
                    key={index}
                    aria-label={`Позиция ${index + 1}: ${p?.name ?? "Пусто"}`}
                    aria-pressed={selected === index}
                    disabled={!!off}
                    onClick={() => tapSlot(index)}
                  >
                    <span className="slot-role">{role}</span>
                    <span className="pitch-shirt">
                      <Photo src={p?.photo} name={p?.name ?? "+"} />
                      <b>{p?.rating ?? "+"}</b>
                      {p?.id === c.captain && <em>К</em>}
                      {off && <em className="red-badge">🟥</em>}
                      {p?.injury ? <em className="injury-badge">✚</em> : null}
                    </span>
                    <strong>
                      {p?.name.split(" ").slice(-1).join(" ") ?? "Выбрать"}
                    </strong>
                    <small>
                      {p ? `${p.pos} · ${p.fitness}%` : "Пустая позиция"}
                    </small>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="bench-panel">
          <h3>
            {liveMode ? "Заявка на матч" : "Запасные"}{" "}
            <span className="tag">{benchIds.length}</span>
          </h3>
          <p className="lineup-hint" aria-live="polite">
            {selected !== null
              ? `${chosen?.name ?? "Пустая позиция"}: выберите запасного или другого игрока на поле.`
              : benchPick !== null
                ? `${playerById(g, benchPick)?.name}: выберите место на поле.`
                : "Нажмите игрока на поле, затем запасного. Два игрока на поле меняются местами."}
          </p>
          {benchIds.map((id) => {
            const p = playerById(g, id)!;
            const played = !!live?.before.some((b) => b.id === id);
            const disabled =
              p.injury > 0 || played || (!!live && used.length >= 5);
            return (
              <button
                className={`bench-player ${benchPick === id ? "selected" : ""}`}
                key={id}
                disabled={disabled}
                aria-label={`Запасной ${p.name}`}
                onClick={() =>
                  selected !== null
                    ? apply(selected, id)
                    : setBenchPick(benchPick === id ? null : id)
                }
              >
                <Photo src={p.photo} name={p.name} />
                <span>
                  <b>{p.name}</b>
                  <small>
                    {p.pos} · {p.fitness}%{" "}
                    {p.injury ? "· Травма" : played ? "· Уже сыграл" : ""}
                  </small>
                </span>
                <strong>{p.rating}</strong>
              </button>
            );
          })}
          {chosen && (
            <div className="selected-player-info">
              <b>{chosen.name}</b>
              <p>
                {chosen.pos} · Рейтинг {chosen.rating} · Мораль {chosen.morale}%
              </p>
              {!liveMode && (
                <div className="actions">
                  <button
                    onClick={() =>
                      act((x) => {
                        x.clubs[x.club].captain = chosen.id;
                      })
                    }
                  >
                    Назначить капитаном
                  </button>
                  {onPlayer && (
                    <button onClick={() => onPlayer(chosen.id)}>
                      Карточка игрока
                    </button>
                  )}
                </div>
              )}
              <button
                className="link"
                onClick={() => {
                  setSelected(null);
                  setBenchPick(null);
                }}
              >
                Отменить выбор
              </button>
            </div>
          )}
        </div>
      </div>
      <p className="muted">
        {liveMode
          ? "До 5 замен за матч. Вышедший игрок не может вернуться; удалённого заменить нельзя. Состав на следующий матч остаётся отдельным."
          : "Выбор и перестановки поддерживают касания на Android. Игра не по позиции снижает силу футболиста в матче."}
      </p>
      {live && used.length > 0 && (
        <div className="substitution-log">
          {used.map((s, i) => (
            <p key={i}>
              {s.minute}′ ⇄ {playerById(g, s.out)?.name} →{" "}
              <b>{playerById(g, s.in)?.name}</b>
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
