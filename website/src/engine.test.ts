import { resolveVAR } from "./live";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  advance,
  table,
  transfer,
  nextSeason,
  squad,
  validateSave,
} from "./engine";
test("five leagues have balanced double round-robin calendars", () => {
  const g = createGame("Alex", "England", 0, "Обычно", 2025, 42);
  assert.equal(g.clubs.length, 96);
  assert.equal(g.players.length, 2112);
  for (const c of g.clubs) {
    const matches = g.matches.filter((m) => m.home === c.id || m.away === c.id);
    const n = g.clubs.filter((x) => x.league === c.league).length;
    assert.equal(matches.length, (n - 1) * 2);
    assert.equal(new Set(matches.map((m) => m.round)).size, matches.length);
    assert.equal(c.lineup.length, 11);
  }
});
test("match updates standings, scorers and appearances; one match does not double play", () => {
  const g = createGame("Alex", "England", 0, "Обычно", 2025, 42);
  advance(g, 1, true);
  assert.equal(g.matches.filter((m) => m.score).length, 1);
  advance(g);
  const ms = g.matches.filter((m) => m.score);
  assert.equal(ms.length, 48);
  assert.equal(
    g.players.reduce((s, p) => s + p.stats.goals, 0),
    ms.reduce((s, m) => s + m.score![0] + m.score![1], 0),
  );
  assert.equal(
    table(g, 0).reduce((s, r) => s + r.played, 0),
    20,
  );
  assert.equal(
    g.players.reduce((s, p) => s + p.stats.apps, 0),
    48 * 22,
  );
});
test("transfers conserve budgets and move player, failures are atomic", () => {
  const g = createGame("Alex", "England", 0, "Обычно", 2025, 42);
  const p = squad(g, 2)[0];
  const total = g.clubs.reduce((s, c) => s + c.budget, 0);
  transfer(g, p.id, 0, p.value, p.salary);
  assert.equal(p.club, 0);
  assert.equal(
    g.clubs.reduce((s, c) => s + c.budget, 0),
    total,
  );
  assert.equal(squad(g, 2).length, 21);
  const before = JSON.stringify(g);
  assert.throws(
    () => transfer(g, squad(g, 3)[0].id, 0, 1e20, 1e9),
    /Недостаточно/,
  );
  assert.equal(JSON.stringify(g), before);
  g.round = 10;
  assert.throws(() => transfer(g, squad(g, 3)[0].id, 0, 1e6, 1e9), /закрыто/);
});
test("30-season career preserves history and can round-trip JSON", () => {
  const g = createGame("Alex", "England", 0, "Обычно", 2025, 125);
  for (let s = 0; s < 30; s++) {
    advance(g, 38);
    assert.ok(g.matches.every((m) => m.score));
    for (let l = 0; l < 5; l++) {
      const rows = table(g, l);
      assert.ok(rows.every((r) => r.played === (rows.length - 1) * 2));
      assert.equal(
        rows.reduce((s, r) => s + r.gf, 0),
        rows.reduce((s, r) => s + r.ga, 0),
      );
    }
    nextSeason(g);
    assert.equal(g.round, 0);
    assert.ok(g.clubs.every((c) => squad(g, c.id).length >= 16));
    assert.ok(validateSave(JSON.parse(JSON.stringify(g))));
  }
  assert.equal(g.history.length, 30);
  assert.equal(g.awards!.length, 30);
  assert.equal(g.coach!.seasons, 30);
  assert.equal(g.season, 2055);
  assert.ok(g.archive.length > 0);
  assert.ok(g.transfers.length > 0);
});
test("reject malformed imported save", () => {
  assert.equal(validateSave({ version: 1 }), false);
  const g = createGame("Alex", "England", 0, "Обычно", 2025, 1);
  g.clubs[0].budget = NaN;
  assert.equal(validateSave(g), false);
});

