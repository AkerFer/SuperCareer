import { leagues, type Game, type Match } from "./engine";
import { competitionNames } from "./continental";
export function CompetitionBadge({
  game: g,
  match: m,
}: {
  game: Game;
  match: Match;
}) {
  const id = m.competition ?? "league";
  const label =
    id === "league"
      ? ["PL", "LL", "A", "BL", "L1", "MLS", "SPL", "POR", "TUR"][m.league]
      : id === "domestic"
        ? "CUP"
        : id === "ucl"
          ? "UCL"
          : id === "uel"
            ? "UEL"
            : id === "uecl"
              ? "UECL"
              : "SC";
  const title = id === "league" ? leagues[m.league] : m.tournament
    ? g.domestic?.[m.tournament]?.name
    : competitionNames[id];
  return (
    <span
      className={`competition-badge badge-${id} league-${m.league}`}
      title={title}
      aria-label={title}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d={
            id === "league"
              ? "M4 3H20V21H4ZM4 12H20M12 3V21M15 12A3 3 0 1 0 9 12A3 3 0 1 0 15 12"
              : "M7 3H17V10Q17 16 12 17Q7 16 7 10ZM7 6H3V10Q3 14 8 14M17 6H21V10Q21 14 16 14M12 17V21M7 21H17"
          }
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
      {label}
    </span>
  );
}
