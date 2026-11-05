import { useEffect, useRef, useState } from "react";
import {
  remotePhotosEnabled,
  resolvePlayerPhoto,
  type PhotoRecord,
} from "./photo-service";
export function Photo({
  src,
  name,
  className = "",
  real = false,
}: {
  src?: string;
  name: string;
  className?: string;
  real?: boolean;
}) {
  const [failed, setFailed] = useState<string[]>([]);
  const [record, setRecord] = useState<PhotoRecord | null>(null);
  const [visible, setVisible] = useState(false);
  const [enabled, setEnabled] = useState(remotePhotosEnabled);
  const ref = useRef<HTMLSpanElement>(null);
  const options = [
    record?.url,
    ...(src?.includes("resources.premierleague.com")
      ? [
          src.replace(
            "resources.premierleague.com",
            "resources.premierleague.pulselive.com",
          ),
          src,
        ]
      : [src]),
  ].filter((v): v is string => !!v);
  const current = options.find((v) => !failed.includes(v));
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const update = () => setEnabled(remotePhotosEnabled());
    window.addEventListener("football-photos-changed", update);
    return () => window.removeEventListener("football-photos-changed", update);
  }, []);
  useEffect(() => {
    if (!real || !visible || !enabled || current || record) return;
    let active = true;
    resolvePlayerPhoto(name).then((p) => {
      if (active) setRecord(p);
    });
    return () => {
      active = false;
    };
  }, [real, visible, enabled, name, current, record]);
  useEffect(() => {
    setFailed([]);
    setRecord(null);
  }, [src, name]);
  return (
    <span
      ref={ref}
      className={`photo ${className}`}
      title={
        record
          ? `${record.author} · ${record.license} · ${record.source}`
          : undefined
      }
    >
      {current ? (
        <img
          src={current}
          alt={name}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed((f) => [...f, current])}
        />
      ) : (
        <span aria-label={`Нет проверенного изображения: ${name}`}>
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
