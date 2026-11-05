import type { Game } from "./engine";
import { coachStats } from "./career";
export function CoachView({ game: g }: { game: Game }) {
  const s = coachStats(g);
  const titles = (g.awards ?? []).flatMap((y) => [
    ...y.champions
      .filter((c) => c === g.club)
      .map(() => ({ year: y.season, title: "Чемпион национальной лиги" })),
    ...(y.europeWinner === g.club
      ? [{ year: y.season, title: "UEFA Champions League" }]
      : []),
  ]);
  for (const h of g.history) {
    if (
      !(g.awards ?? []).some((y) => y.season === h.season) &&
      h.champions.includes(g.clubs[g.club].name)
    )
      titles.push({ year: h.season, title: "Чемпион национальной лиги" });
  }
  const awards = (g.awards ?? []).flatMap((y) =>
    y.awards
      .filter((a) => a.category === "coach" && a.winner.id === g.club)
      .map((a) => ({ year: y.season, title: a.title })),
  );
  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">ТРЕНЕРСКОЕ ДОСЬЕ</span>
          <h1>{g.manager}</h1>
          <p>
            {g.nation} · {g.clubs[g.club].name}
          </p>
          <span className="tag">Сезонов завершено: {s.seasons}</span>
        </div>
        <span className="euro-stars">♜</span>
      </section>
      <div className="metrics">
        <div>
          <small>МАТЧЕЙ</small>
          <b>{s.played}</b>
          <span>Лига + ЛЧ</span>
        </div>
        <div>
          <small>ПОБЕД</small>
          <b>{s.won}</b>
          <span>
            {s.played ? ((s.won / s.played) * 100).toFixed(1) : 0}% побед
          </span>
        </div>
        <div>
          <small>ТРОФЕЕВ</small>
          <b>{titles.length}</b>
          <span>Лиги и ЛЧ</span>
        </div>
        <div>
          <small>ЛИЧНЫХ НАГРАД</small>
          <b>{awards.length}</b>
          <span>По итогам сезонов</span>
        </div>
      </div>
      <section className="panel">
        <h3>Результаты карьеры</h3>
        <div className="coach-record">
          <span>
            Победы <b>{s.won}</b>
          </span>
          <span>
            Ничьи <b>{s.drawn}</b>
          </span>
          <span>
            Поражения <b>{s.lost}</b>
          </span>
          <span>
            Забито <b>{s.gf}</b>
          </span>
          <span>
            Пропущено <b>{s.ga}</b>
          </span>
        </div>
        <p className="muted">
          Учитываются все завершённые матчи клуба в чемпионате и ЛЧ. В старых
          сохранениях матчи прошлых сезонов до обновления недоступны; новая
          статистика накапливается с текущего сезона.
        </p>
      </section>
      <div className="columns">
        <section className="panel">
          <h3>🏆 Трофейная полка</h3>
          {titles.length ? (
            titles.map((a, i) => (
              <p key={i}>
                {a.year} · {a.title}
              </p>
            ))
          ) : (
            <p className="muted">Главные победы впереди.</p>
          )}
        </section>
        <section className="panel">
          <h3>✨ Тренерские награды</h3>
          {awards.length ? (
            awards.map((a, i) => (
              <p key={i}>
                {a.year} · {a.title}
              </p>
            ))
          ) : (
            <p className="muted">
              Награды определяются результатами, а не случайным выбором.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
