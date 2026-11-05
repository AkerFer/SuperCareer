export const formations = ["4-3-3", "4-2-3-1", "4-4-2", "3-5-2"];
export function formationRows(formation: string): string[][] {
  switch (formation) {
    case "4-2-3-1":
      return [
        ["GK"],
        ["LB", "CB", "CB", "RB"],
        ["CDM", "CDM"],
        ["LW", "CAM", "RW"],
        ["ST"],
      ];
    case "4-4-2":
      return [
        ["GK"],
        ["LB", "CB", "CB", "RB"],
        ["LW", "CM", "CM", "RW"],
        ["ST", "ST"],
      ];
    case "3-5-2":
      return [
        ["GK"],
        ["CB", "CB", "CB"],
        ["LB", "CM", "CDM", "CM", "RB"],
        ["ST", "ST"],
      ];
    default:
      return [
        ["GK"],
        ["LB", "CB", "CB", "RB"],
        ["CM", "CDM", "CM"],
        ["LW", "ST", "RW"],
      ];
  }
}
export function roleFamily(pos: string) {
  return pos === "GK"
    ? "GK"
    : ["CB", "LB", "RB", "LWB", "RWB", "DF"].includes(pos)
      ? "DEF"
      : ["CDM", "CM", "CAM", "LM", "RM", "MF"].includes(pos)
        ? "MID"
        : "ATT";
}
export type PositionalPlayer = {
  pos: string;
  positions?: string[];
  rating?: number;
  cardBaseRating?: number;
  positionRatings?: Record<string, number>;
};
export function positionMultiplier(
  player: string | PositionalPlayer,
  expected: string,
) {
  const p = typeof player === "string" ? { pos: player } : player;
  if (
    p.rating &&
    p.cardBaseRating &&
    p.positionRatings?.[expected] !== undefined
  )
    return expected === p.pos
      ? 1
      : Math.max(
          1,
          Math.min(
            99,
            p.positionRatings[expected] + p.rating - p.cardBaseRating,
          ),
        ) / p.rating;
  const roles = [p.pos, ...(p.positions ?? [])];
  if (roles.includes(expected)) return p.pos === expected ? 1 : 0.98;
  if (roles.includes("GK") || expected === "GK") return 0.15;
  const adjacent: Record<string, string[]> = {
    LB: ["LWB"],
    RB: ["RWB"],
    LWB: ["LB", "LM"],
    RWB: ["RB", "RM"],
    LW: ["LM"],
    RW: ["RM"],
    LM: ["LW", "LWB"],
    RM: ["RW", "RWB"],
    ST: ["CF"],
    CF: ["ST", "CAM"],
  };
  if (roles.some((r) => adjacent[expected]?.includes(r))) return 0.9;
  if (
    roles.some(
      (r) =>
        ["DF", "MF", "FW"].includes(r) &&
        roleFamily(r) === roleFamily(expected),
    )
  )
    return 0.9;
  return roles.some((r) => roleFamily(r) === roleFamily(expected)) ? 0.8 : 0.55;
}

export function effectiveRating(
  p: PositionalPlayer & { rating: number },
  role: string,
) {
  return Math.max(
    1,
    Math.min(99, Math.round(p.rating * positionMultiplier(p, role))),
  );
}
