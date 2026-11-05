import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  advance,
  nextSeason,
  calendar,
  validateSave,
  table,
} from "./engine";
import { seasonComplete, migrateGame, initializeEurope } from "./career";
import { allClubMatches } from "./continental";
import { beginLive, skipLive } from "./live";
import { advanceDomestic } from "./domestic";
import { marketValue } from "./pricing";
import { negotiate, signDeal } from "./market";
import { saveSlot, readSlot } from "./storage";
const make = () => createGame("Manager", "Spain", 21, "Обычно", 2025, 83);
test("nine leagues have complete calendars, MLS balanced 34 games and yearly draw changes", () => {
  const g = make();
  assert.equal(g.clubs.length, 180);
  for (const c of g.clubs) {
    const ms = g.matches.filter((m) => m.home === c.id || m.away === c.id);
    const n = g.clubs.filter((k) => k.league === c.league).length;
    assert.equal(ms.length, c.league === 5 ? 34 : (n - 1) * 2);
    assert.equal(ms.filter((m) => m.home === c.id).length, ms.length / 2);
    assert.equal(new Set(ms.map((m) => m.round)).size, ms.length);
  }
  const first = g.matches
    .filter((m) => m.home === g.club || m.away === g.club)
    .map((m) => [m.round, m.home, m.away]);
  const next = calendar(g.clubs, g)
    .filter((m) => m.home === g.club || m.away === g.club)
    .map((m) => [m.round, m.home, m.away]);
  assert.notDeepEqual(first, next);
  assert.ok(validateSave(g));
  assert.ok(g.europe!.teams.some((id) => g.clubs[id].league === 7));
  assert.ok(g.europe!.teams.some((id) => g.clubs[id].league === 8));
  assert.ok(
    g.europe!.teams.every((id) => ![5, 6].includes(g.clubs[id].league)),
  );
});
test("all domestic cups settle exactly once and preserve winner in next season", () => {
  const g = make();
  assert.equal(Object.keys(g.domestic!).length, 21);
  for (const c of Object.values(g.domestic!)) {
    let guard = 0;
    while (c.winner === undefined && guard++ < 8) advanceDomestic(g, c.key);
    assert.ok(c.winner !== undefined);
    assert.equal(g.domesticHistory!.filter((h) => h.key === c.key).length, 1);
    advanceDomestic(g, c.key);
    assert.equal(g.domesticHistory!.filter((h) => h.key === c.key).length, 1);
  }
  const goals = allClubMatches(g).reduce(
    (s, m) => s + (m.score?.[0] ?? 0) + (m.score?.[1] ?? 0),
    0,
  );
  assert.equal(
    goals,
    g.players.reduce((s, p) => s + p.stats.goals, 0),
  );
  const clubHistoryGoals = g.players.reduce(
    (sum, p) => sum + (p.clubHistory ?? []).reduce((s, r) => s + r.goals, 0),
    0,
  );
  assert.equal(clubHistoryGoals, goals);
  advance(g, 38);
  assert.ok(seasonComplete(g));
  const previous = g.domestic!["1-0"].winner!;
  nextSeason(g);
  const supercup = g.domestic!["1-1"];
  assert.ok(
    supercup.entrants.includes(previous) ||
      g.history[0].champions[1] === g.clubs[previous].name,
  );
  assert.ok(validateSave(g));
});
test("domestic interactive game saves and final outcome is applied", () => {
  const g = make();
  g.club = g.domestic!["0-2"].entrants[0];
  beginLive(g, "domestic");
  const m = allClubMatches(g).find((m) => m.id === g.live!.matchId)!;
  assert.equal(m.competition, "domestic");
  assert.ok(validateSave(g));
  skipLive(g);
  assert.ok(m.score);
  assert.ok(g.domestic![m.tournament!].winner !== undefined);
  assert.ok(validateSave(g));
});
test("pricing responds to age, ability and position; signed counteroffer conserves money", () => {
  const base = { rating: 90, potential: 94, age: 22, pos: "ST" };
  assert.ok(marketValue(base) > 100000000);
  assert.ok(marketValue({ ...base, age: 35 }) < 30000000);
  assert.ok(marketValue({ ...base, rating: 70, potential: 75 }) < 10000000);
  const g = make();
  g.clubs[g.club].budget = 1e9;
  const p = g.players.find((p) => p.club === 2)!;
  const before = g.clubs[g.club].budget + g.clubs[2].budget;
  negotiate(g, p.id, 1, p.salary);
  assert.equal(g.negotiation!.status, "counter");
  negotiate(g, p.id, g.negotiation!.counter, p.salary);
  signDeal(g);
  assert.equal(p.club, g.club);
  assert.equal(g.clubs[g.club].budget + g.clubs[2].budget, before);
});
test("legacy 96-club save expands without changing old fixture results", () => {
  const g = make();
  g.clubs = g.clubs.slice(0, 96);
  g.players = g.players.filter((p) => p.club === null || p.club < 96);
  g.matches = g.matches.filter((m) => m.league < 5);
  g.worldVersion = undefined;
  g.domestic = undefined;
  g.continental = undefined;
  initializeEurope(g);
  const m = g.matches[0];
  m.score = [2, 1];
  const id = m.id;
  migrateGame(g);
  assert.equal(g.clubs.length, 180);
  assert.deepEqual(g.matches.find((m) => m.id === id)!.score, [2, 1]);
  assert.equal(g.europe!.teams.length, 36);
  assert.ok(validateSave(g));
});
test("national goals are tracked separately from club history and statistics", async () => {
  const { createNationalCup, advanceNational } =
    await import("./international");
  const g = make();
  const clubGoals = g.players.reduce((s, p) => s + p.stats.goals, 0);
  const cup = createNationalCup("worldcup", 2026);
  let guard = 0;
  while (cup.stage !== "complete" && guard++ < 10) advanceNational(g, cup);
  assert.ok(g.players.some((p) => (p.nationalStats?.apps ?? 0) > 0));
  assert.ok(g.players.some((p) => (p.nationalStats?.goals ?? 0) > 0));
  assert.equal(
    g.players.reduce((s, p) => s + p.stats.goals, 0),
    clubGoals,
  );
  assert.ok(
    g.players
      .filter((p) => p.nationalStats)
      .every(
        (p) => p.nationalBySeason?.[g.season]?.goals === p.nationalStats!.goals,
      ),
  );
});
test("expanding an existing career preserves a purchased player and their statistics", () => {
  const g = make();
  const p = g.players.find((p) => p.name === "João Félix")!;
  assert.ok(p);
  p.club = 0;
  p.stats.goals = 3;
  g.transfers.push({
    name: p.name,
    from: "Chelsea",
    to: "Arsenal",
    fee: 70000000,
  });
  g.clubs = g.clubs.slice(0, 96);
  g.players = g.players.filter((p) => p.club === null || p.club < 96);
  g.matches = g.matches.filter((m) => m.league < 5);
  g.worldVersion = undefined;
  g.domestic = undefined;
  g.continental = undefined;
  initializeEurope(g);
  migrateGame(g);
  assert.equal(g.players.find((x) => x.id === p.id)!.club, 0);
  assert.equal(g.players.find((x) => x.id === p.id)!.stats.goals, 3);
  assert.ok(validateSave(g));
});
test("international trophies require participation and normalize national names", async () => {
  const { internationalTrophies } = await import("./career");
  const { createNationalCup } = await import("./international");
  const { emptyStats } = await import("./engine");
  const g = make();
  const cup = createNationalCup("worldcup", 2026);
  cup.winner = cup.teams.find((t) => t.name === "USA")!.id;
  g.international = [cup];
  const p = g.players.find((p) => p.nation === "United States")!;
  assert.ok(p);
  assert.equal(internationalTrophies(g, p).length, 0);
  p.nationalBySeason = { [g.season]: { ...emptyStats(), apps: 1 } };
  assert.equal(internationalTrophies(g, p).length, 1);
  p.nation = "France";
  assert.equal(internationalTrophies(g, p).length, 0);
});
