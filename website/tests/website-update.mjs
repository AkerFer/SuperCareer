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
const save = (page) =>
  page.evaluate(async () => {
    const { readSlot } = await import("/src/storage.ts");
    return readSlot(1);
  });
async function waitSave(page, test) {
  for (let i = 0; i < 150; i++) {
    const g = await save(page);
    if (g && test(g)) return g;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("Save condition timed out");
}
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.getByRole("tab", { name: "La Liga" }).click();
  await page.getByRole("button", { name: /Barcelona Сила/ }).click();
  await page
    .getByRole("button", { name: /Каждый матч Отдельный центр/ })
    .click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: artifacts + "website-club-picker.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Подписать контракт" }).click();
  await page.getByRole("heading", { name: "Карьера Barcelona" }).waitFor();
  let g = await save(page);
  assert.equal(g.clubs[g.club].name, "Barcelona");
  assert.equal(g.careerMode, "match");
  await page.getByRole("button", { name: "♜ Клуб" }).click();
  let before = (await save(page)).clubs[g.club].lineup;
  const bench = page.locator(".bench-player:not([disabled])").first();
  const incoming = +(await bench.getAttribute("data-bench-player"));
  await bench.dragTo(page.locator('[data-pitch-slot="8"]'));
  g = await waitSave(page, (g) => g.clubs[g.club].lineup[8] === incoming);
  assert.equal(new Set(g.clubs[g.club].lineup).size, 11);
  console.log("PASS desktop bench-to-pitch drag");
  await page.getByRole("button", { name: "▦ Карьера" }).click();
  assert.equal(
    await page.getByRole("button", { name: "Промотать неделю" }).count(),
    0,
  );
  await page.getByRole("button", { name: "В центр матча" }).click();
  await page.locator(".live-page").waitFor();
  await page.getByRole("button", { name: "Пауза", exact: true }).click();
  await page.getByRole("button", { name: "Досмотреть мгновенно" }).click();
  await waitSave(page, (g) => g.live.status === "finished");
  await page.getByRole("button", { name: "Готово" }).click();
  g = await save(page);
  assert.equal(g.careerMode, "match");
  assert.equal(
    g.matches.filter((m) => m.score && (m.home === g.club || m.away === g.club))
      .length,
    1,
  );
  const touch = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  await touch.addInitScript(
    (game) => localStorage.setItem("fl-slot-1", JSON.stringify(game)),
    g,
  );
  const tp = await touch.newPage();
  await tp.goto(base);
  await tp.getByRole("button", { name: "♜ Клуб" }).click();
  const handle = tp
    .locator(".bench-player:not([disabled]) .drag-handle")
    .first();
  await handle.evaluate((e) => e.scrollIntoView({ block: "center" }));
  const b = await handle.boundingBox();
  const target = await tp.locator('[data-pitch-slot="0"]').boundingBox();
  assert.ok(b && target && target.y >= 0 && target.y < 844);
  const sourceId = +(await handle
    .locator("..")
    .getAttribute("data-bench-player"));
  const cdp = await touch.newCDPSession(tp);
  const x = b.x + b.width / 2,
    y = b.y + b.height / 2,
    tx = target.x + target.width / 2,
    ty = target.y + target.height / 2;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  for (let i = 1; i <= 12; i++)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + ((tx - x) * i) / 12, y: y + ((ty - y) * i) / 12 }],
    });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await waitSave(tp, (g) => g.clubs[g.club].lineup[0] === sourceId);
  assert.ok(
    await tp.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  );
  await tp.screenshot({
    path: artifacts + "website-touch-drag.png",
    fullPage: true,
  });
  console.log("PASS real touchscreen drag");
  await touch.close();
  const fixture = await page.evaluate(async () => {
    const { createGame } = await import("/src/engine.ts");
    const { beginLive, queueVAR } = await import("/src/live.ts");
    const g = createGame("Coach", "Spain", 21, "Обычно", 2025, 7);
    g.careerMode = "match";
    beginLive(g);
    g.live.minute = 45;
    const id = g.live.lineups[0][10];
    queueVAR(g, "goal", 0, id);
    g.live.pendingVAR.decision = "cancel";
    return g;
  });
  await page.evaluate((g) => {
    localStorage.setItem("fl-slot-1", JSON.stringify(g));
    localStorage.removeItem("fl-live-1");
  }, fixture);
  await page.reload();
  await page.locator(".var-panel").waitFor();
  await waitSave(page, (g) => g.live.status === "halftime");
  let review = await save(page);
  assert.equal(review.live.score[0], 0);
  assert.equal(
    review.players.find((p) => p.id === fixture.live.pendingVAR.player).stats
      .goals,
    0,
  );
  await page
    .getByText("VAR: гол отменён — счёт не изменился", { exact: false })
    .first()
    .waitFor();
  fixture.live.pendingVAR.decision = "confirm";
  await page.evaluate((g) => {
    localStorage.setItem("fl-slot-1", JSON.stringify(g));
    localStorage.removeItem("fl-live-1");
  }, fixture);
  await page.reload();
  await page.locator(".goal-notice").waitFor();
  assert.ok((await page.locator(".goal-notice").innerText()).includes("ГОЛ"));
  await page.screenshot({
    path: artifacts + "website-goal-var.png",
    fullPage: true,
  });
  await waitSave(
    page,
    (g) => g.live.status === "halftime" && g.live.score[0] === 1,
  );
  console.log("PASS VAR cancellation, confirmation, goal banner");
  await page.evaluate(async () => {
    const { createGame } = await import("/src/engine.ts");
    localStorage.setItem(
      "fl-slot-1",
      JSON.stringify(createGame("Coach", "Spain", 21, "Обычно", 2025, 4)),
    );
    localStorage.removeItem("fl-live-1");
  });
  await page.reload();
  await page.getByRole("button", { name: "▤ Турниры" }).click();
  await page
    .getByRole("button", { name: "Смотреть матч клуба · 10 сек." })
    .click();
  await page.locator(".live-page").waitFor();
  assert.equal((await save(page)).live.competition, "ucl");
  await page.getByRole("button", { name: "Пауза", exact: true }).click();
  console.log("PASS UCL page opens dedicated match centre");
  console.log(
    "Player photos are disabled in v2.2; no remote lookup is part of the interface",
  );
  const calendarPage = await browser.newPage();
  await calendarPage.goto(base);
  await calendarPage
    .getByRole("button", { name: "Подписать контракт" })
    .click();
  assert.equal((await save(calendarPage)).careerMode, "calendar");
  await calendarPage.getByRole("button", { name: "Промотать неделю" }).click();
  await waitSave(calendarPage, (g) => g.round > 0);
  await calendarPage.evaluate(() => window.scrollTo(0, 0));
  await calendarPage.screenshot({
    path: artifacts + "website-career-calendar.png",
    fullPage: true,
  });
  console.log(
    "PASS styled club selection, two career modes and calendar simulation",
  );
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
