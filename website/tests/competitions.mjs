import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
const artifacts = fileURLToPath(new URL("../../artifacts/", import.meta.url));
mkdirSync(artifacts, { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.BASE_URL || "http://127.0.0.1:5173");
  const g = await page.evaluate(async () => {
    const { createGame, advance } = await import("/src/engine.ts");
    const { completeSeason } = await import("/src/career.ts");
    const g = createGame("Pep", "Spain", 0, "Обычно", 2025, 42);
    advance(g, 38);
    completeSeason(g);
    g.club = g.europe.winner;
    return g;
  });
  await page.evaluate(
    async (g) =>
      localStorage.setItem(
        "fl-slot-1",
        (await import("/src/storage.ts")).encodeSave(g),
      ),
    g,
  );
  await page.reload();
  await page.getByRole("button", { name: "Турниры", exact: true }).click();
  assert.equal(await page.locator(".bracket-tie").count(), 23);
  await page
    .getByRole("button", { name: "UEFA Europa League", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "UEFA Europa League", exact: true, level: 1 })
    .waitFor();
  assert.equal(await page.locator(".bracket-tie").count(), 15);
  await page.screenshot({
    path: artifacts + "website-europa-bracket.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "UEFA Conference League", exact: true })
    .click();
  assert.equal(await page.locator(".bracket-tie").count(), 15);
  await page.getByRole("button", { name: "Сборные", exact: true }).click();
  await page.getByRole("heading", { name: "FIFA World Cup · 2026" }).waitFor();
  assert.equal(await page.locator(".bracket-tie").count(), 31);
  await page.getByRole("button", { name: "Награды", exact: true }).click();
  await page.getByRole("button", { name: "Лиги", exact: true }).click();
  await page.getByRole("button", { name: "La Liga", exact: true }).click();
  assert.equal(await page.locator(".award-card").count(), 6);
  assert.ok(
    (await page.locator(".award-card").allTextContents()).every((t) =>
      t.includes("La Liga"),
    ),
  );
  await page.locator(".award-card").first().click();
  await page
    .getByRole("button", { name: "Открыть победителя", exact: true })
    .click();
  await page.locator(".ceremony .trophy-svg").waitFor();
  await page.getByRole("button", { name: "Закрыть церемонию" }).click();
  await page.getByRole("button", { name: "Тренер", exact: true }).click();
  assert.ok(await page.locator(".trophy-card").count());
  await page.locator(".trophy-card summary").first().click();
  await page.screenshot({
    path: artifacts + "website-trophy-shelf.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Турниры", exact: true }).click();
  await page
    .getByRole("button", { name: "UEFA Europa League", exact: true })
    .click();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: artifacts + "website-europa-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Настройки", exact: true }).click();
  await page
    .getByRole("heading", { name: "Transfermarkt / EA FC · импорт базы" })
    .waitFor();
  assert.equal(
    await page
      .locator(
        'img[src*="premierleague"],img[src*="wikimedia"],img[src*="transfermarkt"]',
      )
      .count(),
    0,
  );
  await page
    .getByRole("button", { name: "Удалить текущую карьеру", exact: true })
    .click();
  await page.getByRole("dialog", { name: "Удаление карьеры" }).waitFor();
  await page.getByRole("button", { name: "Отмена", exact: true }).click();
  assert.ok(await page.evaluate(() => localStorage.getItem("fl-slot-1")));
  await page
    .getByRole("button", { name: "Удалить текущую карьеру", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Удалить навсегда", exact: true })
    .click();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("fl-slot-1")),
    null,
  );
  await page.getByRole("button", { name: /Подписать контракт/ }).waitFor();
  await page.reload();
  await page.getByRole("button", { name: /Подписать контракт/ }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS tournament separation, animated CL/EL/Conference/world brackets, league award separation, trophy reveal, import settings, mobile overflow and no JS errors",
  );
} finally {
  await browser.close();
}
