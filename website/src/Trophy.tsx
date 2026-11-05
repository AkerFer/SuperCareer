import { useId } from "react";
export function Trophy({ name }: { name: string }) {
  const id = useId().replace(/:/g, "");
  const champions = name.includes("Champions"),
    europa = name.includes("Europa"),
    conference = name.includes("Conference"),
    ballon = name.includes("Ballon"),
    shoe = name.includes("Shoe");
  return (
    <svg
      className="trophy-svg"
      viewBox="0 0 100 130"
      role="img"
      aria-label={name}
    >
      <defs>
        <linearGradient id={id}>
          <stop stopColor={champions ? "#eef8ff" : "#ffe9a2"} />
          <stop offset=".45" stopColor={champions ? "#92a9c4" : "#bc842c"} />
          <stop offset=".7" stopColor={champions ? "#f6fbff" : "#ffe8a1"} />
          <stop offset="1" stopColor={champions ? "#5f7d9a" : "#8e611f"} />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="121" rx="35" ry="5" fill="#0008" />
      <g
        fill={`url(#${id})`}
        stroke={champions ? "#c4d9ec" : "#e8c678"}
        strokeWidth="2"
      >
        {shoe ? (
          <path d="M18 60L37 65L48 48L60 67L79 78Q93 86 79 94L21 94Q10 82 18 60Z" />
        ) : ballon ? (
          <>
            <circle cx="50" cy="48" r="31" />
            <path
              d="M50 26L65 37L60 56L40 56L35 37ZM19 43L35 37M81 43L65 37M30 73L40 56M70 73L60 56"
              fill="none"
            />
          </>
        ) : europa ? (
          <path d="M36 15L64 15L69 50L57 86L43 86L31 50ZM43 19L49 80M56 19L51 80" />
        ) : conference ? (
          <>
            <path d="M31 23L69 23L63 72L50 89L37 72Z" />
            <path d="M39 26L43 71M50 26L50 77M61 26L57 71" fill="none" />
          </>
        ) : (
          <>
            <path d="M28 18L72 18L68 57Q65 76 50 80Q35 76 32 57Z" />
            <path
              d={
                champions
                  ? "M29 25Q2 9 9 44Q12 67 36 65M71 25Q98 9 91 44Q88 67 64 65"
                  : "M29 29H12Q9 62 35 63M71 29H88Q91 62 65 63"
              }
              fill="none"
              strokeWidth="6"
            />
          </>
        )}
        <path d="M46 81H54V105H46Z" />
        <path d="M30 107H70L76 117H24Z" />
      </g>
    </svg>
  );
}