test("live match stops at half-time, survives JSON and credits statistics once", async () => {
  const { beginLive, tickLive, resumeLive, skipLive } = await import("./live");
  const { decodeSave, encodeSave } = await import("./storage");
  const g = createGame("Alex", "England", 0, "Обычно", 2025, 100);
  beginLive(g);
  assert.equal(g.live!.minute, 0);
  for (let i = 0; i < 45; i++) {
    tickLive(g);
    if (g.live!.status === "review") resolveVAR(g);
  }
  assert.equal(g.live!.minute, 45);
  assert.equal(g.live!.status, "halftime");
  assert.equal(g.matches.filter((m) => m.score).length, 0);
  tickLive(g);
  assert.equal(g.live!.minute, 45);
  const restored = decodeSave(encodeSave(g))!;
  assert.ok(restored);
  assert.equal(restored.live!.status, "halftime");
  resumeLive(restored);
  skipLive(restored);
  const live = restored.live!;
  const match = restored.matches.find((m) => m.id === live.matchId)!;
  assert.equal(live.minute, 90);
  assert.equal(live.status, "finished");
  assert.deepEqual(match.score, live.score);
  assert.equal(
    live.events.filter((e) => e.type === "goal").length,
    live.score[0] + live.score[1],
  );
  assert.equal(
    restored.players.reduce((s, p) => s + p.leagueStats!.goals, 0),
    live.score[0] + live.score[1],
  );
  const stats = JSON.stringify(restored.players.map((p) => p.stats));
  skipLive(restored);
  tickLive(restored);
  assert.equal(JSON.stringify(restored.players.map((p) => p.stats)), stats);
});
test("Champions League has eight unique opponents and completes all knockout rounds", async () => {
  const { advanceEurope, europeanTable } = await import("./career");
  const g = createGame("Alex", "England", 0, "Обычно", 2025, 31);
  const teams = g.europe!.teams;
  assert.equal(teams.length, 36);
  for (const id of teams) {
    const ms = g.europe!.matches.filter((m) => m.home === id || m.away === id);
    assert.equal(ms.length, 8);
    assert.equal(
      new Set(ms.map((m) => (m.home === id ? m.away : m.home))).size,
      8,
    );
  }
  for (let i = 0; i < 8; i++) advanceEurope(g);
  assert.ok(europeanTable(g).every((r) => r.played === 8));
  assert.equal(g.europe!.stage, "playoff");
  for (let i = 0; i < 9; i++) advanceEurope(g);
  assert.equal(g.europe!.stage, "complete");
  assert.ok(teams.includes(g.europe!.winner!));
  assert.equal(g.europe!.matches.length, 189);
  assert.ok(g.europe!.matches.every((m) => m.score));
});
test("awards are deterministic, Golden Shoe excludes European goals, coach and qualification survive rollover", async () => {
  const { finalizeSeason, coachStats } = await import("./career");
  const g = createGame("Alex", "England", 0, "Обычно", 2025, 9);
  advance(g, 38);
  assert.equal(g.awards!.length, 1);
  const a = g.awards![0];
  assert.equal(a.awards.find((a) => a.id === "ballon")!.nominees.length, 30);
  const top = [...g.players].sort(
    (a, b) =>
      (b.leagueStats?.goals ?? 0) - (a.leagueStats?.goals ?? 0) || a.id - b.id,
  )[0];
  assert.equal(a.awards.find((a) => a.id === "shoe")!.winner.id, top.id);
  const before = JSON.stringify(a);
  const winner = g.players.find(
    (p) => p.id === a.awards.find((a) => a.id === "ballon")!.winner.id,
  )!;
  assert.equal(winner.ballon, 1);
  finalizeSeason(g);
  assert.equal(JSON.stringify(g.awards![0]), before);
  assert.equal(winner.ballon, 1);
  const coach = coachStats(g);
  const qualifiers = Array.from({ length: 5 }, (_, l) =>
    table(g, l)
      .slice(0, l === 0 ? 8 : 7)
      .map((r) => r.club.id),
  ).flat();
  nextSeason(g);
  assert.equal(g.coach!.played, coach.played);
  assert.equal(g.coach!.seasons, 1);
  assert.deepEqual(g.europe!.teams, qualifiers);
  assert.equal(g.awards!.length, 1);
  assert.ok(
    g.players.every(
      (p) => p.stats.goals === 0 && (p.europeanStats?.goals ?? 0) === 0,
    ),
  );
});
test("legacy save migration keeps progress and real names are marked separately from generated youth", async () => {
  const { migrateGame } = await import("./career");
  const g = createGame("Alex", "England", 0, "Обычно", 2025, 10);
  assert.ok(g.players.filter((p) => p.real).length > 1500);
  assert.ok(g.players.some((p) => p.name === "Kylian Mbappé"));
  assert.ok(g.clubs.every((c) => c.logo));
  advance(g, 1);
  const budget = g.clubs[0].budget;
  delete g.edition;
  delete g.europe;
  delete g.awards;
  delete g.coach;
  assert.ok(validateSave(g));
  migrateGame(g);
  assert.equal(g.clubs[0].budget, budget);
  assert.ok(g.matches.some((m) => m.score));
  assert.equal(g.europe!.teams.length, 36);
});

