import { useState } from "react";
import logos from "./data/logos.json";
import extra from "./data/extra-leagues.json";
const clubNames = new Set([
  ...Object.keys(logos),
  ...extra.flatMap((l) => l.clubs.map((c) => c.name)),
]);
/** Player portraits are disabled until the separate image database is supplied. */
export function Photo({
  src,
  name,
  className = "",
}: {
  src?: string;
  name: string;
  className?: string;
  real?: boolean;
}) {
  const [failed, setFailed] = useState<string>();
  const club = clubNames.has(name);
  const image = club ? src : undefined;
  return (
    <span className={`photo ${className}`}>
      {image && failed !== image ? (
        <img
          src={image}
          alt={name}
          loading="lazy"
          onError={() => setFailed(image)}
        />
      ) : (
        <span
          aria-label={
            club
              ? `Эмблема недоступна: ${name}`
              : `Фотографии игроков временно отключены: ${name}`
          }
        >
          {name
            .split(" ")
            .map((x) => x[0])
            .slice(0, 2)
            .join("")}
        </span>
      )}
    </span>
  );
}
