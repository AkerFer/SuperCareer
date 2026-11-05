import { useState } from "react";
export function Photo({
  src,
  name,
  className = "",
}: {
  src?: string;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState("");
  return (
    <span className={`photo ${className}`}>
      {src && src !== failed ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(src)}
        />
      ) : (
        <span aria-label={`Нет изображения: ${name}`}>
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
