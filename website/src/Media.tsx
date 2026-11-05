import { useState } from "react";
import logos from "./data/logos.json";
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
  const club = Object.hasOwn(logos, name);
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