test("reject corrupt European and live state without replacing the career", async () => {
  const { beginLive } = await import("./live");
  const g = createGame("Alex", "England", 0, "Обычно", 2025, 8);
  beginLive(g);
  assert.ok(validateSave(g));
  g.live!.minute = 400;
  assert.equal(validateSave(g), false);
  delete g.live;
  g.europe!.teams = [0];
  assert.equal(validateSave(g), false);
});

test("live save journal restores exact minute without recompressing the base snapshot", async () => {
  const { saveSlot, readSlot } = await import("./storage");
  const { beginLive, tickLive, resumeLive, skipLive } = await import("./live");
  const data = new Map<string, string>();
  const old = globalThis.localStorage;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => data.set(k, v),
      removeItem: (k: string) => data.delete(k),
    },
  });
  try {
    const g = createGame("Alex", "England", 0, "Обычно", 2025, 7);
    beginLive(g);
    saveSlot(1, g, true);
    const base = data.get("fl-slot-1");
    for (let i = 0; i < 45; i++) {
      tickLive(g);
      if (g.live!.status === "review") resolveVAR(g);
      saveSlot(1, g);
    }
    assert.equal(data.get("fl-slot-1"), base);
    const recovered = readSlot(1)!;
    assert.equal(recovered.live!.minute, 45);
    assert.equal(recovered.live!.status, "halftime");
    assert.equal(recovered.seed, g.seed);
    assert.deepEqual(
      recovered.players.map((p) => p.stats),
      g.players.map((p) => p.stats),
    );
    resumeLive(recovered);
    skipLive(recovered);
    saveSlot(1, recovered);
    assert.equal(data.has("fl-live-1"), false);
    assert.equal(readSlot(1)!.live!.status, "finished");
  } finally {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: old,
    });
  }
});

