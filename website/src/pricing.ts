import type { Player, Game } from "./engine";
export function marketValue(
  p: Pick<Player, "rating" | "potential" | "age" | "pos">,
) {
  const age = p.pos === "GK" ? p.age - 2 : p.age;
  const ageFactor =
    age <= 20
      ? 1.6
      : age <= 23
        ? 1.25
        : age <= 28
          ? 1
          : age <= 30
            ? 0.8
            : age === 31
              ? 0.6
              : age === 32
                ? 0.45
                : age === 33
                  ? 0.32
                  : age === 34
                    ? 0.22
                    : age === 35
                      ? 0.15
                      : 0.08;
  const role = p.pos === "GK" ? 0.65 : p.pos === "CB" ? 0.8 : 1;
  return Math.max(
    50000,
    Math.min(
      250000000,
      Math.round(
        (20000000 *
          Math.exp((p.rating - 80) * 0.16) *
          ageFactor *
          (1 + Math.min(15, Math.max(0, p.potential - p.rating)) * 0.025) *
          role) /
          50000,
      ) * 50000,
    ),
  );
}
export function refreshPrices(g: Game) {
  if (g.pricingVersion === 2) return;
  for (const p of g.players) {
    p.value = marketValue(p);
    p.valueSource = undefined;
  }
  g.pricingVersion = 2;
  g.negotiation = undefined;
}
