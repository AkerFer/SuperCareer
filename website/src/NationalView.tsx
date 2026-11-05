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
          <div className="bracket">
            {(["r32", "r16", "qf", "sf", "final"] as const).map((stage) => (
              <section
                key={stage}
                hidden={!c.matches.some((m) => m.stage === stage)}
              >
                <h3>{stage}</h3>
                {c.matches
                  .filter((m) => m.stage === stage)
                  .map((m) => (
                    <div className="bracket-tie" key={m.id}>
                      <p>
                        {c.teams[m.home].name}
                        <b>{m.score?.[0] ?? "—"}</b>
                      </p>
                      <p>
                        {c.teams[m.away].name}
                        <b>{m.score?.[1] ?? "—"}</b>
                      </p>
                      {m.penalties && (
                        <small>Пенальти {m.penalties.join(":")}</small>
                      )}
                    </div>
                  ))}
              </section>
            ))}
          </div>
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
