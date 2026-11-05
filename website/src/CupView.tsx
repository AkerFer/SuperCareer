import { useState, type ReactNode } from "react";
import type { Game, Match } from "./engine";
import {
  competitionNames,
  advanceCup,
  cupDay,
  groupTable,
} from "./continental";
import { EuropeView } from "./EuropeView";
import { beginLive } from "./live";
import { DomesticView } from "./DomesticView";
import { NationalView } from "./NationalView";
export function Bracket({
  game: g,
  matches,
}: {
  game: Game;
  matches: Match[];
}) {
  const stages = ["r32", "playoff", "r16", "qf", "sf", "final"] as const;
  const labels = {
    r32: "1/16 финала",
    playoff: "Стыки",
    r16: "1/8 финала",
    qf: "Четвертьфинал",
    sf: "Полуфинал",
    final: "Финал",
  };
  const available = stages.filter((stage) =>
    matches.some((m) => m.stage === stage),
  );
  const [chosen, setChosen] = useState<string>("");
  const current = available.includes(chosen as (typeof available)[number])
    ? chosen
    : available.at(-1);
  if (!available.length)
    return (
      <section className="panel muted">
        Сетка появится после жеребьёвки плей-офф.
      </section>
    );
  return (
    <section className="knockout-board">
      <div className="bracket-heading">
        <h3>Дорога к трофею</h3>
        <small>Два счёта — первый и ответный матчи</small>
      </div>
      <div className="bracket-stage-tabs">
        {available.map((stage) => (
          <button
            key={stage}
            aria-pressed={current === stage}
            className={current === stage ? "active" : ""}
            onClick={() => setChosen(stage)}
          >
            {labels[stage]}
          </button>
        ))}
      </div>
      <div className="bracket" aria-label="Турнирная сетка">
        {available.map((stage) => (
          <section
            key={stage}
            className={current === stage ? "current-stage" : ""}
          >
            <h3>{labels[stage]}</h3>
            {matches
              .filter(
                (m) =>
                  m.stage === stage &&
                  (m.competition === "domestic" || m.round === 0),
              )
              .map((m) => {
                const second =
                  m.competition === "domestic"
                    ? undefined
                    : matches.find(
                        (n) =>
                          n.stage === stage && n.tie === m.tie && n.round === 1,
                      );
                const winner = second?.winner ?? m.winner;
                return (
                  <div className="bracket-tie" key={m.id}>
                    <small>{m.date ?? ""}</small>
                    {[m.home, m.away].map((id, i) => (
                      <p className={winner === id ? "tie-winner" : ""} key={id}>
                        <span>{g.clubs[id].name}</span>
                        <b>
                          {m.score?.[i] ?? "—"}
                          {second && <em> / {second.score?.[1 - i] ?? "—"}</em>}
                        </b>
                      </p>
                    ))}
                    {(second?.penalties ?? m.penalties) && (
                      <small>
                        Пенальти {(second?.penalties ?? m.penalties)!.join(":")}
                      </small>
                    )}
                  </div>
                );
              })}
          </section>
        ))}
      </div>
    </section>
  );
}

export function CupHub({
  game: g,
  act,
  children,
}: {
  game: Game;
  children?: ReactNode;
  act: (f: (g: Game) => void) => void;
}) {
  const [selected, setSelected] = useState<
    "ucl" | "uel" | "uecl" | "supercup" | "national" | "leagues" | "domestic"
  >("ucl");
  const c =
    selected === "ucl" ||
    selected === "national" ||
    selected === "leagues" ||
    selected === "domestic"
      ? undefined
      : g.continental?.[selected];
  return (
    <>
      <div className="league-tabs">
        {(
          [
            "ucl",
            "uel",
            "uecl",
            "supercup",
            "national",
            "leagues",
            "domestic",
          ] as const
        ).map((id) => (
          <button
            key={id}
            className={selected === id ? "active" : ""}
            onClick={() => setSelected(id)}
          >
            {id === "domestic"
              ? "Кубки стран"
              : id === "leagues"
                ? "Лиги"
                : id === "national"
                  ? "Сборные"
                  : competitionNames[id]}
          </button>
        ))}
      </div>
      {selected === "domestic" ? (
        <DomesticView game={g} act={act} />
      ) : selected === "leagues" ? (
        children
      ) : selected === "national" ? (
        <NationalView game={g} act={act} />
      ) : selected === "ucl" ? (
        <EuropeView game={g} act={act} />
      ) : (
        c && (
          <>
            <section className="hero">
              <div>
                <span className="eyebrow">ЕВРОПЕЙСКИЙ СЕЗОН</span>
                <h1>{competitionNames[c.id]}</h1>
                <p>
                  {c.winner !== undefined
                    ? `🏆 ${g.clubs[c.winner].name}`
                    : c.stage === "complete"
                      ? "Первый розыгрыш — после определения победителей ЛЧ и ЛЕ"
                      : `Стадия: ${c.stage} · игровой день ${c.day + 1}`}
                </p>
              </div>
            </section>
            {c.stage !== "complete" && (
              <section className="panel actions">
                <button
                  className="primary"
                  onClick={() => act((x) => advanceCup(x, c.id))}
                >
                  Симулировать игровой день
                </button>
                {cupDay(c).some(
                  (m) => !m.score && (m.home === g.club || m.away === g.club),
                ) && (
                  <button onClick={() => act((x) => beginLive(x, c.id))}>
                    Смотреть матч клуба
                  </button>
                )}
              </section>
            )}
            <p className="muted">
              Игровой формат с группами и двухматчевым плей-офф. Отбор из пяти
              доступных лиг; формат упрощён относительно UEFA.
            </p>
            <Bracket game={g} matches={c.matches} />
            <div className="award-grid">
              {c.groups.map((ids, i) => (
                <section className="panel" key={i}>
                  <h3>Группа {String.fromCharCode(65 + i)}</h3>
                  {groupTable(
                    c.matches.filter((m) => m.stage === "groups"),
                    ids,
                  ).map((r) => (
                    <p key={r.id}>
                      {g.clubs[r.id].name} <b>{r.pts} очк.</b>
                    </p>
                  ))}
                </section>
              ))}
            </div>
            <section className="panel">
              <h3>История победителей</h3>
              {(g.cupHistory ?? [])
                .filter((t) => t.competition === c.id)
                .map((t) => (
                  <p key={t.season}>
                    🏆 {t.season}/{t.season + 1} · {g.clubs[t.winner].name}
                  </p>
                ))}
            </section>
            <details className="panel">
              <summary>Все матчи турнира ({c.matches.length})</summary>
              {c.matches.map((m) => (
                <div className="europe-fixture" key={m.id}>
                  <small>{m.date}</small>
                  <span>{g.clubs[m.home].name}</span>
                  <b>{m.score?.join(":") ?? "—"}</b>
                  <span>{g.clubs[m.away].name}</span>
                </div>
              ))}
            </details>
          </>
        )
      )}
    </>
  );
}
