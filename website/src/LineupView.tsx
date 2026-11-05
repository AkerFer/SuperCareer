import { PlayerProfile, PlayerDetails } from "./PlayerProfile";
import { banFor } from "./discipline";
import { useLineupDrag } from "./useLineupDrag";
import { playerPositions } from "./player-roles";
import { useState } from "react";
import { playerById, squad, type Game } from "./engine";
import { Photo } from "./Media";
import { formations, formationRows, positionMultiplier } from "./tactics";
import { liveSide, resetBestLineup, setLineupPlayer } from "./lineup";
import { effectiveRating } from "./tactics";
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
  const [inspect, setInspect] = useState(!liveMode);
  const [profile, setProfile] = useState<number | null>(null);
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
  const drag = useLineupDrag(ids, apply);
  function tapSlot(index: number) {
    if (drag.suppressClick()) return;
    if (inspect && ids[index] !== undefined) {
      setProfile(ids[index]);
      return;
    }
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
      {profile !== null && playerById(g, profile) && (
        <PlayerProfile
          game={g}
          player={playerById(g, profile)!}
          onClose={() => setProfile(null)}
        />
      )}
      <div className="squad-toolbar">
        <div className="board-modes">
          <button
            className={inspect ? "active" : ""}
            onClick={() => setInspect(true)}
          >
            Досье игроков
          </button>
          <button
            className={!inspect ? "active" : ""}
            onClick={() => setInspect(false)}
          >
            Менять состав
          </button>
        </div>
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
                const wrong = p && positionMultiplier(p, role) < 0.9;
                return (
                  <button
                    className={`pitch-player ${selected === index ? "selected" : ""} ${off ? "sent-off" : ""} ${drag.over === index ? "drag-over" : ""} ${drag.dragged === p?.id ? "drag-source" : ""} ${wrong ? "out-of-position" : ""}`}
                    key={index}
                    data-pitch-slot={index}
                    draggable={!!p && !off}
                    onDragStart={(e) => p && drag.nativeStart(p.id, e)}
                    onDragEnd={drag.nativeEnd}
                    onDragOver={(e) => {
                      if (!off) {
                        e.preventDefault();
                        drag.hover(index);
                        drag.over !== index &&
                          e.dataTransfer &&
                          (e.dataTransfer.dropEffect = "move");
                      }
                    }}
                    onDrop={(e) => drag.dropSlot(index, e)}
                    aria-label={`Позиция ${index + 1}: ${p?.name ?? "Пусто"}`}
                    aria-pressed={selected === index}
                    disabled={!!off && !inspect}
                    onClick={() => tapSlot(index)}
                  >
                    <span className="slot-role">{role}</span>
                    {p && !off && (
                      <span
                        className="drag-handle pitch-drag"
                        aria-label={`Перетащить ${p.name}`}
                        onPointerDown={(e) => drag.down(p.id, e)}
                        onPointerMove={drag.move}
                        onPointerUp={drag.up}
                        onPointerCancel={drag.cancel}
                        onClick={(e) => e.stopPropagation()}
                      >
                        ⠿
                      </span>
                    )}
                    <span className="pitch-shirt" key={p?.id ?? index}>
                      <Photo
                        src={p?.photo}
                        name={p?.name ?? "+"}
                        real={p?.real}
                      />
                      <b>{p ? effectiveRating(p, role) : "+"}</b>
                      {p?.id === c.captain && <em>К</em>}
                      {off && <em className="red-badge">🟥</em>}
                      {!off && p && (live?.yellowCards?.[p.id] ?? 0) > 0 && (
                        <em className="yellow-badge">ЖК</em>
                      )}
                      {p &&
                        live &&
                        live.events.some(
                          (e) => e.type === "goal" && e.player === p.id,
                        ) && (
                          <em className="goal-badge">
                            ⚽
                            {
                              live.events.filter(
                                (e) => e.type === "goal" && e.player === p.id,
                              ).length
                            }
                          </em>
                        )}
                      {p?.injury ? <em className="injury-badge">✚</em> : null}
                    </span>
                    <strong>
                      {p?.name.split(" ").slice(-1).join(" ") ?? "Выбрать"}
                    </strong>
                    <small>
                      {p
                        ? `${playerPositions(p).join("/")} · ${p.fitness}%`
                        : "Пустая позиция"}
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
              p.injury > 0 ||
              banFor(p, live?.competition ?? "league") > 0 ||
              played ||
              (!!live && used.length >= 5);
            return (
              <button
                className={`bench-player ${benchPick === id ? "selected" : ""}`}
                key={id}
                data-bench-player={id}
                draggable={!disabled}
                onDragStart={(e) => drag.nativeStart(id, e)}
                onDragEnd={drag.nativeEnd}
                onDragOver={(e) => {
                  if (!disabled) e.preventDefault();
                }}
                onDrop={(e) => drag.dropBench(id, e)}
                disabled={disabled && !inspect}
                aria-label={`Запасной ${p.name}`}
                onClick={() =>
                  drag.suppressClick()
                    ? undefined
                    : inspect
                      ? setProfile(id)
                      : selected !== null
                        ? apply(selected, id)
                        : setBenchPick(benchPick === id ? null : id)
                }
              >
                <span
                  className="drag-handle"
                  aria-label={`Перетащить ${p.name}`}
                  onPointerDown={(e) => drag.down(id, e)}
                  onPointerMove={drag.move}
                  onPointerUp={drag.up}
                  onPointerCancel={drag.cancel}
                  onClick={(e) => e.stopPropagation()}
                >
                  ⠿
                </span>
                <Photo src={p.photo} name={p.name} real={p.real} />
                <span>
                  <b>{p.name}</b>
                  <small>
                    {playerPositions(p).join(" / ")} · {p.fitness}%{" "}
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
              <PlayerDetails game={g} player={chosen} />
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
          : "Перетащите игрока из запаса на поле или между позициями. На сенсорном экране используйте ручку ⠿. Игра не по позиции снижает силу футболиста в матче."}
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
      {drag.ghost && (
        <div
          className="drag-ghost"
          style={{ left: drag.ghost.x + 12, top: drag.ghost.y - 20 }}
        >
          <Photo
            src={playerById(g, drag.ghost.id)?.photo}
            name={playerById(g, drag.ghost.id)?.name ?? ""}
          />
          <b>{playerById(g, drag.ghost.id)?.name}</b>
        </div>
      )}
    </section>
  );
}
