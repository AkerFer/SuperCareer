import { useState } from "react";
import type { Game } from "./engine";
import { advance, nextSeason } from "./engine";
import {
  advanceCalendar,
  careerDate,
  roundDate,
  nextCareerMatch,
  finishOtherFixtures,
} from "./calendar";
import { seasonComplete, completeSeason } from "./career";
import { Photo } from "./Media";
export function CareerHub({
  game: g,
  act,
  onPlay,
  onAwards,
}: {
  game: Game;
  act: (fn: (g: Game) => void) => void;
  onPlay: () => void;
  onAwards: () => void;
}) {
  const today = careerDate(g);
  const [month, setMonth] = useState(today.slice(0, 7));
  const year = +month.slice(0, 4),
    m = +month.slice(5, 7) - 1;
  const count = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
  const offset = (new Date(Date.UTC(year, m, 1)).getUTCDay() + 6) % 7;
  const next = nextCareerMatch(g);
  function shift(n: number) {
    const d = new Date(Date.UTC(year, m + n, 1));
    setMonth(d.toISOString().slice(0, 7));
  }
  return (
    <>
      <section className="hero career-hero">
        <div>
          <span className="eyebrow">ТВОЙ КЛУБ · ТВОЙ КАЛЕНДАРЬ</span>
          <h1>
            Карьера
            <br />
            <em>{g.clubs[g.club].name}</em>
          </h1>
          <p>
            {g.manager} ·{" "}
            {g.careerMode === "match"
              ? "Каждый матч — под твоим контролем"
              : "Планируй сезон в своём темпе"}
          </p>
          <span className="tag">
            {new Date(today + "T12:00Z").toLocaleDateString("ru", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })}
          </span>
        </div>
        <Photo
          src={g.clubs[g.club].logo}
          name={g.clubs[g.club].name}
          className="hub-crest"
        />
      </section>
      <div className="career-columns">
        <section className="panel">
          <div className="section-head">
            <button aria-label="Предыдущий месяц" onClick={() => shift(-1)}>
              ‹
            </button>
            <h3>
              {new Date(Date.UTC(year, m)).toLocaleDateString("ru", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
            </h3>
            <button aria-label="Следующий месяц" onClick={() => shift(1)}>
              ›
            </button>
          </div>
          <div className="career-calendar">
            {["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"].map((d) => (
              <span className="weekday" key={d}>
                {d}
              </span>
            ))}
            {Array.from({ length: offset }, (_, i) => (
              <span key={"empty" + i} />
            ))}
            {Array.from({ length: count }, (_, i) => {
              const date = `${month}-${String(i + 1).padStart(2, "0")}`;
              const fixture = g.matches.find(
                (f) =>
                  roundDate(g.season, f.round) === date &&
                  (f.home === g.club || f.away === g.club),
              );
              return (
                <button
                  key={date}
                  className={
                    (date === today ? "today " : "") +
                    (fixture ? "matchday " : "")
                  }
                  onClick={() => {
                    if (g.careerMode === "calendar" && date >= today)
                      act((x) =>
                        advanceCalendar(
                          x,
                          Math.round(
                            (Date.parse(date) - Date.parse(today)) / 86400000,
                          ),
                        ),
                      );
                  }}
                  aria-label={`${date}${fixture ? " · Матч клуба" : ""}`}
                >
                  <b>{i + 1}</b>
                  {fixture && (
                    <>
                      <Photo
                        src={
                          g.clubs[
                            fixture.home === g.club
                              ? fixture.away
                              : fixture.home
                          ].logo
                        }
                        name={
                          g.clubs[
                            fixture.home === g.club
                              ? fixture.away
                              : fixture.home
                          ].name
                        }
                      />
                      <small>
                        {fixture.score ? fixture.score.join(":") : "Лига"}
                      </small>
                    </>
                  )}
                </button>
              );
            })}
          </div>
          <p className="muted">
            Игровое расписание: один тур в неделю. ЛЧ разыгрывается между
            турами. В календарном режиме выберите дату, чтобы промотать до неё.
          </p>
        </section>
        <section className="panel career-next">
          <span className="eyebrow">СЛЕДУЮЩИЙ ВЫЗОВ</span>
          {next ? (
            <>
              <h2>
                {next.competition === "ucl"
                  ? "UEFA Champions League"
                  : "Матч чемпионата"}
              </h2>
              <div className="versus">
                <div>
                  <Photo
                    src={g.clubs[next.match.home].logo}
                    name={g.clubs[next.match.home].name}
                    className="club-photo"
                  />
                  <b>{g.clubs[next.match.home].name}</b>
                </div>
                <strong>VS</strong>
                <div>
                  <Photo
                    src={g.clubs[next.match.away].logo}
                    name={g.clubs[next.match.away].name}
                    className="club-photo"
                  />
                  <b>{g.clubs[next.match.away].name}</b>
                </div>
              </div>
              <button className="primary wide" onClick={onPlay}>
                В центр матча →
              </button>
            </>
          ) : (
            <h2>Матчи клуба завершены</h2>
          )}
          <div className="career-controls">
            {g.careerMode !== "match" ? (
              <>
                <button onClick={() => act((x) => advanceCalendar(x, 1))}>
                  Промотать день
                </button>
                <button
                  onClick={() => {
                    act((x) => advanceCalendar(x, 7));
                    const d = new Date(today + "T12:00Z");
                    d.setUTCDate(d.getUTCDate() + 7);
                    setMonth(d.toISOString().slice(0, 7));
                  }}
                >
                  Промотать неделю
                </button>
                <button onClick={() => act((x) => advance(x, 38))}>
                  До конца сезона
                </button>
              </>
            ) : (
              <button onClick={() => act(finishOtherFixtures)}>
                Завершить остальные матчи тура
              </button>
            )}
          </div>
          {g.careerMode !== "match" &&
            g.matches.every((m) => m.score) &&
            !seasonComplete(g) && (
              <button
                className="primary wide"
                onClick={() => act(completeSeason)}
              >
                Завершить еврокубковый сезон
              </button>
            )}
          {seasonComplete(g) && (
            <>
              <button className="gold-button wide" onClick={onAwards}>
                Церемония сезона
              </button>
              <button className="primary wide" onClick={() => act(nextSeason)}>
                Начать сезон {g.season + 1}
              </button>
            </>
          )}
          <p className="muted">
            {g.careerMode === "match"
              ? "Промотка матчей вашего клуба отключена. Играть можно текстовой симуляцией с паузой и заменами."
              : "Можно проматывать календарь или открыть любой ближайший матч в интерактивном режиме."}
          </p>
        </section>
      </div>
    </>
  );
}