test("pitch lineup swaps and substitutes while preserving 11 unique players", async () => {
  const { setLineupPlayer } = await import("./lineup");
  const { formationRows } = await import("./tactics");
  const g = createGame("Alex", "England", 0, "Обычно", 2025, 5);
  const c = g.clubs[0];
  assert.equal(g.players.find((p) => p.id === c.lineup[0])!.pos, "GK");
  const before = [...c.lineup];
  setLineupPlayer(g, 1, before[2]);
  assert.equal(c.lineup[1], before[2]);
  assert.equal(c.lineup[2], before[1]);
  const incoming = squad(g, 0).find((p) => !c.lineup.includes(p.id))!;
  setLineupPlayer(g, 2, incoming.id);
  assert.equal(c.lineup[2], incoming.id);
  assert.equal(c.lineup.length, 11);
  assert.equal(new Set(c.lineup).size, 11);
  assert.equal(formationRows("4-2-3-1").flat().length, 11);
});
test("five live substitutions affect appearances, minutes, event log and saved journal", async () => {
  const { beginLive, tickLive, skipLive } = await import("./live");
  const { setLineupPlayer, liveSide } = await import("./lineup");
  const { saveSlot, readSlot } = await import("./storage");
  const g = createGame("Alex", "England", 0, "Обычно", 2025, 51);
  beginLive(g);
  for (let i = 0; i < 45; i++) {
    tickLive(g);
    if (g.live!.status === "review") resolveVAR(g);
  }
  const side = liveSide(g);
  const ids = g.live!.lineups[side].filter(
    (id) => !g.live!.sentOff.includes(id),
  );
  const bench = g.live!.bench![side].slice(0, 6);
  const outgoing = ids.slice(0, 5);
  for (let i = 0; i < 5; i++) {
    setLineupPlayer(
      g,
      g.live!.lineups[side].indexOf(outgoing[i]),
      bench[i],
      true,
    );
    assert.equal(g.players.find((p) => p.id === bench[i])!.stats.apps, 1);
  }
  assert.equal(g.live!.substitutions!.filter((s) => s.side === side).length, 5);
  assert.equal(g.live!.events.filter((e) => e.type === "sub").length, 5);
  assert.throws(() => setLineupPlayer(g, 5, bench[5], true), /пяти замен/);
  assert.throws(
    () => setLineupPlayer(g, 1, outgoing[0], true),
    /не может вернуться/,
  );
  const data = new Map<string, string>();
  const old = globalThis.localStorage;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => data.set(k, v),
      removeItem: (k: string) => data.delete(k),
    },
  });
  try {
    saveSlot(1, g, true);
    const restored = readSlot(1)!;
    assert.ok(restored);
    assert.equal(restored.live!.substitutions!.length, 5);
    assert.deepEqual(
      restored.players.map((p) => p.stats),
      g.players.map((p) => p.stats),
    );
    skipLive(restored);
    for (const id of outgoing) assert.equal(restored.live!.minutes![id], 45);
    for (const id of bench.slice(0, 5))
      assert.ok(restored.live!.minutes![id] <= 45);
    assert.ok(validateSave(restored));
    assert.equal(new Set(restored.live!.lineups[side]).size, 11);
  } finally {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: old,
    });
  }
});
test("red-carded players cannot be replaced and a consecutive live game advances other fixtures", async () => {
  const { beginLive, skipLive } = await import("./live");
  const { setLineupPlayer, liveSide } = await import("./lineup");
  const g = createGame("Alex", "England", 0, "Обычно", 2025, 2);
  beginLive(g);
  g.live!.status = "paused";
  const side = liveSide(g);
  g.live!.sentOff.push(g.live!.lineups[side][1]);
  assert.throws(
    () => setLineupPlayer(g, 1, g.live!.bench![side][0], true),
    /Удалённого/,
  );
  skipLive(g);
  beginLive(g);
  assert.equal(g.round, 1);
  assert.equal(g.live!.minute, 0);
  assert.equal(g.matches.filter((m) => m.round === 0 && m.score).length, 48);
  assert.ok(validateSave(g));
});

