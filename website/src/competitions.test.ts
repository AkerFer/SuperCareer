import { uefaQuota } from "./career";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  advance,
  nextSeason,
  transfer,
  validateSave,
} from "./engine";
import {
  allClubMatches,
  advanceCup,
  resultForClub,
  matchDate,
} from "./continental";
import { completeSeason, migrateGame, seasonComplete } from "./career";
import { advanceCalendar } from "./calendar";
import {
  windowOpen,
  loanPlayer,
  returnLoans,
  negotiate,
  signDeal,
} from "./market";
import { beginLive, skipLive } from "./live";
import { injure, recoverInjuries } from "./injuries";
import { createNationalCup, advanceNational } from "./international";
import { importPlayerData, parseCSV } from "./external-data";
const game = () => createGame("Coach", "Spain", 21, "Обычно", 2025, 72);
test("continental fields migrate old saves and qualifiers do not overlap", () => {
  const g = game();
  delete g.continental;
  delete g.international;
  migrateGame(g);
  const ids = [
    ...g.europe!.teams,
    ...g.continental!.uel!.teams,
    ...g.continental!.uecl!.teams,
  ];
  assert.equal(ids.length, 92);
  assert.equal(new Set(ids).size, 92);
  assert.equal(g.international![0].id, "worldcup");
  assert.ok(validateSave(g));
});
test("UEL and Conference resolve groups, two-leg knockout and history once", () => {
  const g = game();
  for (const c of Object.values(g.continental!)) {
    let guard = 0;
    while (c.stage !== "complete" && guard++ < 15) advanceCup(g, c.id);
    assert.equal(c.stage, "complete");
    if (c.id !== "supercup") {
      assert.ok(c.teams.includes(c.winner!));
      assert.equal(
        g.cupHistory!.filter((h) => h.competition === c.id).length,
        1,
      );
    }
  }
  const goals = allClubMatches(g).reduce(
    (sum, m) => sum + (m.score?.[0] ?? 0) + (m.score?.[1] ?? 0),
    0,
  );
  assert.equal(
    g.players.reduce((s, p) => s + p.stats.goals, 0),
    goals,
  );
  assert.equal(
    g.players.reduce((s, p) => s + (p.leagueStats?.goals ?? 0), 0),
    0,
  );
  assert.equal(
    g.players.reduce((s, p) => s + (p.europeanStats?.goals ?? 0), 0),
    0,
  );
});
test("all club competitions and summer tournament finish before rollover and Super Cup has previous winners", () => {
  const g = game();
  advance(g, 38);
  completeSeason(g);
  assert.ok(seasonComplete(g));
  const cl = g.europe!.winner!,
    el = g.continental!.uel!.winner!;
  assert.equal(g.international![0].stage, "complete");
  assert.equal(g.awards!.length, 1);
  nextSeason(g);
  assert.deepEqual(g.continental!.supercup!.teams, [cl, el]);
  assert.equal(g.international!.length, 0);
  assert.ok(validateSave(g));
});
test("calendar horizon does not simulate future UCL and result colors use club perspective", () => {
  const g = game();
  advanceCalendar(g, 14);
  const date = g.calendarDay!;
  assert.ok(
    g
      .europe!.matches.filter((m) => m.score)
      .every((m) => matchDate(g, m) <= date),
  );
  const m = {
    id: 1,
    home: 0,
    away: 1,
    round: 0,
    league: 0,
    score: [1, 3] as [number, number],
  };
  assert.equal(resultForClub(m, 0), "loss");
  assert.equal(resultForClub(m, 1), "win");
  m.score = [2, 2];
  assert.equal(resultForClub(m, 0), "draw");
});
test("date windows, free agents, negotiations, loans and atomic failure", () => {
  const g = game();
  const p = g.players.find((p) => p.club === 3)!;
  g.calendarDay = "2025-10-01";
  assert.equal(windowOpen(g), false);
  assert.throws(() => transfer(g, p.id, g.club, p.value, p.salary), /закрыто/);
  const f = g.players.find((p) => p.club === null) ?? g.players.at(-1)!;
  f.club = null;
  transfer(g, f.id, g.club, 0, f.salary);
  assert.equal(f.club, g.club);
  g.calendarDay = "2026-01-15";
  g.clubs[g.club].budget = 1e9;
  negotiate(g, p.id, 0, p.salary);
  assert.equal(g.negotiation!.status, "counter");
  negotiate(g, p.id, g.negotiation!.counter, p.salary);
  signDeal(g);
  assert.equal(p.club, g.club);
  const loanee = g.players.find((p) => p.club === 4)!;
  const owner = loanee.club!;
  loanPlayer(g, loanee.id, g.club, Math.round(loanee.value * 0.05));
  assert.equal(loanee.club, g.club);
  assert.throws(
    () => transfer(g, loanee.id, 2, loanee.value, loanee.salary),
    /аренде/,
  );
  returnLoans(g, "2026-07-01");
  assert.equal(loanee.club, owner);
  assert.equal(g.loans!.length, 0);
});
test("UEL live fixture can persist, finish and settle without changing domestic stats", () => {
  const g = game();
  const c = g.continental!.uel!;
  g.club = c.teams[0];
  beginLive(g, "uel");
  assert.ok(validateSave(g));
  skipLive(g);
  assert.equal(g.live!.status, "finished");
  assert.ok(validateSave(g));
  assert.ok(c.matches.some((m) => m.id === g.live!.matchId && m.score));
  assert.equal(
    g.players.reduce((s, p) => s + (p.leagueStats?.goals ?? 0), 0),
    0,
  );
});
test("injuries have dated recovery and do not recover before deadline", () => {
  const g = game(),
    p = g.players[0];
  injure(g, p, "2025-08-09");
  const until = p.injuryDetail!.until;
  assert.ok(p.injury > 0);
  recoverInjuries(g, "2025-08-09");
  assert.ok(p.injury > 0);
  recoverInjuries(g, until);
  assert.equal(p.injury, 0);
  assert.equal(p.injuryDetail, undefined);
});
test("all national formats resolve to a unique winner", () => {
  for (const id of ["worldcup", "euro", "copa"] as const) {
    const g = game(),
      c = createNationalCup(id, id === "worldcup" ? 2026 : 2028);
    assert.equal(
      c.teams.length,
      id === "worldcup" ? 48 : id === "euro" ? 24 : 16,
    );
    let guard = 0;
    while (c.stage !== "complete" && guard++ < 10) advanceNational(g, c);
    assert.equal(c.stage, "complete");
    assert.ok(c.winner !== undefined);
    assert.equal(c.matches.filter((m) => m.stage === "final").length, 1);
    assert.equal(g.internationalHistory!.length, 1);
  }
});
test("external CSV is quoted correctly and applies factual source metadata only on exact names", () => {
  assert.equal(
    parseCSV('name,positions\n"Test, Player","CM, CAM"')[0].name,
    "Test, Player",
  );
  const g = game(),
    p = g.players.find((p) => p.real)!;
  const csv = `name,market_value_in_eur,image_url\n"${p.name}",12345678,https://example.org/player.png`;
  importPlayerData(
    g,
    csv,
    "transfermarkt",
    "2026-11-05",
    "https://example.org/dataset",
  );
  assert.equal(p.value, 12345678);
  assert.equal(p.valueSource!.kind, "transfermarkt");
  assert.equal(p.photo, "https://example.org/player.png");
  assert.throws(
    () =>
      importPlayerData(
        g,
        "name,overall\nUnknown,90",
        "eafc",
        "2026-11-05",
        "https://example.org/dataset",
      ),
    /совпадений/,
  );
});

