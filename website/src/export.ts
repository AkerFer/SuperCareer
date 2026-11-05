import type { Game } from "./engine";
export type CareerExporter = (game: Game) => Promise<void>;
let platformExporter: CareerExporter | undefined;
/** Android registers its native adapter; the standalone website uses downloads. */
export function registerCareerExporter(exporter: CareerExporter) {
  platformExporter = exporter;
}
export async function exportCareer(game: Game) {
  if (platformExporter) return platformExporter(game);
  const name = `football-legacy-${game.season}.json`;
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(game)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
