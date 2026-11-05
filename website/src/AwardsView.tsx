import { useEffect, useState } from "react";
import { Trophy } from "./Trophy";
import { leagues } from "./engine";
import type { Game } from "./engine";
import type { Award, SeasonAwards } from "./career-types";
import { Photo } from "./Media";
export function AwardsView({ game: g }: { game: Game }) {
  const [year, setYear] = useState<number | undefined>(g.awards?.[0]?.season);
  const [ceremony, setCeremony] = useState<{
    season: SeasonAwards;
    index: number;
    sequence: Award[];
  } | null>(null);
  const [count, setCount] = useState(3);
  const [league, setLeague] = useState(0);
  const [selected, setSelected] = useState<string>("world");
  useEffect(() => {
    if (!ceremony || count === 0) return;
    const timer = setTimeout(() => setCount((n) => n - 1), 650);
    return () => clearTimeout(timer);
  }, [ceremony, count]);
  const current = g.awards?.find((a) => a.season === year) ?? g.awards?.[0];
  const awarded =
    current?.awards.filter(
      (a) =>
        selected === "all" ||
        (selected === "league"
          ? a.id.startsWith(`league-${league}-`)
          : a.category === selected),
    ) ?? [];
  function open(season: SeasonAwards, index: number) {
    setCount(3);
    const sequence = awarded.length ? awarded : season.awards;
    setCeremony({
      season,
      index: Math.max(
        0,
        sequence.findIndex((a) => a.id === season.awards[index]?.id),
      ),
      sequence,
    });
  }
  const award: Award | undefined = ceremony?.sequence[ceremony.index];
  return (
    <>
      <section className="hero awards-hero">
        <div>
          <span className="eyebrow">THE LEGACY AWARDS</span>
          <h1>
            Величие заслуживают.
            <br />
            <em>Легенд награждают.</em>
          </h1>
          <p>Каждая награда — результат матчей, голов и выигранных трофеев.</p>
        </div>
        <span className="award-symbol">♛</span>
      </section>
      {current ? (
        <>
          <section className="panel">
            <div className="section-head">
              <h3>Церемония сезона {current.season}</h3>
              <select
                aria-label="Сезон наград"
                value={current.season}
                onChange={(e) => setYear(+e.target.value)}
              >
                {g.awards!.map((y) => (
                  <option value={y.season} key={y.season}>
                    {y.season}/{String(y.season + 1).slice(-2)}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="gold-button"
              onClick={() => open(current, current.awards.indexOf(awarded[0]))}
            >
              ✨ Начать вручение выбранных наград
            </button>
            <div className="league-tabs">
              {[
                ["all", "Все награды"],
                ["world", "Мировые"],
                ["uefa", "UEFA"],
                ["league", "Лиги"],
                ["coach", "Тренеры"],
              ].map(([v, t]) => (
                <button
                  className={selected === v ? "active" : ""}
                  onClick={() => setSelected(v)}
                  key={v}
                >
                  {t}
                </button>
              ))}
            </div>
          </section>
          {selected === "league" && (
            <div className="league-tabs">
              {leagues.map((name, i) => (
                <button
                  key={name}
                  className={league === i ? "active" : ""}
                  onClick={() => setLeague(i)}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
          <div className="award-grid">
            {awarded.map((a, index) => (
              <div key={a.id}>
                {a.id.startsWith("league-") &&
                  (index === 0 ||
                    !awarded[index - 1].id.startsWith(
                      a.id.split("-").slice(0, 2).join("-") + "-",
                    )) && <h2>{leagues[+a.id.split("-")[1]]}</h2>}
                <button
                  className="award-card panel"
                  key={a.id}
                  onClick={() => open(current, current.awards.indexOf(a))}
                >
                  <span className="award-medal">
                    {a.category === "coach"
                      ? "♜"
                      : a.id.includes("gk")
                        ? "✋"
                        : "♛"}
                  </span>
                  <h3>{a.title}</h3>
                  <Photo src={a.winner.photo} name={a.winner.name} />
                  <strong>{a.winner.name}</strong>
                  <small>{a.winner.club}</small>
                  <p>{a.winner.detail}</p>
                  <span className="gold-text">Смотреть вручение →</span>
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        <section className="panel">
          <h3>Номинации ещё открыты</h3>
          <p>
            Завершите чемпионаты и ЛЧ. Награды будут рассчитаны автоматически, а
            церемония сохранится в истории.
          </p>
          <h3>Текущая гонка за Золотой мяч</h3>
          {[...g.players]
            .filter((p) => p.stats.apps > 0)
            .sort(
              (a, b) =>
                b.stats.goals * 4 +
                b.stats.assists * 3 +
                ((b.ratingSum ?? 0) / (b.ratedApps || 1)) * 10 -
                (a.stats.goals * 4 +
                  a.stats.assists * 3 +
                  ((a.ratingSum ?? 0) / (a.ratedApps || 1)) * 10),
            )
            .slice(0, 30)
            .map((p, i) => (
              <div className="leader" key={p.id}>
                <span>{i + 1}</span>
                <Photo src={p.photo} name={p.name} />
                <span>
                  {p.name}
                  <small>
                    {p.stats.goals} голов · {p.stats.assists} передач
                  </small>
                </span>
              </div>
            ))}
          <p className="muted">
            Предварительный рейтинг без сезонных трофеев. Итоговый топ-30
            появится на церемонии.
          </p>
        </section>
      )}
      {award && ceremony && (
        <div className="modal-backdrop ceremony-backdrop">
          <section className="ceremony">
            <button
              className="close"
              aria-label="Закрыть церемонию"
              onClick={() => setCeremony(null)}
            >
              ×
            </button>
            <span className="eyebrow">
              FOOTBALL LEGACY · {ceremony.season.season}
            </span>
            <h2>{award.title}</h2>
            {count > 0 ? (
              <div className="award-count" key={count}>
                {count}
              </div>
            ) : (
              <div className="winner-reveal" key={award.id}>
                <div className="confetti">✦ ✧ ✦ ✨ ✦ ✧ ✦</div>
                <Trophy name={award.title} />
                <Photo src={award.winner.photo} name={award.winner.name} />
                <h1>{award.winner.name}</h1>
                <p>{award.winner.club}</p>
                <strong>{award.winner.detail}</strong>
                {award.team && (
                  <div className="xi-team">
                    {award.team.map((p) => (
                      <span key={p.id}>{p.name}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
            <p className="award-formula">{award.formula}</p>
            {count === 0 && (
              <details>
                <summary>Номинанты ({award.nominees.length})</summary>
                <div className="nominees">
                  {award.nominees.map((p, i) => (
                    <p key={p.id}>
                      {i + 1}. {p.name}
                      <b>{p.score}</b>
                    </p>
                  ))}
                </div>
              </details>
            )}
            <div className="actions">
              {count > 0 ? (
                <button className="gold-button" onClick={() => setCount(0)}>
                  Открыть победителя
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setCount(3);
                    }}
                  >
                    Повторить анимацию
                  </button>
                  <button
                    className="gold-button"
                    onClick={() => {
                      if (ceremony.index + 1 < ceremony.sequence.length) {
                        setCount(3);
                        setCeremony({ ...ceremony, index: ceremony.index + 1 });
                      } else setCeremony(null);
                    }}
                  >
                    {ceremony.index + 1 < ceremony.sequence.length
                      ? "Следующая награда →"
                      : "Завершить церемонию"}
                  </button>
                </>
              )}
            </div>
            <small>
              {ceremony.index + 1} / {ceremony.sequence.length} наград
            </small>
          </section>
        </div>
      )}
    </>
  );
}
