import { useState } from "react";
import type { Game } from "./engine";
import { importPlayerData, readDataFile } from "./external-data";
export function DataImport({
  act,
}: {
  act: (f: (g: Game) => void) => unknown;
}) {
  const [kind, setKind] = useState<"transfermarkt" | "eafc">("transfermarkt"),
    [date, setDate] = useState("2026-11-05"),
    [source, setSource] = useState(
      "https://github.com/dcaribou/transfermarkt-datasets",
    ),
    [message, setMessage] = useState("");
  return (
    <section className="panel">
      <h2>Transfermarkt / EA FC · импорт базы</h2>
      <p className="muted">
        Стоимость до импорта — игровая оценка. OVR FC 26 доступен для 1337
        совпадений (снимок 19.09.2025), у остальных — модель. Импорт
        сопоставляет реальные имена точно, пропускает неоднозначные совпадения и
        сохраняет дату источника. Изображения загружаются с внешнего сервера;
        доступность и права определяются источником.
      </p>
      <div className="form-grid">
        <label>
          Источник
          <select
            value={kind}
            onChange={(e) => {
              const v = e.target.value as typeof kind;
              setKind(v);
              setSource(
                v === "transfermarkt"
                  ? "https://github.com/dcaribou/transfermarkt-datasets"
                  : "https://www.ea.com/games/ea-sports-fc/ratings",
              );
            }}
          >
            <option value="transfermarkt">Transfermarkt · стоимость</option>
            <option value="eafc">EA FC · OVR и позиции</option>
          </select>
        </label>
        <label>
          Дата снимка
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label>
          Ссылка на источник
          <input value={source} onChange={(e) => setSource(e.target.value)} />
        </label>
        <label className="file-button">
          Загрузить CSV / CSV.GZ
          <input
            type="file"
            accept=".csv,.gz"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setMessage("Чтение данных…");
              try {
                const text = await readDataFile(file);
                let result = "";
                const ok = act((g) => {
                  const r = importPlayerData(g, text, kind, date, source);
                  result = `Обновлено ${r.matched}, пропущено ${r.skipped}`;
                });
                setMessage(
                  ok === false
                    ? "Импорт отклонён: проверьте сообщение об ошибке"
                    : result,
                );
              } catch (err) {
                setMessage((err as Error).message);
              }
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <p role="status">{message}</p>
      <small>
        CSV Transfermarkt: name, market_value_in_eur, image_url. CSV EA FC:
        long_name, overall, player_positions. Используйте текущую стоимость, не
        исторический максимум.
      </small>
    </section>
  );
}
