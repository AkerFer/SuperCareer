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
    : ["CB", "LB", "RB"].includes(pos)
      ? "DEF"
      : ["CDM", "CM", "CAM"].includes(pos)
        ? "MID"
        : "ATT";
}

export const positionMultiplier = (pos: string, expected: string) =>
  pos === expected ? 1 : roleFamily(pos) === roleFamily(expected) ? 0.94 : 0.72;
