import { useEffect, useState } from "react";
export function Appearance() {
  const [theme, setTheme] = useState(() => {
    try {
      const v = localStorage.getItem("fl-theme");
      return v && ["black", "white", "blue", "pink"].includes(v) ? v : "black";
    } catch {
      return "black";
    }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("fl-theme", theme);
    } catch {
      /* The chosen theme remains active for this session. */
    }
  }, [theme]);
  return (
    <section className="panel">
      <h2>Твой стиль игры</h2>
      <p className="muted">
        Тема сохраняется на этом устройстве для всех карьер.
      </p>
      <div className="theme-options">
        {[
          ["blue", "Голубая", "Ледяная арена"],
          ["white", "Белая", "Светлый стадион"],
          ["black", "Чёрная", "Ночной финал"],
          ["pink", "Розовая", "Неоновая легенда"],
        ].map(([id, title, sub]) => (
          <button
            key={id}
            className={"theme-choice " + id + (theme === id ? " selected" : "")}
            aria-pressed={theme === id}
            onClick={() => setTheme(id)}
          >
            <span>◉</span>
            <strong>{title}</strong>
            <small>{sub}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
export function Startup() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    try {
      document.documentElement.dataset.theme =
        localStorage.getItem("fl-theme") || "black";
    } catch {
      document.documentElement.dataset.theme = "black";
    }
    const timer = setTimeout(() => setVisible(false), 1700);
    return () => clearTimeout(timer);
  }, []);
  return visible ? (
    <div className="startup" aria-label="Football Legacy запускается">
      <div className="startup-mark">FL</div>
      <h1>
        FOOTBALL <em>LEGACY</em>
      </h1>
      <p>ТВОЯ ИСТОРИЯ НАЧИНАЕТСЯ ЗДЕСЬ</p>
      <span className="startup-loader" />
    </div>
  ) : null;
}
