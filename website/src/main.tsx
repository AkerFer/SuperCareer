import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createGame,
  leagues,
  positions,
  squad,
  table,
  advance,
  nextSeason,
  autoLineup,
  transfer,
  validateSave,
  type Game,
  type Player,
  emptyStats,
} from "./engine";
import "./style.css";
import { exportCareer } from "./export";
import { migrateGame, seasonComplete, completeSeason } from "./career";
import { beginLive, tickLive } from "./live";
import { LineupView } from "./LineupView";
import { LiveView } from "./LiveView";
import { EuropeView } from "./EuropeView";
import { AwardsView } from "./AwardsView";
import { CoachView } from "./CoachView";
import { Photo } from "./Media";
import { databaseLabel } from "./database";
import { readSlot, saveSlot } from "./storage";
const money = (n: number) =>
  new Intl.NumberFormat("ru", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(n);
const initialDatabase = createGame("", "", 0, "", 2025, 1);
const tabs = [
  "Главная",
  "Клуб",
  "Матчи",
  "Трансферы",
  "Турниры",
  "Статистика",
  "Награды",
  "Тренер",
  "Зал славы",
  "Настройки",
];
const read = readSlot;
function App() {
  const [slot, setSlot] = useState(1);
  const [g, setG] = useState<Game | null>(() => read(1));
  const [tab, setTab] = useState("Главная");
  const [league, setLeague] = useState(0);
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("Alex Morgan");
  const [nation, setNation] = useState("Узбекистан");
  const [club, setClub] = useState(0);
  const [difficulty, setDifficulty] = useState("Обычно");
  const [season, setSeason] = useState(2025);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState("");
  const [maxAge, setMaxAge] = useState(40);
  const [minRating, setMinRating] = useState(1);
  const [maxPrice, setMaxPrice] = useState(200);
  const [marketLeague, setMarketLeague] = useState(-1);
  const [selected, setSelected] = useState<Player | null>(null);
  const [fee, setFee] = useState(0);
  const [wage, setWage] = useState(0);
  const [detail, setDetail] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  function persist(next: Game, replace = false) {
    try {
      saveSlot(slot, next, replace);
      setMsg("Карьера сохранена");
    } catch {
      setMsg("Не удалось сохранить: хранилище заполнено. Экспортируйте JSON.");
    }
  }
  function act(fn: (x: Game) => void) {
    if (!g) return;
    const next = structuredClone(g);
    try {
      fn(next);
      setG(next);
      persist(next);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  const matchClock = useRef<{ key: string; at: number; minute: number } | null>(
    null,
  );
  useEffect(() => {
    const live = g?.live;
    if (!live || live.status !== "playing") {
      matchClock.current = null;
      return;
    }
    const key = `${slot}:${g.season}:${live.competition}:${live.matchId}`;
    if (matchClock.current?.key !== key)
      matchClock.current = { key, at: performance.now(), minute: live.minute };
    const clock = matchClock.current;
    const delay = Math.max(
      0,
      clock.at +
        (live.minute - clock.minute + 1) * (10000 / 90) -
        performance.now(),
    );
    const timer = setTimeout(
      () =>
        act((x) => {
          const target = Math.min(
            90,
            Math.max(
              x.live!.minute + 1,
              clock.minute +
                Math.floor((performance.now() - clock.at) / (10000 / 90)),
            ),
          );
          while (x.live!.minute < target && x.live!.status === "playing")
            tickLive(x);
        }),
      delay,
    );
    return () => clearTimeout(timer);
  }, [g, slot]);
  function simulate(n: number, own = false) {
    if (own) {
      act((x) => beginLive(x));
      return;
    }
    setBusy(true);
    setTimeout(() => {
      act((x) => advance(x, n, own));
      setBusy(false);
    }, 30);
  }
  const preview = g ?? initialDatabase;
  const c = g?.clubs[g.club];
  const own = g && c ? squad(g, c.id) : [];
  const next = g?.matches.find(
    (m) => !m.score && (m.home === g.club || m.away === g.club),
  );
  const last = g?.matches
    .filter((m) => m.score && (m.home === g.club || m.away === g.club))
    .at(-1);
  const currentPlayer =
    selected && g?.players.find((p) => p.id === selected.id);
  const score = (m: NonNullable<typeof next>) =>
    `${g!.clubs[m.home].name} ${m.score ? m.score.join(" : ") : "—"} ${g!.clubs[m.away].name}`;
  const leaderboardStats = (p: Player) =>
    league === -2
      ? (p.europeanStats ?? emptyStats())
      : league === -1
        ? p.stats
        : (p.leagueById?.[league] ?? emptyStats());
  function playerRows(ps: Player[], market = false) {
    return (
      <div className="players">
        {ps.map((p) => (
          <button
            className="player"
            key={p.id}
            onClick={() => {
              setSelected(p);
              setFee(p.club === null ? 0 : p.value);
              setWage(p.salary);
            }}
          >
            <Photo src={p.photo} name={p.name} />
            <span className={"ovr o" + (p.rating >= 80 ? "high" : "")}>
              {p.rating}
            </span>
            <span>
              <strong>{p.name}</strong>
              <small>
                {p.pos} · {p.age} лет · {p.real ? "Реальный игрок" : "Академия"}{" "}
                ·{" "}
                {market
                  ? p.club === null
                    ? "Свободный агент"
                    : g!.clubs[p.club].name
                  : p.nation}
              </small>
            </span>
            <span className="right">
              <b>
                {market
                  ? money(p.value)
                  : `${p.stats.goals} Г · ${p.stats.assists} П`}
              </b>
              <small>
                {market ? `${money(p.salary)}/нед.` : `Форма ${p.fitness}%`}
              </small>
            </span>
          </button>
        ))}
      </div>
    );
  }
  return (
    <>
      <div className="app">
        <aside>
          <a className="brand" onClick={() => setTab("Главная")}>
            <span className="crest">FL</span>
            <span>
              FOOTBALL
              <br />
              <b>LEGACY</b>
            </span>
          </a>
          <span className="eyebrow">CAREER SIMULATOR · БЕТА 0.2</span>
          <nav>
            {tabs.map((t, i) => (
              <button
                key={t}
                className={tab === t ? "active" : ""}
                onClick={() => setTab(t)}
              >
                <span>
                  {["◈", "♜", "⚽", "⇄", "▤", "▥", "♛", "♟", "★", "⚙"][i]}
                </span>
                {t}
              </button>
            ))}
          </nav>
          <div className="aside-foot">
            Твоя карьера.
            <br />
            Твоя футбольная история.
            <small>Локальная игра · без регистрации</small>
          </div>
        </aside>
        <main>
          <div key={tab} className="page-transition">
            <header>
              <div>
                <span className="eyebrow">FOOTBALL LEGACY</span>
                <h2>{g ? tab : "Новая карьера"}</h2>
              </div>
              <div className="season">
                <span className="dot" />{" "}
                {g
                  ? `${g.season}/${String(g.season + 1).slice(-2)}`
                  : "НАЧНИ СВОЮ ИСТОРИЮ"}
                <small>
                  {g
                    ? `Тур ${Math.min(g.round + 1, 38)} · ${g.manager}`
                    : "Браузерная бета"}
                </small>
              </div>
            </header>
            {msg && (
              <div className="toast" onClick={() => setMsg("")}>
                {msg} <span>×</span>
              </div>
            )}
            {!g ? (
              <>
                <section className="hero welcome">
                  <span className="eyebrow">
                    ВЕЛИКИЕ ИСТОРИИ НАЧИНАЮТСЯ С ТЕБЯ
                  </span>
                  <h1>
                    Построй свою
                    <br />
                    <em>футбольную империю.</em>
                  </h1>
                  <p>
                    Пять лиг. Тысячи игроков. Десятки сезонов.
                    <br />
                    Один тренер, который изменит всё.
                  </p>
                  <span className="ball">⚽</span>
                </section>
                <section className="panel setup">
                  <h3>Твой первый контракт</h3>
                  <div className="form-grid">
                    <label>
                      Имя тренера
                      <input
                        value={name}
                        maxLength={40}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </label>
                    <label>
                      Национальность
                      <input
                        value={nation}
                        maxLength={40}
                        onChange={(e) => setNation(e.target.value)}
                      />
                    </label>
                    <label>
                      Клуб
                      <select
                        value={club}
                        onChange={(e) => setClub(+e.target.value)}
                      >
                        {preview.clubs.map((c) => (
                          <option value={c.id} key={c.id}>
                            {c.name} · {leagues[c.league]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Сложность
                      <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                      >
                        {["Легко", "Обычно", "Сложно"].map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Начальный сезон
                      <input
                        type="number"
                        min="2024"
                        max="2100"
                        value={season}
                        onChange={(e) => setSeason(+e.target.value)}
                      />
                    </label>
                    <label>
                      Слот сохранения
                      <select
                        value={slot}
                        onChange={(e) => {
                          setSlot(+e.target.value);
                          setG(read(+e.target.value));
                        }}
                      >
                        {[1, 2, 3].map((x) => (
                          <option key={x} value={x}>
                            Карьера {x}
                            {read(x) ? " · сохранена" : " · пусто"}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <button
                    className="primary"
                    onClick={() => {
                      if (
                        !name.trim() ||
                        !nation.trim() ||
                        season < 2024 ||
                        season > 2100
                      )
                        return setMsg(
                          "Укажите имя, национальность и сезон 2024–2100",
                        );
                      const x = createGame(
                        name,
                        nation,
                        club,
                        difficulty,
                        season,
                      );
                      setG(migrateGame(x));
                      persist(x, true);
                    }}
                  >
                    Подписать контракт →
                  </button>
                  <p className="muted">
                    {databaseLabel} Молодёжь генерируется и отмечена отдельно.
                  </p>
                  <label className="file">
                    Импортировать карьеру
                    <input
                      type="file"
                      accept="application/json"
                      onChange={async (e) => {
                        try {
                          const x = JSON.parse(await e.target.files![0].text());
                          if (!validateSave(x)) throw Error();
                          setG(migrateGame(x));
                          persist(x, true);
                        } catch {
                          setMsg("Некорректное сохранение");
                        }
                      }}
                    />
                  </label>
                </section>
              </>
            ) : (
              <>
                {tab === "Главная" && (
                  <>
                    <section className="hero">
                      <div className="hero-content">
                        <span className="tag">РЕЖИМ КАРЬЕРЫ</span>
                        <h1>
                          Твоя команда.
                          <br />
                          <em>Твоё наследие.</em>
                        </h1>
                        <p>
                          {c!.name} <span>•</span> {leagues[c!.league]}
                        </p>
                        <button
                          className="primary"
                          disabled={busy || !next}
                          onClick={() => simulate(1, true)}
                        >
                          ⚽ {busy ? "Симуляция…" : "Играть следующий матч"} →
                        </button>
                      </div>
                      <div className="hero-badge">
                        <Photo
                          src={c!.logo}
                          name={c!.name}
                          className="club-photo"
                        />
                        <small>FOOTBALL LEGACY</small>
                      </div>
                    </section>
                    {g.matches.every((m) => m.score) && (
                      <section className="panel season-finish">
                        <h3>Сезон {g.season}: время подвести итоги</h3>
                        {seasonComplete(g) ? (
                          <div className="actions">
                            <button
                              className="gold-button"
                              onClick={() => setTab("Награды")}
                            >
                              ✨ Церемония награждения
                            </button>
                            <button
                              className="primary"
                              onClick={() => {
                                act(nextSeason);
                                setDetail(null);
                              }}
                            >
                              Начать сезон {g.season + 1} →
                            </button>
                          </div>
                        ) : (
                          <button
                            className="primary"
                            onClick={() => act(completeSeason)}
                          >
                            Завершить ЛЧ и определить награды
                          </button>
                        )}
                      </section>
                    )}
                    <div className="metrics">
                      <div>
                        <small>ТРАНСФЕРНЫЙ БЮДЖЕТ</small>
                        <b>{money(c!.budget)}</b>
                        <span>Доступные средства</span>
                      </div>
                      <div>
                        <small>МЕСТО В ЛИГЕ</small>
                        <b>
                          {table(g, c!.league).findIndex(
                            (r) => r.club.id === g.club,
                          ) + 1}
                          <em>
                            {" "}
                            /{" "}
                            {
                              g.clubs.filter((x) => x.league === c!.league)
                                .length
                            }
                          </em>
                        </b>
                        <span>{leagues[c!.league]}</span>
                      </div>
                      <div>
                        <small>РЕЙТИНГ СОСТАВА</small>
                        <b>
                          {Math.round(
                            own.reduce((s, p) => s + p.rating, 0) / own.length,
                          )}
                          <em> / 99</em>
                        </b>
                        <span>{own.length} футболиста</span>
                      </div>
                      <div>
                        <small>СЫГРАНО МАТЧЕЙ</small>
                        <b>
                          {
                            g.matches.filter(
                              (m) =>
                                m.score &&
                                (m.home === g.club || m.away === g.club),
                            ).length
                          }
                        </b>
                        <span>В текущем сезоне</span>
                      </div>
                    </div>
                    <div className="columns">
                      <section className="panel">
                        <div className="section-head">
                          <h3>Следующий матч</h3>
                          <span className="tag">
                            ТУР {next ? next.round + 1 : "—"}
                          </span>
                        </div>
                        {next ? (
                          <>
                            <p className="muted center">
                              {leagues[c!.league]} · Чемпионат
                            </p>
                            <div className="versus">
                              <div>
                                <Photo
                                  src={g.clubs[next.home].logo}
                                  name={g.clubs[next.home].name}
                                  className="club-photo"
                                />
                                <b>{g.clubs[next.home].name}</b>
                              </div>
                              <strong>
                                VS<small>Следующий тур</small>
                              </strong>
                              <div>
                                <Photo
                                  src={g.clubs[next.away].logo}
                                  name={g.clubs[next.away].name}
                                  className="club-photo"
                                />
                                <b>{g.clubs[next.away].name}</b>
                              </div>
                            </div>
                            <button
                              className="wide secondary"
                              onClick={() => setTab("Клуб")}
                            >
                              Подготовить состав →
                            </button>
                          </>
                        ) : (
                          <p>Матчи завершены. Перейдите к новому сезону.</p>
                        )}
                        {last && (
                          <button
                            className="result"
                            onClick={() => {
                              setDetail(last.id);
                              setTab("Матчи");
                            }}
                          >
                            Последний результат <b>{last.score!.join(" : ")}</b>
                          </button>
                        )}
                      </section>
                      <section className="panel">
                        <div className="section-head">
                          <h3>Турнирная таблица</h3>
                          <button
                            className="link"
                            onClick={() => {
                              setLeague(c!.league);
                              setTab("Турниры");
                            }}
                          >
                            Вся таблица ↗
                          </button>
                        </div>
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
                              {table(g, c!.league)
                                .slice(0, 5)
                                .map((r, i) => (
                                  <tr
                                    key={r.club.id}
                                    className={
                                      r.club.id === g.club ? "highlight" : ""
                                    }
                                  >
                                    <td>{i + 1}</td>
                                    <td>
                                      <span className="table-club">
                                        <Photo
                                          src={r.club.logo}
                                          name={r.club.name}
                                        />
                                        {r.club.name}
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
                    </div>
                    <section className="panel">
                      <div className="section-head">
                        <h3>В центре внимания</h3>
                        <span className="muted">Лидеры твоего клуба</span>
                      </div>
                      {playerRows(
                        [...own]
                          .sort((a, b) => b.rating - a.rating)
                          .slice(0, 3),
                      )}
                    </section>
                  </>
                )}
                {tab === "Награды" && <AwardsView game={g} />}
                {tab === "Тренер" && <CoachView game={g} />}
                {tab === "Клуб" && (
                  <>
                    <div className="page-title">
                      <div>
                        <h1>{c!.name}</h1>
                        <p className="muted">
                          Состав, роли и игровая философия
                        </p>
                      </div>
                      <button
                        className="primary"
                        onClick={() => act((x) => autoLineup(x, x.club))}
                      >
                        Лучший состав
                      </button>
                    </div>
                    <section className="panel">
                      <div className="form-grid">
                        <label>
                          Расстановка
                          <select
                            value={c!.formation}
                            onChange={(e) =>
                              act((x) => {
                                x.clubs[x.club].formation = e.target.value;
                                autoLineup(x, x.club);
                              })
                            }
                          >
                            {["4-3-3", "4-2-3-1", "4-4-2", "3-5-2"].map((f) => (
                              <option key={f}>{f}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Стиль игры
                          <select
                            value={c!.style}
                            onChange={(e) =>
                              act((x) => {
                                x.clubs[x.club].style = e.target.value;
                              })
                            }
                          >
                            {["Баланс", "Атака", "Оборона"].map((f) => (
                              <option key={f}>{f}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Капитан
                          <select
                            value={c!.captain ?? ""}
                            onChange={(e) =>
                              act((x) => {
                                x.clubs[x.club].captain = +e.target.value;
                              })
                            }
                          >
                            {own.map((p) => (
                              <option value={p.id} key={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <p className="muted">
                        Нажмите на игрока для просмотра карточки, изменения
                        стартового состава, продажи или продления контракта.
                      </p>
                    </section>
                    <LineupView
                      game={g}
                      act={act}
                      onPlayer={(id) => {
                        const p = g.players.find((p) => p.id === id)!;
                        setSelected(p);
                        setFee(p.value);
                        setWage(p.salary);
                      }}
                    />
                    <div className="columns">
                      <section className="panel">
                        <h3>
                          Стартовые 11{" "}
                          <span className="tag">{c!.formation}</span>
                        </h3>
                        {playerRows(
                          own.filter((p) => c!.lineup.includes(p.id)),
                        )}
                      </section>
                      <section className="panel">
                        <h3>Скамейка запасных</h3>
                        {playerRows(
                          own.filter((p) => !c!.lineup.includes(p.id)),
                        )}
                        <h3>Финансы сезона</h3>
                        <p>
                          Доходы: <b>{money(c!.income)}</b>
                        </p>
                        <p>
                          Расходы: <b>{money(c!.expenses)}</b>
                        </p>
                        <p>
                          Зарплаты в неделю:{" "}
                          <b>{money(own.reduce((s, p) => s + p.salary, 0))}</b>
                        </p>
                      </section>
                    </div>
                  </>
                )}
                {tab === "Матчи" && (
                  <>
                    <div className="page-title">
                      <div>
                        <h1>Календарь сезона</h1>
                        <p className="muted">Матчи, которые пишут историю</p>
                      </div>
                    </div>
                    <section className="panel actions">
                      <button
                        className="primary"
                        disabled={busy}
                        onClick={() => simulate(1, true)}
                      >
                        Матч клуба
                      </button>
                      <button disabled={busy} onClick={() => simulate(1)}>
                        Следующий тур
                      </button>
                      <button disabled={busy} onClick={() => simulate(5)}>
                        5 туров
                      </button>
                      <button disabled={busy} onClick={() => simulate(38)}>
                        До конца сезона
                      </button>
                      {seasonComplete(g) && (
                        <button
                          className="primary"
                          onClick={() => {
                            act(nextSeason);
                            setDetail(null);
                          }}
                        >
                          Новый сезон →
                        </button>
                      )}
                    </section>
                    <section className="panel">
                      {g.matches
                        .filter((m) => m.home === g.club || m.away === g.club)
                        .map((m) => (
                          <button
                            className={
                              "fixture " + (m.id === detail ? "highlight" : "")
                            }
                            key={m.id}
                            onClick={() => setDetail(m.id)}
                          >
                            <small>ТУР {m.round + 1}</small>
                            <span>{g.clubs[m.home].name}</span>
                            <b>{m.score ? m.score.join(" : ") : "— : —"}</b>
                            <span>{g.clubs[m.away].name}</span>
                          </button>
                        ))}
                    </section>
                    {detail !== null && (
                      <section className="panel">
                        <h3>{score(g.matches[detail])}</h3>
                        {g.matches[detail].score ? (
                          <>
                            <p className="muted">
                              Удары: {g.matches[detail].shots?.join(" : ")}
                            </p>
                            {g.matches[detail].events?.length ? (
                              g.matches[detail].events!.map((e, i) => (
                                <p className="event" key={i}>
                                  {e}
                                </p>
                              ))
                            ) : (
                              <p>Без голов и событий.</p>
                            )}
                          </>
                        ) : (
                          <p>Матч ещё не сыгран.</p>
                        )}
                      </section>
                    )}
                  </>
                )}
                {tab === "Трансферы" && (
                  <>
                    <div className="page-title">
                      <div>
                        <h1>Трансферный рынок</h1>
                        <p className="muted">
                          Найди следующую легенду своего клуба
                        </p>
                      </div>
                      <span className="tag">
                        {g.round < 5 || (g.round >= 19 && g.round < 24)
                          ? "● ОКНО ОТКРЫТО"
                          : "ОКНО ЗАКРЫТО"}
                      </span>
                    </div>
                    <section className="panel">
                      <div className="filters">
                        <input
                          placeholder="Поиск по имени…"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                        />
                        <select
                          value={pos}
                          onChange={(e) => setPos(e.target.value)}
                        >
                          <option value="">Все позиции</option>
                          {positions.map((p) => (
                            <option key={p}>{p}</option>
                          ))}
                        </select>
                        <select
                          value={marketLeague}
                          onChange={(e) => setMarketLeague(+e.target.value)}
                        >
                          <option value={-1}>Все лиги</option>
                          <option value={-2}>Свободные агенты</option>
                          {leagues.map((l, i) => (
                            <option value={i} key={l}>
                              {l}
                            </option>
                          ))}
                        </select>
                        <label>
                          Возраст ≤
                          <input
                            type="number"
                            min="17"
                            max="50"
                            value={maxAge}
                            onChange={(e) => setMaxAge(+e.target.value)}
                          />
                        </label>
                        <label>
                          Рейтинг ≥
                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={minRating}
                            onChange={(e) => setMinRating(+e.target.value)}
                          />
                        </label>
                        <label>
                          Цена ≤ млн €
                          <input
                            type="number"
                            min="0"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(+e.target.value)}
                          />
                        </label>
                      </div>
                      {playerRows(
                        g.players
                          .filter(
                            (p) =>
                              p.club !== g.club &&
                              p.name
                                .toLowerCase()
                                .includes(query.toLowerCase()) &&
                              (!pos || p.pos === pos) &&
                              p.age <= maxAge &&
                              p.rating >= minRating &&
                              p.value <= maxPrice * 1e6 &&
                              (marketLeague === -1 ||
                                (marketLeague === -2
                                  ? p.club === null
                                  : p.club !== null &&
                                    g.clubs[p.club].league === marketLeague)),
                          )
                          .sort((a, b) => b.rating - a.rating)
                          .slice(0, 100),
                        true,
                      )}
                      <p className="muted">
                        Показаны первые 100 совпадений. Окна: туры 1–5 и 20–24.
                        Минимальная цена переговоров — 85% стоимости.
                      </p>
                    </section>
                  </>
                )}
                {tab === "Турниры" && (
                  <>
                    <EuropeView game={g} act={act} />
                    <h1>Национальные чемпионаты</h1>
                    <div className="league-tabs">
                      {leagues.map((l, i) => (
                        <button
                          className={league === i ? "active" : ""}
                          key={l}
                          onClick={() => setLeague(i)}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                    <section className="panel">
                      <h3>{leagues[league]}</h3>
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              {[
                                "#",
                                "Клуб",
                                "И",
                                "В",
                                "Н",
                                "П",
                                "ЗМ",
                                "ПМ",
                                "РМ",
                                "О",
                              ].map((x) => (
                                <th key={x}>{x}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {table(g, league).map((r, i) => (
                              <tr
                                key={r.club.id}
                                className={
                                  r.club.id === g.club ? "highlight" : ""
                                }
                              >
                                <td>
                                  <span
                                    className={
                                      i < (league === 0 ? 8 : 7)
                                        ? "rank top"
                                        : "rank"
                                    }
                                  >
                                    {i + 1}
                                  </span>
                                </td>
                                <td>
                                  <span className="table-club">
                                    <Photo
                                      src={r.club.logo}
                                      name={r.club.name}
                                    />
                                    {r.club.name}
                                  </span>
                                </td>
                                <td>{r.played}</td>
                                <td>{r.w}</td>
                                <td>{r.d}</td>
                                <td>{r.loss}</td>
                                <td>{r.gf}</td>
                                <td>{r.ga}</td>
                                <td>{r.gf - r.ga}</td>
                                <td>
                                  <b>{r.pts}</b>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="muted">
                        Квалификация ЛЧ: топ-8 Англии и топ-7 остальных лиг.
                        Игровой отбор среди пяти чемпионатов. Нижних дивизионов
                        нет.
                      </p>
                    </section>
                  </>
                )}
                {tab === "Статистика" && (
                  <>
                    <h1>Герои этого сезона</h1>
                    <div className="league-tabs">
                      <button
                        className={league === -1 ? "active" : ""}
                        onClick={() => setLeague(-1)}
                      >
                        Все турниры
                      </button>
                      <button
                        className={league === -2 ? "active" : ""}
                        onClick={() => setLeague(-2)}
                      >
                        Лига чемпионов
                      </button>
                      {leagues.map((l, i) => (
                        <button
                          className={league === i ? "active" : ""}
                          key={l}
                          onClick={() => setLeague(i)}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                    <div className="columns">
                      {(["goals", "assists", "clean"] as const).map(
                        (stat, i) => (
                          <section className="panel" key={stat}>
                            <h3>
                              {["Бомбардиры", "Ассистенты", "Сухие матчи"][i]}
                            </h3>
                            {g.players
                              .filter(
                                (p) =>
                                  (leaderboardStats(p).apps > 0 ||
                                    league === -1) &&
                                  (stat !== "clean" || p.pos === "GK"),
                              )
                              .sort(
                                (a, b) =>
                                  leaderboardStats(b)[stat] -
                                  leaderboardStats(a)[stat],
                              )
                              .slice(0, 15)
                              .map((p, j) => (
                                <button
                                  className="leader"
                                  key={p.id}
                                  onClick={() => {
                                    setSelected(p);
                                    setFee(p.value);
                                    setWage(p.salary);
                                  }}
                                >
                                  <span className="muted">{j + 1}</span>
                                  <span>
                                    {p.name}
                                    <small>
                                      {p.club === null
                                        ? "Free agent"
                                        : g.clubs[p.club].name}
                                    </small>
                                  </span>
                                  <b>{leaderboardStats(p)[stat]}</b>
                                </button>
                              ))}
                          </section>
                        ),
                      )}
                    </div>
                  </>
                )}
                {tab === "Зал славы" && (
                  <>
                    <h1>История пишется на поле.</h1>
                    <section className="panel">
                      <h3>Чемпионы и лучшие бомбардиры</h3>
                      {!g.history.length && (
                        <p className="muted">
                          Завершите первый сезон — и здесь появятся первые
                          страницы истории.
                        </p>
                      )}
                      {g.history.map((h) => (
                        <article key={h.season}>
                          <h3>
                            {h.season}/{String(h.season + 1).slice(-2)}
                          </h3>
                          {h.champions.map((n, i) => (
                            <p key={n}>
                              <span className="muted">{leagues[i]}</span> — 🏆{" "}
                              {n}
                            </p>
                          ))}
                          <p>
                            Лучший бомбардир: <b>{h.scorer}</b> · {h.goals}{" "}
                            голов
                          </p>
                        </article>
                      ))}
                    </section>
                    <div className="columns">
                      <section className="panel">
                        <h3>Бомбардиры за всю карьеру</h3>
                        {[...g.players, ...g.archive]
                          .sort(
                            (a, b) =>
                              b.career.goals +
                              b.stats.goals -
                              (a.career.goals + a.stats.goals),
                          )
                          .slice(0, 20)
                          .map((p) => (
                            <p key={p.id}>
                              {p.name}{" "}
                              <b className="float">
                                {p.career.goals + p.stats.goals}
                              </b>
                            </p>
                          ))}
                      </section>
                      <section className="panel">
                        <h3>Крупнейшие трансферы</h3>
                        {[...g.transfers]
                          .sort((a, b) => b.fee - a.fee)
                          .slice(0, 15)
                          .map((t, i) => (
                            <p key={i}>
                              <b>
                                {t.name} · {money(t.fee)}
                              </b>
                              <small>
                                {t.from} → {t.to}
                              </small>
                            </p>
                          ))}
                        <p className="muted">
                          Архив завершивших карьеру: {g.archive.length} игроков.
                          История наград доступна во вкладке «Награды».
                        </p>
                      </section>
                    </div>
                  </>
                )}
                {tab === "Настройки" && (
                  <section className="panel">
                    <h1>Твоя карьера под контролем</h1>
                    <p>
                      Автосохранение после каждого игрового действия. Текущий
                      слот: {slot}.
                    </p>
                    <div className="actions">
                      <button className="primary" onClick={() => persist(g)}>
                        Сохранить вручную
                      </button>
                      <button
                        onClick={() => {
                          void exportCareer(g).catch(() =>
                            setMsg("Экспорт не завершён. Повторите попытку."),
                          );
                        }}
                      >
                        Экспорт JSON
                      </button>
                      <label className="file">
                        Импорт JSON
                        <input
                          type="file"
                          accept="application/json"
                          onChange={async (e) => {
                            try {
                              const x = JSON.parse(
                                await e.target.files![0].text(),
                              );
                              if (!validateSave(x)) throw Error();
                              setG(migrateGame(x));
                              persist(x, true);
                              setSelected(null);
                            } catch {
                              setMsg("Некорректный файл сохранения");
                            }
                          }}
                        />
                      </label>
                    </div>
                    <h3>Слоты карьеры</h3>
                    {[1, 2, 3].map((s) => (
                      <button
                        className="slot"
                        key={s}
                        onClick={() => {
                          setSlot(s);
                          setG(read(s));
                          setSelected(null);
                          setTab("Главная");
                          setMsg("");
                        }}
                      >
                        Слот {s} ·{" "}
                        {read(s)
                          ? `${read(s)!.clubs[read(s)!.club].name} / ${read(s)!.season}`
                          : "Новая карьера"}{" "}
                        {slot === s ? "●" : ""}
                      </button>
                    ))}
                    <p className="muted">
                      Чтобы начать заново, выберите пустой слот. Импорт заменяет
                      текущий слот. Перед импортом сохраните резервную копию.
                    </p>
                    <h3>Редактируемая база</h3>
                    <p className="muted">
                      Экспортируйте JSON, измените названия, характеристики и
                      бюджеты и импортируйте обратно. Не меняйте идентификаторы
                      и связи. Игроки, рейтинги и финансы — модель симулятора, а
                      не официальные данные.
                    </p>
                    <h3>Версия 0.2 · ЛЧ и награды</h3>
                    <p className="muted">
                      ЛЧ, награды, живые матчи и досье тренера доступны. Аренды,
                      смена клуба и остальные еврокубки пока не реализованы.
                      Игра работает в браузере и Android без регистрации.
                    </p>
                  </section>
                )}
              </>
            )}
            <footer>
              FOOTBALL LEGACY <span>Создавай историю. Сезон за сезоном.</span>
            </footer>
          </div>
        </main>
      </div>
      {g?.live && <LiveView game={g} act={act} />}
      {currentPlayer && g && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <section className="modal panel" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setSelected(null)}>
              ×
            </button>
            <span className="eyebrow">КАРТОЧКА ФУТБОЛИСТА</span>
            <div className="player-heading">
              <Photo
                src={currentPlayer.photo}
                name={currentPlayer.name}
                className="portrait"
              />
              <span className="ovr big">{currentPlayer.rating}</span>
              <div>
                <h2>{currentPlayer.name}</h2>
                <p>
                  {currentPlayer.pos} · {currentPlayer.age} лет ·{" "}
                  {currentPlayer.nation}
                </p>
              </div>
            </div>
            <div className="metrics compact">
              <div>
                <small>ПОТЕНЦИАЛ</small>
                <b>{currentPlayer.potential}</b>
              </div>
              <div>
                <small>СТОИМОСТЬ</small>
                <b>{money(currentPlayer.value)}</b>
              </div>
              <div>
                <small>КОНТРАКТ</small>
                <b>{currentPlayer.contract} лет</b>
              </div>
            </div>
            <p>
              Клуб:{" "}
              {currentPlayer.club === null
                ? "Свободный агент"
                : g.clubs[currentPlayer.club].name}
            </p>
            <p>
              Форма {currentPlayer.fitness}% · Мораль {currentPlayer.morale}% ·
              Травма: {currentPlayer.injury} тур.
            </p>
            <p>
              Матчи {currentPlayer.stats.apps} · Голы{" "}
              {currentPlayer.stats.goals} · Пасы {currentPlayer.stats.assists}
            </p>
            <p>
              Карточки: {currentPlayer.stats.yellow} ЖК /{" "}
              {currentPlayer.stats.red} КК · Сухие: {currentPlayer.stats.clean}
            </p>
            <p>
              За карьеру: {currentPlayer.career.apps + currentPlayer.stats.apps}{" "}
              матчей, {currentPlayer.career.goals + currentPlayer.stats.goals}{" "}
              голов,{" "}
              {currentPlayer.career.assists + currentPlayer.stats.assists}{" "}
              передач
            </p>
            <p>
              🏆 Трофеи: {currentPlayer.trophies ?? 0} · Золотые мячи:{" "}
              {currentPlayer.ballon ?? 0}
            </p>
            <p className="muted">
              {currentPlayer.source ?? "Сгенерированный выпускник академии"} ·
              Рейтинг, финансы и недостающий возраст — игровая модель.
            </p>
            <details>
              <summary>Изменить фотографию</summary>
              <label>
                HTTPS-ссылка
                <input
                  type="url"
                  defaultValue={currentPlayer.photo ?? ""}
                  key={currentPlayer.id}
                  onBlur={(e) => {
                    const url = e.target.value.trim();
                    if (url && !url.startsWith("https://"))
                      return setMsg("Используйте HTTPS-ссылку");
                    act((x) => {
                      x.players.find((p) => p.id === currentPlayer.id)!.photo =
                        url || undefined;
                    });
                  }}
                />
              </label>
              <p className="muted">
                Для внешних фотографий требуется Интернет; недоступное фото
                заменяется инициалами.
              </p>
            </details>
            {currentPlayer.club !== g.club ? (
              <>
                <div className="form-grid">
                  <label>
                    Предложение клубу (€)
                    <input
                      type="number"
                      min="0"
                      value={fee}
                      onChange={(e) => setFee(+e.target.value)}
                    />
                  </label>
                  <label>
                    Зарплата в неделю (€)
                    <input
                      type="number"
                      min="0"
                      value={wage}
                      onChange={(e) => setWage(+e.target.value)}
                    />
                  </label>
                </div>
                <button
                  className="primary wide"
                  onClick={() =>
                    act((x) => transfer(x, currentPlayer.id, x.club, fee, wage))
                  }
                >
                  Предложить контракт
                </button>
              </>
            ) : (
              <div className="actions">
                <button
                  onClick={() =>
                    act((x) => {
                      const cc = x.clubs[x.club];
                      if (cc.lineup.includes(currentPlayer.id)) {
                        cc.lineup = cc.lineup.filter(
                          (id) => id !== currentPlayer.id,
                        );
                      } else if (cc.lineup.length >= 11)
                        throw Error(
                          "Сначала уберите одного игрока из стартового состава",
                        );
                      else if (currentPlayer.injury)
                        throw Error("Игрок травмирован");
                      else cc.lineup.push(currentPlayer.id);
                    })
                  }
                >
                  {c!.lineup.includes(currentPlayer.id) ? "В запас" : "В старт"}
                </button>
                <button
                  onClick={() =>
                    act((x) => {
                      const p = x.players.find(
                        (p) => p.id === currentPlayer.id,
                      )!;
                      const cost = p.salary * 8;
                      if (x.clubs[x.club].budget < cost)
                        throw Error("Недостаточно средств на подписной бонус");
                      x.clubs[x.club].budget -= cost;
                      x.clubs[x.club].expenses += cost;
                      p.contract = 5;
                      p.salary = Math.round(p.salary * 1.1);
                    })
                  }
                >
                  Продлить на 5 лет
                </button>
                <button
                  onClick={() =>
                    act((x) => {
                      const buyer = [...x.clubs]
                        .filter(
                          (cc) =>
                            cc.id !== x.club && cc.budget > currentPlayer.value,
                        )
                        .sort((a, b) => b.budget - a.budget)[0];
                      if (!buyer) throw Error("Нет покупателей");
                      transfer(
                        x,
                        currentPlayer.id,
                        buyer.id,
                        currentPlayer.value,
                        currentPlayer.salary,
                      );
                    })
                  }
                >
                  Продать за {money(currentPlayer.value)}
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
