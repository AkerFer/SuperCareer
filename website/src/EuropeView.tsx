import type { Game } from "./engine";
import {
  advanceEurope,
  europeanTable,
  europeanDayFixtures,
  stageNames,
} from "./career";
import { beginLive } from "./live";
import { Photo } from "./Media";
import { Bracket } from "./CupView";
export function EuropeView({
  game: g,
  act,
}: {
  game: Game;
  act: (fn: (x: Game) => void) => void;
}) {
  const e = g.europe!;
  const own = europeanDayFixtures(g).find(
    (m) => !m.score && (m.home === g.club || m.away === g.club),
  );
  return (
    <>
      <section className="hero europe-hero">
        <div>
          <span className="eyebrow">ВЕЧЕРА, КОТОРЫЕ СТАНОВЯТСЯ ЛЕГЕНДОЙ</span>
          <h1>
            UEFA
            <br />
            <em>Champions League</em>
          </h1>
          <p>
            {stageNames[e.stage]} · {e.season}/{String(e.season + 1).slice(-2)}
          </p>
          {e.winner !== undefined && <h2>🏆 {g.clubs[e.winner].name}</h2>}
        </div>
        <span className="euro-stars">✧</span>
      </section>
      <section className="panel">
        <div className="actions">
          {e.stage !== "complete" && (
            <button className="primary" onClick={() => act(advanceEurope)}>
              Симулировать игровой день ЛЧ
            </button>
          )}
          {own && (
            <button onClick={() => act((x) => beginLive(x, "ucl"))}>
              Смотреть матч клуба · 10 сек.
            </button>
          )}
        </div>
        <p className="muted">
          Игровой формат: 36 команд, 8 матчей общего этапа; 1–8 — в 1/8, 9–24 —
          стыки, 25–36 — выбывают. Плей-офф в два матча, финал — один.
          Упрощённые посев и жеребьёвка; только клубы семи европейских лиг. На
          следующий сезон выходят клубы семи европейских лиг по игровым квотам.
        </p>
        <p className="muted">
          {e.teams.includes(g.club)
            ? "Ваш клуб участвует в этом сезоне."
            : "Ваш клуб не прошёл отбор в этом сезоне. Боритесь за место в лиге!"}
        </p>
      </section>
      <Bracket game={g} matches={e.matches} />
      <div className="columns">
        <section className="panel">
          <h3>Общий этап · таблица</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Клуб</th>
                  <th>И</th>
                  <th>РМ</th>
                  <th>О</th>
                </tr>
              </thead>
              <tbody>
                {europeanTable(g).map((r, i) => (
                  <tr key={r.id} className={r.id === g.club ? "highlight" : ""}>
                    <td
                      className={i < 8 ? "qualified" : i < 24 ? "playoff" : ""}
                    >
                      {i + 1}
                    </td>
                    <td>
                      <span className="table-club">
                        <Photo
                          src={g.clubs[r.id].logo}
                          name={g.clubs[r.id].name}
                        />
                        {g.clubs[r.id].name}
                      </span>
                    </td>
                    <td>{r.played}</td>
                    <td>{r.gf - r.ga}</td>
                    <td>
                      <b>{r.pts}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <details className="panel">
          <summary>Все матчи и результаты турнира</summary>
          {(["final", "sf", "qf", "r16", "playoff", "league"] as const).map(
            (stage) => {
              const ms = e.matches.filter((m) => m.stage === stage);
              return ms.length ? (
                <div key={stage}>
                  <h3 className="stage-heading">{stageNames[stage]}</h3>
                  {ms.map((m) => (
                    <div
                      className={
                        "europe-fixture " +
                        (m.home === g.club || m.away === g.club
                          ? "highlight"
                          : "")
                      }
                      key={m.id}
                    >
                      <span>{g.clubs[m.home].name}</span>
                      <b>{m.score ? m.score.join(" : ") : "—"}</b>
                      <span>{g.clubs[m.away].name}</span>
                      {m.penalties && (
                        <small>пен. {m.penalties.join(":")}</small>
                      )}
                    </div>
                  ))}
                </div>
              ) : null;
            },
          )}
        </details>
      </div>
    </>
  );
}
