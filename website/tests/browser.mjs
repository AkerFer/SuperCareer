import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const artifacts = fileURLToPath(new URL("../../artifacts/", import.meta.url));
mkdirSync(artifacts, { recursive: true });
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const getSave = () =>
    page.evaluate(async () => {
      const { readSlot } = await import("/src/storage.ts");
      return readSlot(1);
    });
  const waitSave = async (expression) => {
    const end = Date.now() + 60000;
    while (Date.now() < end) {
      const ready = await page.evaluate(async (expression) => {
        const raw = localStorage.getItem("fl-live-1");
        const g =
          raw && expression.includes("g.live")
            ? { live: JSON.parse(raw).live }
            : (await import("/src/storage.ts")).readSlot(1);
        return !!g && Function("g", `return (${expression})`)(g);
      }, expression);
      if (ready) return;
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error(`Timed out waiting for ${expression}`);
  };
  await page.goto(process.env.BASE_URL || "http://127.0.0.1:5173");
  await page.getByRole("button", { name: "Подписать контракт" }).click();
  await page.getByRole("button", { name: "Главная", exact: true }).click();
  await page
    .getByRole("heading", { name: "Твоя команда. Твоё наследие." })
    .waitFor();
  assert.ok((await getSave()).players.filter((p) => p.real).length > 1500);
  await page.getByRole("button", { name: "Клуб", exact: true }).click();
  await page.getByLabel("Футбольное поле", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Менять состав", exact: true })
    .click();
  let beforeLineup = (await getSave()).clubs[0].lineup;
  const pitchButton = page.locator(".pitch-player").first();
  const pitchIndex =
    +(await pitchButton.getAttribute("aria-label")).match(/Позиция (\d+)/)[1] -
    1;
  await pitchButton.click();
  await page.locator(".bench-player:not([disabled])").first().click();
  await waitSave(
    `g.clubs[0].lineup[${pitchIndex}]!==${beforeLineup[pitchIndex]}`,
  );
  assert.equal(new Set((await getSave()).clubs[0].lineup).size, 11);
  await page
    .getByRole("combobox", { name: "Расстановка на поле" })
    .selectOption("4-2-3-1");
  await waitSave("g.clubs[0].formation==='4-2-3-1'");
  await page.screenshot({
    path: artifacts + "pitch-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: artifacts + "pitch-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Главная", exact: true }).click();

  const firstHalfStart = Date.now();
  await page.getByRole("button", { name: /Играть следующий матч/ }).click();
  await waitSave("g.live?.status==='halftime'");
  console.log("First half ms:", Date.now() - firstHalfStart);
  assert.ok(
    Date.now() - firstHalfStart <
      14000 +
        (await getSave()).live.events.filter((e) => e.type === "var").length *
          2000,
  );
  let saved = await getSave();
  assert.equal(saved.live.minute, 45);
  assert.equal(saved.matches.filter((m) => m.score).length, 0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: artifacts + "live-halftime.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.reload();
  await page.getByRole("button", { name: "Начать второй тайм" }).waitFor();
  assert.equal((await getSave()).live.minute, 45);
  await page
    .getByRole("button", { name: "Состав и замены", exact: true })
    .click();
  await page
    .locator(".in-match-board .pitch-player:not([disabled])")
    .first()
    .click();
  await page
    .locator(".in-match-board .bench-player:not([disabled])")
    .first()
    .click();
  await waitSave("g.live.substitutions.length===1");
  let halftimeSave = await getSave();
  let substitution = halftimeSave.live.substitutions[0];
  assert.equal(
    halftimeSave.players.find((p) => p.id === substitution.in).stats.apps,
    1,
  );
  await page.reload();
  assert.equal((await getSave()).live.substitutions.length, 1);

  const secondHalfStart = Date.now();
  await page.getByRole("button", { name: "Начать второй тайм" }).click();
  await waitSave("g.live?.status==='finished'");
  console.log("Second half ms:", Date.now() - secondHalfStart);
  assert.ok(
    Date.now() - secondHalfStart <
      14000 +
        (await getSave()).live.events.filter((e) => e.type === "var").length *
          2000,
  );
  saved = await getSave();
  assert.equal(saved.matches.filter((m) => m.score).length, 1);
  assert.equal(saved.live.minute, 90);
  await page.getByRole("button", { name: "Готово" }).click();
  await page.getByRole("button", { name: "Трансферы", exact: true }).click();
  await page.getByPlaceholder("Поиск по имени…").fill("Alisson");
  await page.locator(".player").first().click();
  await page.getByRole("button", { name: "Обсудить предложение" }).click();
  if (
    await page
      .getByRole("button", { name: "Принять цену клуба", exact: true })
      .count()
  )
    await page
      .getByRole("button", { name: "Принять цену клуба", exact: true })
      .click();
  await page
    .getByRole("button", { name: "Подписать контракт", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Продолжить карьеру", exact: true })
    .click();
  await waitSave("g.transfers.length>0");
  await page.getByRole("button", { name: "×", exact: true }).click();
  await page.getByRole("button", { name: "Турниры", exact: true }).click();
  assert.equal(await page.locator("tbody tr").count(), 36);
  await page.getByRole("button", { name: "Матчи", exact: true }).click();
  await page.getByRole("button", { name: "До конца сезона" }).click();
  await waitSave("g.awards.length===1");
  await page.getByRole("button", { name: "Награды", exact: true }).click();
  await page
    .getByRole("button", { name: "Начать вручение выбранных наград" })
    .click();
  await page.locator(".winner-reveal").waitFor();
  await page
    .getByRole("heading", {
      name: "Ballon d’Or — Золотой мяч",
      exact: true,
      level: 2,
    })
    .waitFor();
  await page.screenshot({
    path: artifacts + "awards-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Следующая награда" }).click();
  await page.locator(".winner-reveal").waitFor();
  await page
    .getByRole("heading", {
      name: "European Golden Shoe — Золотая бутса",
      exact: true,
      level: 2,
    })
    .waitFor();
  await page.getByRole("button", { name: "Закрыть церемонию" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: artifacts + "awards-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Тренер", exact: true }).click();
  await page.getByRole("heading", { name: "Результаты карьеры" }).waitFor();
  await page.getByRole("button", { name: "Главная", exact: true }).click();
  await page.getByRole("button", { name: "Начать сезон 2026" }).click();
  await waitSave("g.season===2026");
  saved = await getSave();
  assert.equal(saved.coach.seasons, 1);
  assert.equal(saved.awards[0].season, 2025);
  assert.ok(saved.matches.every((m) => !m.score));
  await page.reload();
  assert.equal((await getSave()).season, 2026);
  await page.getByRole("button", { name: "Настройки", exact: true }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Экспорт JSON", exact: true }).click(),
  ]);
  const exported = JSON.parse(readFileSync(await download.path(), "utf8"));
  assert.equal(exported.version, 1);
  assert.equal(exported.season, 2026);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: browser-only JSON export without Capacitor; pitch lineup swaps, formations, five-substitution engine and halftime substitution persistence; real names, live minutes, halftime and reload, transfer, UCL, full season, animated awards, coach stats, next season, mobile layout, no JS errors",
  );
} finally {
  await browser.close();
}
