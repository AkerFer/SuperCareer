import type { Stats, Match } from "./engine";
export type EuropeanStage =
  "league" | "playoff" | "r16" | "qf" | "sf" | "final" | "complete";
export interface Europe {
  season: number;
  teams: number[];
  stage: EuropeanStage;
  round: number;
  day: number;
  matches: Match[];
  qualified: number[];
  winner?: number;
}
export interface AwardNominee {
  id: number;
  name: string;
  club: string;
  score: number;
  photo?: string;
  detail: string;
}
export interface Award {
  id: string;
  title: string;
  category: "world" | "uefa" | "league" | "coach";
  winner: AwardNominee;
  nominees: AwardNominee[];
  formula: string;
  team?: AwardNominee[];
}
export interface SeasonAwards {
  season: number;
  awards: Award[];
  champions: number[];
  europeWinner?: number;
}
export interface CoachTotals {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  seasons: number;
}
export interface MatchEvent {
  minute: number;
  type: "goal" | "yellow" | "red" | "injury" | "sub" | "var";
  side: 0 | 1;
  player: number;
  assist?: number;
  text: string;
}
export interface PlayerBefore {
  id: number;
  stats: Stats;
}
export interface LiveMatch {
  matchId: number;
  competition: "league" | "domestic" | import("./world-types").ClubCupId;
  minute: number;
  status: "playing" | "halftime" | "paused" | "finished" | "review";
  score: [number, number];
  shots: [number, number];
  events: MatchEvent[];
  lineups: [number[], number[]];
  before: PlayerBefore[];
  sentOff: number[];
  bench?: [number[], number[]];
  substitutions?: { side: 0 | 1; out: number; in: number; minute: number }[];
  minutes?: Record<number, number>;
  conceded?: Record<number, number>;
  yellowCards?: Record<number, number>;
  bansAtStart?: number[];
  pendingVAR?: {
    kind: "goal" | "red";
    side: 0 | 1;
    player: number;
    assist?: number;
    reason: string;
    decision: "confirm" | "cancel" | "yellow";
  };
}