test("real primary and secondary roles do not mix namesakes or mutate on a pitch swap", async () => {
  const { positionMultiplier } = await import("./tactics");
  const { setLineupPlayer } = await import("./lineup");
  const g = createGame("Alex", "England", 0, "Обычно", 2025, 12);
  const saka = g.players.find((p) => p.name === "Bukayo Saka")!;
  const onana = g.players.find((p) => p.name === "Amadou Onana")!;
  const martinez = g.players.find((p) => p.name === "Lisandro Martínez")!;
  assert.equal(saka.pos, "RW");
  assert.ok(saka.positions!.includes("RM"));
  assert.equal(onana.pos, "CDM");
  assert.equal(martinez.pos, "CB");
  assert.ok(martinez.positions!.includes("LB"));
  assert.ok(
    positionMultiplier(martinez, "LB") > positionMultiplier(martinez, "ST"),
  );
  const roles = JSON.stringify(saka.positions);
  setLineupPlayer(g, 7, saka.id);
  assert.equal(saka.pos, "RW");
  assert.equal(JSON.stringify(saka.positions), roles);
});
test("VAR confirms or cancels a goal atomically and preserves its decision through a save", async () => {
  const { beginLive, queueVAR, resolveVAR, tickLive } = await import("./live");
  const { encodeSave, decodeSave } = await import("./storage");
  const g = createGame("Alex", "England", 0, "Обычно", 2025, 3);
  beginLive(g);
  g.live!.minute = 12;
  const id = g.live!.lineups[0].find(
    (id) => g.players.find((p) => p.id === id)!.pos !== "GK",
  )!;
  queueVAR(g, "goal", 0, id);
  g.live!.pendingVAR!.decision = "cancel";
  const score = [...g.live!.score];
  tickLive(g);
  assert.equal(g.live!.minute, 12);
  const restored = decodeSave(encodeSave(g))!;
  assert.ok(restored);
  assert.equal(restored.live!.pendingVAR!.decision, "cancel");
  resolveVAR(restored);
  assert.deepEqual(restored.live!.score, score);
  assert.equal(restored.players.find((p) => p.id === id)!.stats.goals, 0);
  queueVAR(restored, "goal", 0, id);
  restored.live!.pendingVAR!.decision = "confirm";
  resolveVAR(restored);
  resolveVAR(restored);
  assert.equal(restored.live!.score[0], 1);
  assert.equal(restored.players.find((p) => p.id === id)!.stats.goals, 1);
  assert.equal(
    restored.live!.events.filter((e) => e.type === "goal").length,
    1,
  );
});
test("second yellow sends off, bans remain competition-specific and are served the next match", async () => {
  const { assignCard, banFor, serveBans } = await import("./discipline");
  const { beginLive } = await import("./live");
  const g = createGame("Alex", "England", 0, "Обычно", 2025, 19);
  beginLive(g);
  g.live!.minute = 15;
  const id = g.live!.lineups[0][3];
  assignCard(g, 0, id, "yellow");
  assignCard(g, 0, id, "yellow");
  assignCard(g, 0, id, "yellow");
  const p = g.players.find((p) => p.id === id)!;
  assert.equal(p.stats.yellow, 2);
  assert.equal(p.stats.red, 1);
  assert.equal(g.live!.sentOff.filter((pid) => pid === id).length, 1);
  assert.equal(banFor(p, "league"), 1);
  assert.equal(banFor(p, "ucl"), 0);
  serveBans(g, [id], "ucl");
  assert.equal(banFor(p, "league"), 1);
  serveBans(g, [id], "league");
  assert.equal(banFor(p, "league"), 0);
});
test("calendar simulates dates while match mode preserves own domestic and UCL fixtures", async () => {
  const { advanceCalendar, beginNextCareerMatch, careerDate } =
    await import("./calendar");
  const { skipLive } = await import("./live");
  const g = createGame("Alex", "England", 0, "Обычно", 2025, 1);
  g.careerMode = "calendar";
  advanceCalendar(g, 7);
  assert.equal(g.round, 2);
  assert.equal(careerDate(g), "2025-08-16");
  const manual = createGame("Alex", "England", 0, "Обычно", 2025, 1);
  manual.careerMode = "match";
  assert.throws(() => advanceCalendar(manual, 7), /каждый матч/);
  assert.throws(() => advance(manual, 1), /Сначала сыграйте/);
  for (let i = 0; i < 3; i++) {
    beginNextCareerMatch(manual);
    assert.equal(manual.live!.competition, "league");
    skipLive(manual);
  }
  beginNextCareerMatch(manual);
  assert.equal(manual.live!.competition, "ucl");
  skipLive(manual);
  beginNextCareerMatch(manual);
  assert.equal(manual.live!.competition, "league");
  assert.ok(validateSave(manual));
});
