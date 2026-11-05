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
import { NationalView } from "./NationalView";
export function Bracket({
  game: g,
  matches,
}: {
  game: Game;
  matches: Match[];
}) {
  return (
    <div className="bracket" aria-label="Турнирная сетка">
      {(["playoff", "r16", "qf", "sf", "final"] as const).map((stage, i) => (
        <section key={stage} hidden={!matches.some((m) => m.stage === stage)}>
          <h3>{["Стыки", "1/8", "1/4", "1/2", "Финал"][i]}</h3>
          {matches
            .filter((m) => m.stage === stage && m.round === 0)
            .map((m) => {
              const second = matches.find(
                (n) => n.stage === stage && n.tie === m.tie && n.round === 1,
              );
              return (
                <div className="bracket-tie" key={m.id}>
                  <p>
                    {g.clubs[m.home].name}
                    <b>
                      {m.score?.[0] ?? "—"}{" "}
                      {second && ` / ${second.score?.[1] ?? "—"}`}
                    </b>
                  </p>
                  <p>
                    {g.clubs[m.away].name}
                    <b>
                      {m.score?.[1] ?? "—"}{" "}
                      {second && ` / ${second.score?.[0] ?? "—"}`}
                    </b>
                  </p>
                  {(second?.winner ?? m.winner) !== undefined && (
                    <small>
                      → {g.clubs[(second?.winner ?? m.winner)!].name}
                    </small>
                  )}
                </div>
              );
            })}
        </section>
      ))}
    </div>
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
    "ucl" | "uel" | "uecl" | "supercup" | "national" | "leagues"
  >("ucl");
  const c =
    selected === "ucl" || selected === "national" || selected === "leagues"
      ? undefined
      : g.continental?.[selected];
  return (
    <>
      <div className="league-tabs">
        {(
          ["ucl", "uel", "uecl", "supercup", "national", "leagues"] as const
        ).map((id) => (
          <button
            key={id}
            className={selected === id ? "active" : ""}
            onClick={() => setSelected(id)}
          >
            {id === "leagues"
              ? "Лиги"
              : id === "national"
                ? "Сборные"
                : competitionNames[id]}
          </button>
        ))}
      </div>
      {selected === "leagues" ? (
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
