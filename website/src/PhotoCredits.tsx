import { useEffect, useState } from "react";
import {
  photoCredits,
  remotePhotosEnabled,
  setRemotePhotosEnabled,
} from "./photo-service";
export function PhotoCredits() {
  const [enabled, setEnabled] = useState(remotePhotosEnabled);
  const [credits, setCredits] = useState(photoCredits);
  useEffect(() => {
    const update = () => setCredits(photoCredits());
    window.addEventListener("football-photo-loaded", update);
    return () => window.removeEventListener("football-photo-loaded", update);
  }, []);
  return (
    <section className="photo-settings">
      <h3>Фотографии футболистов</h3>
      <label className="check-label">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            setEnabled(e.target.checked);
            setRemotePhotosEnabled(e.target.checked);
          }}
        />
        Автозагрузка проверяемых портретов из Wikimedia
      </label>
      <p className="muted">
        Для видимых реальных игроков используется фото по ссылке, затем текущий
        профиль Wikidata с изображением Commons. Требуется Интернет. При
        неоднозначном совпадении или отсутствии фото показываются инициалы. Это
        не гарантия съёмки в текущем сезоне.
      </p>
      <details>
        <summary>
          Авторство и лицензии загруженных портретов ({credits.length})
        </summary>
        {credits.map((c) => (
          <p key={c.name} className="muted">
            <a href={c.source} target="_blank" rel="noreferrer">
              {c.name}
            </a>{" "}
            — {c.author} ·{" "}
            <a href={c.licenseUrl} target="_blank" rel="noreferrer">
              {c.license}
            </a>
          </p>
        ))}
      </details>
    </section>
  );
}
