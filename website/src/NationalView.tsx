import { useState } from "react";
import type { NationalCup } from "./world-types";
import type { Game } from "./engine";
import { advanceNational, nationalNames } from "./international";
import { groupTable } from "./continental";
export function NationalView({
  game: g,
  act,
}: {
  game: Game;
  act: (f: (g: Game) => void) => void;
}) {
  return (
    <>
      <p className="muted">
        Турниры сборных: ЧМ — каждые 4 года с 2026, EURO и Copa — с 2028.
        Упрощённая игровая квалификация и модель силы сборных; клубные
        показатели футболистов не изменяются.
      </p>
      {!g.international?.length && (
        <section className="panel">
          <h3>В этом сезоне летнего турнира сборных нет</h3>
        </section>
      )}
      {g.international?.map((c) => (
        <section className="panel" key={c.id}>
          <h2>
            {nationalNames[c.id]} · {c.year}
          </h2>
          {c.winner !== undefined ? (
            <h2 className="winner-reveal">🏆 {c.teams[c.winner].name}</h2>
          ) : (
            <button
              className="primary"
              onClick={() =>
                act((x) =>
                  advanceNational(
                    x,
                    x.international!.find((n) => n.id === c.id)!,
                  ),
                )
              }
            >
              Симулировать игровой день
            </button>
          )}
          <NationalBracket cup={c} />
          <div className="award-grid">
            {c.groups.map((ids, i) => (
              <div key={i}>
                <h3>Группа {i + 1}</h3>
                {groupTable(
                  c.matches.filter((m) => m.stage === "groups"),
                  ids,
                ).map((r) => (
                  <p key={r.id}>
                    {c.teams[r.id].name} · {r.pts}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </section>
      ))}
      <section className="panel">
        <h3>История сборных</h3>
        {g.internationalHistory?.map((h) => (
          <p key={h.year + h.competition}>
            🏆 {h.year} · {nationalNames[h.competition]} · {h.winner}
          </p>
        ))}
      </section>
    </>
  );
}

function NationalBracket({ cup: c }: { cup: NationalCup }) {
  const names = {
    r32: "1/16 финала",
    r16: "1/8 финала",
    qf: "Четвертьфинал",
    sf: "Полуфинал",
    final: "Финал",
  };
  const available = (["r32", "r16", "qf", "sf", "final"] as const).filter(
    (stage) => c.matches.some((m) => m.stage === stage),
  );
  const [selected, setSelected] = useState<string>("");
  const current = available.includes(selected as (typeof available)[number])
    ? selected
    : available.at(-1);
  return (
    <div className="knockout-board">
      <div className="bracket-stage-tabs">
        {available.map((stage) => (
          <button
            key={stage}
            className={current === stage ? "active" : ""}
            onClick={() => setSelected(stage)}
          >
            {names[stage]}
          </button>
        ))}
      </div>
      <div className="bracket">
        {available.map((stage) => (
          <section
            key={stage}
            className={current === stage ? "current-stage" : ""}
          >
            <h3>{names[stage]}</h3>
            {c.matches
              .filter((m) => m.stage === stage)
              .map((m) => (
                <div className="bracket-tie" key={m.id}>
                  {[m.home, m.away].map((id, i) => (
                    <p key={id} className={m.winner === id ? "tie-winner" : ""}>
                      {c.teams[id].name}
                      <b>{m.score?.[i] ?? "—"}</b>
                    </p>
                  ))}
                  {m.penalties && (
                    <small>Пенальти {m.penalties.join(":")}</small>
                  )}
                </div>
              ))}
          </section>
        ))}
      </div>
    </div>
  );
}
