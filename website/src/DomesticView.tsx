import { useState } from "react";
import { leagues, type Game } from "./engine";
import { advanceDomestic, domesticDay } from "./domestic";
import { Bracket } from "./CupView";
import { beginLive } from "./live";
export function DomesticView({
  game: g,
  act,
}: {
  game: Game;
  act: (f: (g: Game) => void) => void;
}) {
  const [league, setLeague] = useState(g.clubs[g.club].league),
    [selected, setSelected] = useState("");
  const cups = Object.values(g.domestic ?? {}).filter(
    (c) => c.league === league,
  );
  const c = cups.find((c) => c.key === selected) ?? cups[0];
  return (
    <>
      <h1>Национальные кубки</h1>
      <div className="league-tabs">
        {leagues.map((name, i) => (
          <button
            key={name}
            className={league === i ? "active" : ""}
            onClick={() => {
              setLeague(i);
              setSelected("");
            }}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="league-tabs">
        {cups.map((c) => (
          <button
            key={c.key}
            className={selected === c.key ? "active" : ""}
            onClick={() => setSelected(c.key)}
          >
            {c.name}
          </button>
        ))}
      </div>
      {c && (
        <>
          <section className="hero">
            <div>
              <span className="eyebrow">ПУТЬ К НАЦИОНАЛЬНОМУ ТРОФЕЮ</span>
              <h1>{c.name}</h1>
              <p>
                {c.winner !== undefined
                  ? `🏆 ${g.clubs[c.winner].name}`
                  : `Стадия ${c.stage + 1}`}
              </p>
            </div>
          </section>
          {c.winner === undefined && (
            <div className="panel actions">
              <button
                className="primary"
                onClick={() => act((x) => advanceDomestic(x, c.key))}
              >
                Симулировать стадию
              </button>
              {domesticDay(c).some(
                (m) => !m.score && (m.home === g.club || m.away === g.club),
              ) && (
                <button onClick={() => act((x) => beginLive(x, "domestic"))}>
                  Смотреть ближайший кубковый матч клуба
                </button>
              )}
            </div>
          )}
          <p className="muted">
            Адаптированный розыгрыш среди клубов доступного высшего дивизиона:
            один матч, при ничьей — пенальти. Первые участники суперкубка заданы
            игровым посевом, затем — чемпионы и обладатели кубка. В MLS
            используется игровая конференционная сетка календаря, Open Cup и MLS
            Cup; мексиканские клубы и Leagues Cup не включены.
          </p>
          <Bracket game={g} matches={c.matches} />
          <section className="panel">
            <h3>История победителей</h3>
            {g.domesticHistory
              ?.filter((h) => h.key === c.key)
              .map((h) => (
                <p key={h.season}>
                  {h.season}/{h.season + 1} · 🏆 {g.clubs[h.winner].name}
                </p>
              ))}
          </section>
        </>
      )}
    </>
  );
}