test("deleting one career removes snapshot and live journal without affecting other slots", async () => {
  const { deleteSlot } = await import("./storage");
  const old = globalThis.localStorage;
  const data = new Map([
    ["fl-slot-1", "snapshot"],
    ["fl-live-1", "journal"],
    ["fl-slot-2", "other"],
  ]);
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { removeItem: (k: string) => data.delete(k) },
  });
  try {
    deleteSlot(1);
    assert.equal(data.has("fl-slot-1"), false);
    assert.equal(data.has("fl-live-1"), false);
    assert.equal(data.get("fl-slot-2"), "other");
    assert.throws(() => deleteSlot(4), /слот/);
  } finally {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: old,
    });
  }
});
test("FC 26 card OVR is sourced and position score changes without mutating the card", async () => {
  const { effectiveRating } = await import("./tactics");
  const g = game(),
    p = g.players.find((p) => p.name === "Jude Bellingham")!;
  assert.equal(p.rating, 90);
  assert.equal(p.ratingSource!.date, "2025-09-19");
  assert.equal(effectiveRating(p, "CAM"), 90);
  assert.equal(effectiveRating(p, "CM"), 92);
  assert.ok(effectiveRating(p, "GK") < 30);
  assert.equal(p.pos, "CAM");
});
test("live frame copies only mutable teams and fully isolates the final minute", async () => {
  const { cloneLiveFrame, tickLive } = await import("./live");
  const g = game();
  beginLive(g);
  const before = JSON.stringify(g);
  const next = cloneLiveFrame(g, 1);
  tickLive(next);
  assert.equal(JSON.stringify(g), before);
  assert.equal(next.live!.minute, 1);
  const m = allClubMatches(g).find((m) => m.id === g.live!.matchId)!;
  const outsider = g.players.find(
    (p) => p.club !== m.home && p.club !== m.away,
  )!;
  assert.equal(
    next.players.find((p) => p.id === outsider.id),
    outsider,
  );
  assert.notEqual(
    cloneLiveFrame(g, 90).players.find((p) => p.id === outsider.id),
    outsider,
  );
});
test("old completed UCL save migrates its champion without awarding prize money twice", () => {
  const g = game();
  g.europe!.stage = "complete";
  g.europe!.winner = 0;
  g.europe!.matches.push({
    id: 199999,
    league: -1,
    round: 0,
    competition: "ucl",
    stage: "final",
    home: 0,
    away: 1,
    score: [2, 1],
  });
  delete g.continental;
  delete g.cupHistory;
  const budget = g.clubs[0].budget;
  migrateGame(g);
  assert.equal(g.cupHistory!.find((t) => t.competition === "ucl")!.winner, 0);
  assert.equal(g.clubs[0].budget, budget);
});
