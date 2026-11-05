import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
const artifacts = fileURLToPath(new URL("../../artifacts/", import.meta.url));
mkdirSync(artifacts, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const base = process.env.BASE_URL || "http://127.0.0.1:5173";
async function save(page) {
  return page.evaluate(async () =>
    (await import("/src/storage.ts")).readSlot(1),
  );
}
async function load(page, g) {
  await page.evaluate(async (g) => {
    localStorage.setItem(
      "fl-slot-1",
      (await import("/src/storage.ts")).encodeSave(g),
    );
    localStorage.removeItem("fl-live-1");
  }, g);
  await page.reload();
  await page.locator("header").waitFor();
  await page.locator(".startup").waitFor({ state: "detached" });
  await page.locator(".startup").waitFor({ state: "detached" });
}
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.locator(".startup").waitFor();
  await page.locator(".startup").waitFor({ state: "detached" });
  assert.equal(await page.getByRole("tab").count(), 9);
  await page.getByRole("tab", { name: /MLS/ }).click();
  await page.getByRole("button", { name: /Inter Miami Сила/ }).click();
  await page.getByRole("button", { name: /Подписать контракт/ }).click();
  await page.getByRole("heading", { name: /Карьера Inter Miami/ }).waitFor();
  let g = await save(page);
  assert.equal(g.clubs.length, 180);
  await page.getByRole("button", { name: "Клуб", exact: true }).click();
  await page.locator(".pitch-player").first().click();
  await page.getByRole("dialog", { name: /Досье/ }).waitFor();
  await page
    .getByRole("heading", { name: "Сборная · статистика внутри карьеры" })
    .waitFor();
  await page.getByRole("button", { name: "Закрыть досье" }).click();
  await page
    .getByRole("button", { name: "Менять состав", exact: true })
    .click();
  const before = g.clubs[g.club].lineup[0];
  await page.locator('[data-pitch-slot="0"]').click();
  await page.locator(".bench-player:not([disabled])").first().click();
  g = await save(page);
  assert.notEqual(g.clubs[g.club].lineup[0], before);
  assert.equal(
    await page.getByText("Карьера сохранена", { exact: true }).count(),
    0,
  );
  await page.getByRole("button", { name: "Настройки", exact: true }).click();
  assert.equal(
    await page.getByRole("heading", { name: /Transfermarkt/ }).count(),
    0,
  );
  for (const [label, id] of [
    ["Голубая", "blue"],
    ["Белая", "white"],
    ["Чёрная", "black"],
    ["Розовая", "pink"],
  ]) {
    await page.getByRole("button", { name: new RegExp(label) }).click();
    assert.equal(
      await page.evaluate(() => document.documentElement.dataset.theme),
      id,
    );
  }
  await page.reload();
  await page.locator("header").waitFor();
  await page.locator(".startup").waitFor({ state: "detached" });
  assert.equal(
    await page.evaluate(() => document.documentElement.dataset.theme),
    "pink",
  );
  await page.getByRole("button", { name: "Настройки", exact: true }).click();
  await page.getByRole("button", { name: /Белая Светлый/ }).click();
  await page.locator(".startup").waitFor({ state: "detached" });
  await page.waitForTimeout(400);
  await page.screenshot({
    path: artifacts + "v23-white-theme.png",
    fullPage: true,
  });
  const season = await page.evaluate(async () => {
    const { createGame, advance } = await import("/src/engine.ts");
    const g = createGame("Coach", "Spain", 21, "Обычно", 2025, 17);
    advance(g, 38);
    return g;
  });
  await load(page, season);
  await page.getByRole("button", { name: "Турниры", exact: true }).click();
  await page.getByRole("button", { name: "Кубки стран", exact: true }).click();
  await page.getByRole("heading", { name: "Copa del Rey", level: 1 }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    (await page.locator(".bracket .current-stage .bracket-tie").count()) > 0,
  );
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: artifacts + "v23-cup-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "UEFA Champions League", exact: true })
    .click();
  await page
    .locator(".bracket-stage-tabs")
    .getByRole("button", { name: "1/8 финала", exact: true })
    .click();
  assert.equal(
    await page.locator(".bracket .current-stage .bracket-tie").count(),
    8,
  );
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: artifacts + "v23-champions-mobile.png",
    fullPage: true,
  });
  const fixture = await page.evaluate(async () => {
    const { createGame } = await import("/src/engine.ts");
    const g = createGame("Coach", "Spain", 21, "Обычно", 2025, 17);
    g.clubs[g.club].budget = 1e9;
    const own = g.matches
      .filter((m) => m.home === g.club || m.away === g.club)
      .sort((a, b) => a.round - b.round);
    for (let i = 0; i < 3; i++)
      own[i].score =
        i === 1
          ? [1, 1]
          : own[i].home === g.club
            ? i === 0
              ? [2, 0]
              : [0, 2]
            : i === 0
              ? [0, 2]
              : [2, 0];
    return g;
  });
  await load(page, fixture);
  await page.getByRole("button", { name: "Карьера", exact: true }).click();
  assert.ok(await page.locator(".career-calendar .result-win").count());
  assert.ok(await page.locator(".career-calendar .result-draw").count());
  assert.ok(await page.locator(".career-calendar .result-loss").count());
  assert.ok(await page.locator(".career-calendar .badge-ucl").count());
  assert.ok(await page.locator(".career-calendar .badge-domestic").count());
  await page.screenshot({
    path: artifacts + "v23-calendar-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Трансферы", exact: true }).click();
  await page.locator(".player").first().click();
  await page.getByLabel("Предложение клубу (€)").fill("1");
  await page
    .getByRole("button", { name: "Обсудить предложение", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Принять цену клуба", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Подписать контракт", exact: true })
    .click();
  await page.getByRole("heading", { name: /Добро пожаловать в/ }).waitFor();
  g = await save(page);
  assert.equal(g.transfers.length, 1);
  await page
    .getByRole("button", { name: "Продолжить карьеру", exact: true })
    .click();
  const live = await page.evaluate(async () => {
    const { createGame } = await import("/src/engine.ts");
    const { beginLive } = await import("/src/live.ts");
    const g = createGame("Coach", "Spain", 21, "Обычно", 2025, 17);
    beginLive(g);
    g.live.status = "paused";
    return g;
  });
  await load(page, live);
  const height = await page
    .locator(".live-stadium")
    .evaluate((e) => e.getBoundingClientRect().height);
  const goal = await page.evaluate(async (g) => {
    const { creditGoal } = await import("/src/live.ts");
    g.live.minute = 1;
    creditGoal(g, 0, g.live.lineups[0][10]);
    return g;
  }, live);
  await load(page, goal);
  await page.locator(".goal-notice").waitFor();
  assert.equal(
    await page
      .locator(".goal-notice")
      .evaluate((e) => getComputedStyle(e).position),
    "fixed",
  );
  assert.equal(
    await page
      .locator(".live-events")
      .evaluate((e) => Math.round(e.getBoundingClientRect().height)),
    220,
  );
  assert.ok(
    Math.abs(
      height -
        (await page
          .locator(".live-stadium")
          .evaluate((e) => e.getBoundingClientRect().height)),
    ) < 4,
  );
  assert.equal(
    await page.locator(".live-events .live-event:not(.goal)").count(),
    0,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS 2.3: startup, nine leagues, touch-sized player dossiers, squad changes, four persistent themes, domestic cups, mobile knockout stages, calendar colors and icons, negotiation purchase, fixed goal overlay and stable match height",
  );
} finally {
  await browser.close();
}
