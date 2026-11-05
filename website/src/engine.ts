import { banFor, serveBans, type Competition } from "./discipline";
import { formationRows, roleFamily, positionMultiplier } from "./tactics";
import { validCareerFields } from "./validation";
import type {
  Europe,
  SeasonAwards,
  CoachTotals,
  LiveMatch,
  MatchEvent,
  EuropeanStage,
} from "./career-types";
import {
  initializeCareer,
  uefaQuota,
  initializeEurope,
  creditStatistics,
  advanceEuropeCalendar,
  seasonComplete,
  finalizeSeason,
  archiveCoachSeason,
  migrateGame,
} from "./career";
import { applyCardRatings } from "./fc-ratings";
import { applyRealDatabase } from "./database";
export const leagues = [
  "Premier League",
  "La Liga",
  "Serie A",
  "Bundesliga",
  "Ligue 1",
  "MLS",
  "Saudi Pro League",
  "Primeira Liga",
  "Süper Lig",
];
import { enrichWorld } from "./expand-world";
import { initializeDomestic, domesticCalendar } from "./domestic";
import extraLeagues from "./data/extra-leagues.json";
import { marketValue, refreshPrices } from "./pricing";
const teams = [
  "Arsenal,Aston Villa,Bournemouth,Brentford,Brighton,Chelsea,Crystal Palace,Everton,Fulham,Ipswich Town,Leicester City,Liverpool,Manchester City,Manchester United,Newcastle United,Nottingham Forest,Southampton,Tottenham,West Ham,Wolverhampton",
  "Real Madrid,Barcelona,Atlético Madrid,Athletic Club,Real Sociedad,Villarreal,Real Betis,Sevilla,Valencia,Osasuna,Celta Vigo,Getafe,Rayo Vallecano,Mallorca,Las Palmas,Girona,Alavés,Espanyol,Leganés,Valladolid",
  "Inter,Milan,Juventus,Napoli,Atalanta,Roma,Lazio,Fiorentina,Bologna,Torino,Genoa,Monza,Lecce,Udinese,Cagliari,Verona,Empoli,Parma,Como,Venezia",
  "Bayern Munich,Borussia Dortmund,Bayer Leverkusen,RB Leipzig,Eintracht Frankfurt,Stuttgart,Freiburg,Hoffenheim,Werder Bremen,Wolfsburg,Mainz,Augsburg,Union Berlin,Borussia Mönchengladbach,Bochum,Heidenheim,St. Pauli,Holstein Kiel",
  "Paris Saint-Germain,Marseille,Monaco,Lille,Lyon,Nice,Lens,Rennes,Strasbourg,Toulouse,Brest,Montpellier,Nantes,Reims,Le Havre,Auxerre,Angers,Saint-Étienne",
];
teams.push(...extraLeagues.map((l) => l.clubs.map((c) => c.name).join(",")));
export const positions = [
  "GK",
  "CB",
  "LB",
  "RB",
  "CDM",
  "CM",
  "CAM",
  "LW",
  "RW",
  "ST",
  "CF",
  "LM",
  "RM",
  "LWB",
  "RWB",
  "DF",
  "MF",
  "FW",
];
export interface Stats {
  goals: number;
  assists: number;
  apps: number;
  clean: number;
  yellow: number;
  red: number;
}
import type {
  Cup,
  TrophyRecord,
  ClubCupId,
  Loan,
  Negotiation,
  Injury,
  NationalCup,
  InternationalRecord,
  MarketSource,
} from "./world-types";
import {
  initializeContinental,
  advanceContinentalCalendar,
} from "./continental";
import {
  initializeInternationals,
  advanceInternationals,
} from "./international";
import { windowOpen, returnLoans } from "./market";
import { injure, recoverInjuries, injuryRisk } from "./injuries";
export interface Player {
  id: number;
  club: number | null;
  name: string;
  age: number;
  nation: string;
  pos: string;
  positions?: string[];
  positionSource?: string;
  positionRatings?: Record<string, number>;
  cardBaseRating?: number;
  suspension?: number;
  bans?: Partial<Record<"league" | "domestic" | ClubCupId, number>>;
  yellowCarryByCompetition?: Partial<
    Record<"league" | "domestic" | ClubCupId, number>
  >;
  yellowCarry?: number;
  rating: number;
  potential: number;
  value: number;
  valueSource?: MarketSource;
  ratingSource?: MarketSource;
  photoSource?: MarketSource;
  salary: number;
  contract: number;
  fitness: number;
  morale: number;
  injury: number;
  injuryDetail?: Injury;
  stats: Stats;
  career: Stats;
  clubHistory?: ({ season: number; club: number } & Stats)[];
  nationalStats?: Stats;
  nationalBySeason?: Record<number, Stats>;
  real?: boolean;
  ageEstimated?: boolean;
  photo?: string;
  source?: string;
  leagueStats?: Stats;
  leagueById?: Partial<Record<number, Stats>>;
  europeanStats?: Stats;
  ratingSum?: number;
  ratedApps?: number;
  trophies?: number;
  ballon?: number;
  seasonClubs?: number[];
}
export interface Club {
  id: number;
  name: string;
  league: number;
  budget: number;
  income: number;
  expenses: number;
  strength: number;
  lineup: number[];
  formation: string;
  style: string;
  captain: number | null;
  logo?: string;
}
export interface Match {
  id: number;
  league: number;
  round: number;
  home: number;
  away: number;
  score?: [number, number];
  events?: string[];
  shots?: [number, number];
  competition?: ClubCupId | "domestic";
  tournament?: string;
  date?: string;
  stage?: EuropeanStage | "groups" | "r32";
  tie?: number;
  winner?: number;
  penalties?: [number, number];
  timeline?: MatchEvent[];
}
export interface History {
  season: number;
  champions: string[];
  scorer: string;
  goals: number;
}
export interface Game {
  version: 1;
  manager: string;
  nation: string;
  difficulty: string;
  season: number;
  club: number;
  round: number;
  players: Player[];
  clubs: Club[];
  matches: Match[];
  history: History[];
  archive: Player[];
  transfers: { name: string; from: string; to: string; fee: number }[];
  news: string[];
  seed: number;
  edition?: 2;
  europe?: Europe;
  awards?: SeasonAwards[];
  coach?: CoachTotals;
  live?: LiveMatch;
  database?: string;
  rolesVersion?: 1;
  ratingsVersion?: 1;
  pricingVersion?: 2;
  worldVersion?: 1;
  lastLeagueOrder?: number[][];
  domestic?: Record<string, import("./domestic").DomesticCup>;
  domesticHistory?: {
    season: number;
    key: string;
    name: string;
    winner: number;
  }[];
  careerMode?: "calendar" | "match";
  calendarDay?: string;
  continental?: Partial<Record<"uel" | "uecl" | "supercup", Cup>>;
  cupHistory?: TrophyRecord[];
  international?: NationalCup[];
  internationalHistory?: InternationalRecord[];
  loans?: Loan[];
  negotiation?: Negotiation;
}
export const emptyStats = (): Stats => ({
  goals: 0,
  assists: 0,
  apps: 0,
  clean: 0,
  yellow: 0,
  red: 0,
});
const first = [
  "James",
  "Lucas",
  "Oliver",
  "Gabriel",
  "Theo",
  "Alex",
  "Marco",
  "Leo",
  "Hugo",
  "Adam",
  "Daniel",
  "Oscar",
  "Ethan",
  "Noah",
  "Victor",
  "Felix",
  "Max",
  "Liam",
  "Luis",
  "Nicolas",
];
const last = [
  "Wilson",
  "Martin",
  "Silva",
  "Garcia",
  "Rossi",
  "Müller",
  "Dubois",
  "Santos",
  "Walker",
  "Costa",
  "Bennett",
  "Moreau",
  "Romano",
  "Schmidt",
  "Alvarez",
  "Reed",
  "Petit",
  "Weber",
  "Ferrari",
  "Torres",
];
export function random(g: Game) {
  g.seed = (Math.imul(g.seed, 1664525) + 1013904223) >>> 0;
  return g.seed / 4294967296;
}
export function youth(g: Game, c: Club, id: number, initial = false): Player {
  const r = () => random(g);
  const rating = Math.max(
    40,
    Math.min(92, Math.round(c.strength - 12 + r() * 20)),
  );
  const player: Player = {
    id,
    club: c.id,
    name:
      first[Math.floor(r() * first.length)] +
      " " +
      last[Math.floor(r() * last.length)],
    age: initial ? 18 + Math.floor(r() * 17) : 17,
    pos: initial
      ? [
          "GK",
          "GK",
          "CB",
          "CB",
          "CB",
          "CB",
          "LB",
          "LB",
          "RB",
          "RB",
          "CDM",
          "CM",
          "CM",
          "CM",
          "CAM",
          "LW",
          "LW",
          "RW",
          "RW",
          "ST",
          "ST",
          "ST",
        ][id % 22]
      : positions[Math.floor(r() * 10)],
    nation: [
      "England",
      "Spain",
      "Italy",
      "Germany",
      "France",
      "Brazil",
      "Argentina",
    ][Math.floor(r() * 7)],
    rating: initial ? rating : Math.max(40, rating - 15),
    potential: Math.min(99, rating + Math.floor(r() * 14)),
    value: Math.round(Math.pow(rating / 10, 3) * 40000),
    salary: Math.round(rating * rating * 7),
    contract: 2 + Math.floor(r() * 4),
    fitness: 100,
    morale: 75,
    injury: 0,
    stats: emptyStats(),
    career: emptyStats(),
  };
  player.value = marketValue(player);
  return player;
}
export function calendar(clubs: Club[], game?: Game): Match[] {
  const out: Match[] = [];
  leagues.forEach((_, l) => {
    const ids = clubs.filter((c) => c.league === l).map((c) => c.id);
    if (game)
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(random(game) * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
    if (ids.length === 0) return;
    if (ids.length === 30) {
      const east = new Set([
        "Atlanta United",
        "CF Montréal",
        "Charlotte FC",
        "Chicago Fire",
        "Columbus Crew",
        "DC United",
        "FC Cincinnati",
        "Inter Miami",
        "Nashville SC",
        "New England Revolution",
        "New York City FC",
        "New York Red Bulls",
        "Orlando City SC",
        "Philadelphia Union",
        "Toronto FC",
      ]);
      const groups = [
        ids.filter((id) => east.has(clubs.find((c) => c.id === id)!.name)),
        ids.filter((id) => !east.has(clubs.find((c) => c.id === id)!.name)),
      ];
      for (const group of groups) {
        const ring = [...group, -1];
        for (let r = 0; r < 15; r++) {
          for (let i = 0; i < 8; i++) {
            const a = ring[i],
              b = ring[15 - i];
            if (a < 0 || b < 0) continue;
            const home = r % 2 ? a : b,
              away = r % 2 ? b : a;
            out.push({ id: out.length, league: l, round: r, home, away });
            out.push({
              id: out.length,
              league: l,
              round: r + 15,
              home: away,
              away: home,
            });
          }
          ring.splice(1, 0, ring.pop()!);
        }
      }
      for (let r = 0; r < 6; r++)
        for (let i = 0; i < 15; i++) {
          const a = groups[0][i],
            b = groups[1][(i + r) % 15];
          out.push({
            id: out.length,
            league: l,
            round: 30 + r,
            home: r % 2 ? a : b,
            away: r % 2 ? b : a,
          });
        }
      return;
    }
    const n = ids.length;
    for (let r = 0; r < n - 1; r++) {
      for (let i = 0; i < n / 2; i++) {
        const a = ids[i],
          b = ids[n - 1 - i];
        out.push({
          id: out.length,
          league: l,
          round: r,
          home: r % 2 ? a : b,
          away: r % 2 ? b : a,
        });
      }
      ids.splice(1, 0, ids.pop()!);
    }
    const firstLeg = out.filter((m) => m.league === l);
    firstLeg.forEach((m) =>
      out.push({
        id: out.length,
        league: l,
        round: m.round + n - 1,
        home: m.away,
        away: m.home,
      }),
    );
  });
  return out;
}
export function createGame(
  manager: string,
  nation: string,
  club: number,
  difficulty: string,
  season: number,
  seed = Date.now(),
): Game {
  const g: Game = {
    version: 1,
    manager,
    nation,
    club,
    difficulty,
    season,
    round: 0,
    players: [],
    clubs: [],
    matches: [],
    history: [],
    archive: [],
    transfers: [],
    news: [
      "Добро пожаловать! Составы и финансовые показатели — редактируемая игровая база, не официальные данные.",
    ],
    seed: seed >>> 0,
  };
  teams.forEach((row, l) =>
    row.split(",").forEach((name, i) =>
      g.clubs.push({
        id: g.clubs.length,
        name,
        league: l,
        strength: Math.max(61, 88 - i * 1.05),
        budget: Math.round((130 - i * 4) * 1e6),
        income: 0,
        expenses: 0,
        lineup: [],
        formation: "4-3-3",
        style: "Баланс",
        captain: null,
      }),
    ),
  );
  g.clubs.forEach((c) => {
    for (let j = 0; j < 22; j++)
      g.players.push(youth(g, c, g.players.length, true));
    autoLineup(g, c.id);
  });
  applyRealDatabase(g);
  for (const c of g.clubs.filter((c) => c.league >= 5)) {
    const data = extraLeagues[c.league - 5].clubs.find(
      (x) => x.name === c.name,
    )!;
    const ps = squad(g, c.id);
    data.players.forEach((r, i) => {
      const p = ps[i];
      if (!p) return;
      Object.assign(p, r, {
        pos: r.positions[0],
        real: true,
        ageEstimated: false,
        source: "FC 26 · 19.09.2025",
        ratingSource: {
          kind: "eafc",
          source: "https://github.com/ismailoksuz/EAFC26-DataHub",
          date: "2025-09-19",
          edition: "FC 26",
        },
      });
    });
    c.strength = Math.round(ps.reduce((s, p) => s + p.rating, 0) / ps.length);
    c.budget =
      c.league === 6 ? 100000000 : c.league === 5 ? 20000000 : 45000000;
  }

  g.rolesVersion = 1;
  applyCardRatings(g);
  refreshPrices(g);
  enrichWorld(g);
  g.clubs.forEach((c) => autoLineup(g, c.id));
  g.matches = calendar(g.clubs, g);
  initializeCareer(g);
  return g;
}
const playerCache = new WeakMap<
  Game,
  { array: Player[]; length: number; map: Map<number, Player> }
>();
export function playerById(g: Game, id: number): Player | undefined {
  let cached = playerCache.get(g);
  if (
    !cached ||
    cached.array !== g.players ||
    cached.length !== g.players.length
  ) {
    cached = {
      array: g.players,
      length: g.players.length,
      map: new Map(g.players.map((p) => [p.id, p])),
    };
    playerCache.set(g, cached);
  }
  return cached.map.get(id);
}
const rosterCache = new WeakMap<
  Game,
  { players: Player[]; length: number; clubs: Map<number, Player[]> }
>();
export function invalidateSquads(g: Game) {
  rosterCache.delete(g);
}
export function squad(g: Game, id: number) {
  let cached = rosterCache.get(g);
  if (
    !cached ||
    cached.players !== g.players ||
    cached.length !== g.players.length
  ) {
    const clubs = new Map<number, Player[]>();
    for (const p of g.players) {
      if (p.club === null) continue;
      const list = clubs.get(p.club);
      if (list) list.push(p);
      else clubs.set(p.club, [p]);
    }
    cached = { players: g.players, length: g.players.length, clubs };
    rosterCache.set(g, cached);
  }
  return [...(cached.clubs.get(id) ?? [])];
}
export function autoLineup(
  g: Game,
  id: number,
  competition: Competition = "league",
) {
  const c = g.clubs[id];
  const ps = squad(g, id).filter((p) => !p.injury && !banFor(p, competition));
  const picked: Player[] = [];
  for (const pos of formationRows(c.formation).flat()) {
    let candidates = ps.filter((p) => !picked.includes(p));
    if (pos === "GK" && candidates.some((p) => p.pos === "GK"))
      candidates = candidates.filter((p) => p.pos === "GK");
    else if (pos !== "GK" && candidates.some((p) => p.pos !== "GK"))
      candidates = candidates.filter((p) => p.pos !== "GK");
    const score = (p: Player) =>
      p.rating * (0.6 + p.fitness / 250) * positionMultiplier(p, pos);
    candidates.sort((a, b) => score(b) - score(a) || a.id - b.id);
    if (candidates[0]) picked.push(candidates[0]);
  }
  c.lineup = picked.map((p) => p.id);
  if (c.captain === null || !c.lineup.includes(c.captain))
    c.captain =
      c.lineup.find((id) => playerById(g, id)?.pos !== "GK") ??
      c.lineup[0] ??
      null;
}
export function table(g: Game, l: number) {
  return g.clubs
    .filter((c) => c.league === l)
    .map((c) => {
      let w = 0,
        d = 0,
        loss = 0,
        gf = 0,
        ga = 0;
      g.matches
        .filter(
          (m) =>
            m.league === l && m.score && (m.home === c.id || m.away === c.id),
        )
        .forEach((m) => {
          const [a, b] =
            m.home === c.id ? m.score! : [m.score![1], m.score![0]];
          gf += a;
          ga += b;
          if (a > b) w++;
          else if (a === b) d++;
          else loss++;
        });
      return {
        club: c,
        w,
        d,
        loss,
        gf,
        ga,
        pts: w * 3 + d,
        played: w + d + loss,
      };
    })
    .sort(
      (a, b) =>
        b.pts - a.pts ||
        b.gf - b.ga - (a.gf - a.ga) ||
        b.gf - a.gf ||
        a.club.name.localeCompare(b.club.name),
    );
}
function poisson(g: Game, lambda: number) {
  let p = 1,
    k = 0;
  do {
    k++;
    p *= random(g);
  } while (p > Math.exp(-lambda) && k < 10);
  return k - 1;
}
export function playMatch(g: Game, m: Match) {
  if (m.score) return;
  const competition = m.competition ?? "league";
  const banned = [...squad(g, m.home), ...squad(g, m.away)]
    .filter(
      (p) =>
        (p.club === m.home || p.club === m.away) && banFor(p, competition) > 0,
    )
    .map((p) => p.id);
  const cs = [g.clubs[m.home], g.clubs[m.away]];
  const sides = cs.map((c) => {
    let ps = c.lineup
      .map((id) => playerById(g, id)!)
      .filter(
        (p) => p && p.club === c.id && !p.injury && !banFor(p, competition),
      );
    if (ps.length < 11) {
      autoLineup(g, c.id, competition);
      ps = c.lineup.map((id) => playerById(g, id)!);
    }
    return ps;
  });
  const before = sides.flat().map((p) => ({ id: p.id, stats: { ...p.stats } }));
  const power = sides.map(
    (ps, side) =>
      ps.reduce(
        (s, p, index) =>
          s +
          p.rating *
            (0.65 + p.fitness / 285) *
            (0.9 + p.morale / 750) *
            positionMultiplier(
              p,
              formationRows(cs[side].formation).flat()[index] ?? p.pos,
            ),
        0,
      ) / 11,
  );
  const scores = cs.map((c, i) => {
    const difficulty =
      c.id === g.club
        ? g.difficulty === "Сложно"
          ? 0.87
          : g.difficulty === "Легко"
            ? 1.14
            : 1
        : 1;
    const attack = c.style === "Атака" ? 1.25 : c.style === "Оборона" ? 0.8 : 1;
    const opponent =
      cs[1 - i].style === "Атака"
        ? 1.15
        : cs[1 - i].style === "Оборона"
          ? 0.85
          : 1;
    return poisson(
      g,
      Math.max(
        0.15,
        1.25 *
          Math.exp((power[i] - power[1 - i]) / 25) *
          (i === 0 ? 1.18 : 1) *
          attack *
          opponent *
          difficulty,
      ),
    );
  }) as [number, number];
  m.score = scores;
  m.events = [];
  m.shots = scores.map((x) => x + 3 + Math.floor(random(g) * 10)) as [
    number,
    number,
  ];
  sides.forEach((ps, i) => {
    ps.forEach((p) => {
      p.stats.apps++;
      p.fitness = Math.max(30, p.fitness - 7 - Math.floor(random(g) * 8));
      p.morale = Math.max(
        20,
        Math.min(100, p.morale + (scores[i] > scores[1 - i] ? 3 : -1)),
      );
      if (p.pos === "GK" && scores[1 - i] === 0) p.stats.clean++;
      if (random(g) < 0.12) {
        p.stats.yellow++;
        p.yellowCarryByCompetition ??= { league: 0, ucl: 0 };
        p.bans ??= { league: 0, ucl: 0 };
        if (
          (p.yellowCarryByCompetition[competition] =
            (p.yellowCarryByCompetition[competition] ?? 0) + 1) >= 5
        ) {
          p.yellowCarryByCompetition[competition] = 0;
          p.bans[competition] = Math.max(p.bans[competition] ?? 0, 1);
        }
        m.events!.push(
          `${5 + Math.floor(random(g) * 85)}′ ${p.name} — жёлтая карточка`,
        );
      }
      if (random(g) < 0.008) {
        p.stats.red++;
        p.bans ??= { league: 0, ucl: 0 };
        p.bans[competition] = Math.max(p.bans[competition] ?? 0, 3);
        m.events!.push(
          `${20 + Math.floor(random(g) * 70)}′ ${p.name} — красная карточка`,
        );
      }
      if (random(g) < injuryRisk(p)) {
        injure(g, p, m.date);
        m.events!.push(
          `${10 + Math.floor(random(g) * 80)}′ ${p.name} — ${p.injuryDetail?.kind} (${p.injuryDetail?.days} дн.)`,
        );
      }
    });
    for (let j = 0; j < scores[i]; j++) {
      const weighted = ps.flatMap(
        (p) =>
          Array(
            ["ST", "CF", "FW"].includes(p.pos)
              ? 7
              : ["LW", "RW", "CAM"].includes(p.pos)
                ? 4
                : p.pos === "GK"
                  ? 0
                  : 1,
          ).fill(p) as Player[],
      );
      if (!weighted.length) continue;
      const scorer = weighted[Math.floor(random(g) * weighted.length)];
      scorer.stats.goals++;
      const assists = ps.filter((p) => p !== scorer && p.pos !== "GK");
      let assist = "";
      if (assists.length && random(g) < 0.8) {
        const p = assists[Math.floor(random(g) * assists.length)];
        p.stats.assists++;
        assist = ` (пас: ${p.name})`;
      }
      m.events!.push(
        `${1 + Math.floor(random(g) * 90)}′ ${scorer.name} — ГОЛ${assist}`,
      );
    }
  });
  m.events.sort((a, b) => parseInt(a) - parseInt(b));
  cs[0].budget += 750000;
  cs[0].income += 750000;
  serveBans(g, banned, competition);
  creditStatistics(g, m, before);
}
export function advance(
  g: Game,
  count = 1,
  onlyOwn = false,
  throughDate?: string,
) {
  migrateGame(g);
  if (g.live && g.live.status !== "finished")
    throw Error("Сначала завершите текущий матч");
  for (let n = 0; n < count && g.round < 38; n++) {
    const fixtures = g.matches.filter((m) => m.round === g.round);
    if (!fixtures.length) {
      g.round++;
      continue;
    }
    if (
      g.careerMode === "match" &&
      fixtures.some((m) => !m.score && (m.home === g.club || m.away === g.club))
    )
      throw Error("Сначала сыграйте матч клуба в центре матча");
    if (onlyOwn) {
      const own = fixtures.find(
        (m) => !m.score && (m.home === g.club || m.away === g.club),
      );
      if (own) {
        playMatch(g, own);
        return;
      }
    }
    fixtures.forEach((m) => playMatch(g, m));
    g.players.forEach((p) => {
      p.fitness = Math.min(100, p.fitness + 9);
      if (!p.injuryDetail) p.injury = Math.max(0, p.injury - 1);
    });
    g.clubs.forEach((c) => {
      const wages = squad(g, c.id).reduce((s, p) => s + p.salary, 0);
      c.budget -= wages;
      c.expenses += wages;
    });
    g.round++;
    g.calendarDay = new Date(Date.UTC(g.season, 7, 9 + g.round * 7))
      .toISOString()
      .slice(0, 10);
    recoverInjuries(g, g.calendarDay);
    returnLoans(g, g.calendarDay);
    if (g.round % 5 === 0) aiTransfer(g);
    advanceEuropeCalendar(g, throughDate);
    advanceContinentalCalendar(g, throughDate);
    domesticCalendar(g, throughDate);
    if (g.round === 38) advanceInternationals(g, throughDate);
    if (seasonComplete(g)) finalizeSeason(g);
  }
}
export function transfer(
  g: Game,
  id: number,
  buyer: number,
  fee: number,
  salary: number,
) {
  if (g.live && g.live.status !== "finished")
    throw Error("Сначала завершите текущий матч");
  const p = g.players.find((p) => p.id === id);
  if (!p) throw Error("Игрок не найден");
  if (p.club !== null && !windowOpen(g))
    throw Error("Трансферное окно закрыто");
  if (g.loans?.some((l) => l.player === id))
    throw Error("Игрок находится в аренде");
  if (p.club === buyer) throw Error("Игрок уже в клубе");
  if (
    !Number.isFinite(fee) ||
    fee < 0 ||
    !Number.isFinite(salary) ||
    salary < 0
  )
    throw Error("Неверная сумма");
  if (g.clubs[buyer].budget < fee) throw Error("Недостаточно средств");
  if (fee < p.value * 0.85 && p.club !== null)
    throw Error("Клуб требует минимум 85% стоимости");
  if (salary < p.salary) throw Error("Игрок требует зарплату не ниже текущей");
  const old = p.club;
  if (old !== null && squad(g, old).length <= 16)
    throw Error("Клуб не готов отпускать игрока: мало футболистов");
  g.clubs[buyer].budget -= fee;
  g.clubs[buyer].expenses += fee;
  if (old !== null) {
    g.clubs[old].budget += fee;
    g.clubs[old].income += fee;
  }
  g.transfers.unshift({
    name: p.name,
    from: old === null ? "Free agent" : g.clubs[old].name,
    to: g.clubs[buyer].name,
    fee,
  });
  p.club = buyer;
  invalidateSquads(g);
  p.salary = salary;
  p.contract = 4;
  if (old !== null) autoLineup(g, old);
  autoLineup(g, buyer);
}
function aiTransfer(g: Game) {
  if (!windowOpen(g)) return;
  for (let i = 0; i < 8; i++) {
    const buyer = g.clubs[Math.floor(random(g) * g.clubs.length)];
    if (buyer.id === g.club) continue;
    const ps = g.players.filter(
      (p) =>
        p.club !== buyer.id &&
        p.club !== g.club &&
        p.value < buyer.budget * 0.3,
    );
    const p = ps[Math.floor(random(g) * ps.length)];
    if (p)
      try {
        transfer(g, p.id, buyer.id, p.value, p.salary);
      } catch {
        /* clubs may refuse */
      }
  }
}
export function nextSeason(g: Game) {
  migrateGame(g);
  if (g.live && g.live.status !== "finished")
    throw Error("Сначала завершите текущий матч");
  if (g.matches.some((m) => !m.score))
    throw Error("Сначала завершите все матчи сезона");
  if (Object.values(g.continental ?? {}).some((c) => c.stage !== "complete"))
    throw Error("Завершите остальные еврокубки");
  if (g.europe?.stage !== "complete")
    throw Error("Сначала завершите Лигу чемпионов");
  finalizeSeason(g);
  returnLoans(g, `${g.season + 1}-07-01`);
  archiveCoachSeason(g);
  const nextQualifiers = leagues.flatMap((_, l) =>
    table(g, l)
      .slice(0, uefaQuota(g, l))
      .map((r) => r.club.id),
  );
  g.lastLeagueOrder = leagues.map((_, l) => table(g, l).map((r) => r.club.id));
  const champions = leagues
    .filter((_, l) => g.clubs.some((c) => c.league === l))
    .map((_, l) => table(g, l)[0].club);
  const top = [...g.players].sort((a, b) => b.stats.goals - a.stats.goals)[0];
  g.history.unshift({
    season: g.season,
    champions: champions.map((c) => c.name),
    scorer: top.name,
    goals: top.stats.goals,
  });
  g.clubs.forEach((c) => {
    const rank = table(g, c.league).findIndex((r) => r.club.id === c.id);
    const income =
      35000000 + (20 - rank) * 2000000 + (champions.includes(c) ? 15000000 : 0);
    c.budget += income;
    c.income = income;
    c.expenses = 0;
  });
  g.players.forEach((p) => {
    (Object.keys(p.stats) as (keyof Stats)[]).forEach(
      (k) => (p.career[k] += p.stats[k]),
    );
    p.rating = Math.max(
      30,
      Math.min(
        p.potential,
        p.rating + (p.age < 25 && p.stats.apps > 10 ? 2 : p.age > 30 ? -2 : 0),
      ),
    );
    p.age++;
    p.contract--;
    p.valueSource = undefined;
    p.ratingSource = undefined;
    p.value = marketValue(p);
    p.stats = emptyStats();
    p.yellowCarryByCompetition = { league: 0, ucl: 0 };
    p.leagueById = {};
    p.leagueStats = emptyStats();
    p.europeanStats = emptyStats();
    p.ratingSum = 0;
    p.ratedApps = 0;
    p.seasonClubs = [];
    p.fitness = 100;
    if (!p.injuryDetail) p.injury = 0;
    if (p.contract <= 0) p.club = null;
  });
  g.archive = g.archive.concat(g.players.filter((p) => p.age >= 38));
  g.players = g.players.filter((p) => p.age < 38);
  let id =
    Math.max(...g.players.map((p) => p.id), ...g.archive.map((p) => p.id)) + 1;
  const rosterCounts = new Map<number, number>();
  for (const p of g.players)
    if (p.club !== null)
      rosterCounts.set(p.club, (rosterCounts.get(p.club) ?? 0) + 1);
  for (const c of g.clubs) {
    const missing = Math.max(0, 22 - (rosterCounts.get(c.id) ?? 0));
    for (let i = 0; i < missing; i++) g.players.push(youth(g, c, id++));
  }
  invalidateSquads(g);
  g.clubs.forEach((c) => autoLineup(g, c.id));
  g.season++;
  g.round = 0;
  recoverInjuries(g, `${g.season}-08-09`);
  g.calendarDay = undefined;
  g.matches = calendar(g.clubs, g);
  g.live = undefined;
  initializeEurope(g, nextQualifiers);
  initializeContinental(g);
  const previousDomestic = g.domestic;
  initializeDomestic(g, previousDomestic);
  initializeInternationals(g);
  g.news.unshift(
    `Сезон ${g.season}: клуб получил телеправа и спонсорские выплаты. Контракты истекли, академии выпустили новых игроков.`,
  );
  aiTransfer(g);
}
export function validateSave(x: unknown): x is Game {
  try {
    const g = x as Game;
    if (
      g.version !== 1 ||
      !Array.isArray(g.clubs) ||
      ![96, 180].includes(g.clubs.length) ||
      !Array.isArray(g.players) ||
      !Array.isArray(g.matches) ||
      !Array.isArray(g.history) ||
      !Array.isArray(g.archive) ||
      !Array.isArray(g.transfers) ||
      !Array.isArray(g.news)
    )
      return false;
    if (
      !Number.isInteger(g.club) ||
      !g.clubs[g.club] ||
      !Number.isInteger(g.round) ||
      g.round < 0 ||
      g.round > 38 ||
      !Number.isFinite(g.seed) ||
      !Number.isInteger(g.season)
    )
      return false;
    const ids = new Set(g.players.map((p) => p.id));
    return (
      validCareerFields(g) &&
      ids.size === g.players.length &&
      g.players.every(
        (p) =>
          typeof p.name === "string" &&
          positions.includes(p.pos) &&
          Number.isFinite(p.rating) &&
          p.rating >= 1 &&
          p.rating <= 99 &&
          Number.isFinite(p.value) &&
          p.value >= 0 &&
          Number.isFinite(p.salary) &&
          p.salary >= 0 &&
          (p.club === null || !!g.clubs[p.club]) &&
          p.stats &&
          p.career &&
          Object.values(p.stats).every(Number.isFinite),
      ) &&
      g.clubs.every(
        (c, i) =>
          c.id === i &&
          typeof c.name === "string" &&
          Number.isFinite(c.budget) &&
          Array.isArray(c.lineup) &&
          c.lineup.every((id) => ids.has(id)),
      ) &&
      g.matches.every(
        (m) =>
          !!g.clubs[m.home] &&
          !!g.clubs[m.away] &&
          Number.isInteger(m.round) &&
          (!m.score ||
            (m.score.length === 2 &&
              m.score.every((n) => Number.isInteger(n) && n >= 0))),
      )
    );
  } catch {
    return false;
  }
}
