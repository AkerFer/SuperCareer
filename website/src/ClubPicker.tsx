import { useState, type CSSProperties } from "react";
import type { Club } from "./engine";
import { Photo } from "./Media";
export const leagueThemes = [
  {
    name: "Premier League",
    country: "Англия",
    color: "#a76cff",
    symbol: "♛",
    motto: "THE BIG STAGE",
  },
  {
    name: "La Liga",
    country: "Испания",
    color: "#ff725e",
    symbol: "◉",
    motto: "THE POWER OF OUR FÚTBOL",
  },
  {
    name: "Serie A",
    country: "Италия",
    color: "#57a4ff",
    symbol: "A",
    motto: "PASSIONE SENZA FINE",
  },
  {
    name: "Bundesliga",
    country: "Германия",
    color: "#ff5269",
    symbol: "⚽",
    motto: "FOOTBALL AS IT’S MEANT TO BE",
  },
  {
    name: "Ligue 1",
    country: "Франция",
    color: "#c6ef60",
    symbol: "1",
    motto: "LE FOOTBALL NOUS RASSEMBLE",
  },
];
export function ClubPicker({
  clubs,
  value,
  onChange,
}: {
  clubs: Club[];
  value: number;
  onChange: (id: number) => void;
}) {
  const [l, setL] = useState(clubs[value]?.league ?? 0);
  const [q, setQ] = useState("");
  const theme = leagueThemes[l];
  const chosen = clubs[value];
  return (
    <section
      className="club-picker"
      aria-label="Выбор клуба"
      style={{ "--league-accent": theme.color } as CSSProperties}
    >
      <div className="club-picker-title">
        <div>
          <span className="eyebrow">ВЫБЕРИ СВОЮ ИСТОРИЮ</span>
          <h3>Пять лиг. Твой первый клуб.</h3>
        </div>
        <span className="tag">96 клубов</span>
      </div>
      <div className="league-picker-tabs" role="tablist" aria-label="Чемпионат">
        {leagueThemes.map((t, i) => (
          <button
            role="tab"
            aria-selected={l === i}
            key={t.name}
            className={l === i ? "active" : ""}
            onClick={() => {
              setL(i);
              setQ("");
            }}
          >
            <span style={{ color: t.color }}>{t.symbol}</span>
            <b>{t.name}</b>
            <small>{t.country}</small>
          </button>
        ))}
      </div>
      <div className="league-banner">
        <span>{theme.symbol}</span>
        <div>
          <strong>{theme.name}</strong>
          <small>
            {theme.country} · {theme.motto}
          </small>
        </div>
      </div>
      <input
        aria-label="Поиск клуба"
        placeholder="Найти клуб в лиге…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="club-grid">
        {clubs
          .filter(
            (c) =>
              c.league === l && c.name.toLowerCase().includes(q.toLowerCase()),
          )
          .map((c) => (
            <button
              className={"club-choice " + (c.id === value ? "selected" : "")}
              aria-pressed={c.id === value}
              key={c.id}
              onClick={() => onChange(c.id)}
            >
              <Photo src={c.logo} name={c.name} />
              <b>{c.name}</b>
              <small>
                Сила {Math.round(c.strength)} · €{Math.round(c.budget / 1e6)}{" "}
                млн
              </small>
              {c.id === value && <span className="club-check">✓</span>}
            </button>
          ))}
      </div>
      <div className="chosen-club">
        <Photo src={chosen.logo} name={chosen.name} />
        <span>
          <small>ВАШ ВЫБОР</small>
          <b>{chosen.name}</b>
        </span>
        <span className="tag">{leagueThemes[chosen.league].name}</span>
      </div>
    </section>
  );
}
