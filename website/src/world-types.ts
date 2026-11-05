import type { Match, Stats } from "./engine";
export type ClubCupId = "ucl" | "uel" | "uecl" | "supercup";
export type CupStage =
  "groups" | "r32" | "r16" | "qf" | "sf" | "final" | "complete";
export interface Cup {
  id: Exclude<ClubCupId, "ucl">;
  season: number;
  teams: number[];
  groups: number[][];
  stage: CupStage;
  round: number;
  day: number;
  matches: Match[];
  winner?: number;
  slots: number[];
}
export interface TrophyRecord {
  season: number;
  competition: ClubCupId;
  winner: number;
  runnerUp: number;
}
export interface NationalTeam {
  id: number;
  name: string;
  flag: string;
  strength: number;
  confederation: "UEFA" | "CONMEBOL" | "OTHER";
}
export interface NationalMatch {
  id: number;
  stage: CupStage;
  round: number;
  tie?: number;
  home: number;
  away: number;
  date: string;
  score?: [number, number];
  winner?: number;
  penalties?: [number, number];
  events?: string[];
}
export interface NationalCup {
  id: "worldcup" | "euro" | "copa";
  year: number;
  teams: NationalTeam[];
  groups: number[][];
  stage: CupStage;
  round: number;
  matches: NationalMatch[];
  winner?: number;
}
export interface Injury {
  kind: string;
  cause: "contact" | "overload";
  start: string;
  until: string;
  days: number;
}
export interface Loan {
  player: number;
  owner: number;
  club: number;
  end: string;
  fee: number;
  salaryShare: number;
}
export interface Negotiation {
  player: number;
  buyer: number;
  fee: number;
  salary: number;
  counter: number;
  round: number;
  status: "counter" | "club-agreed" | "signed";
  created: string;
}
export interface MarketSource {
  kind: "model" | "transfermarkt" | "eafc";
  source: string;
  date: string;
  edition?: string;
}
export interface InternationalRecord {
  competition: NationalCup["id"];
  year: number;
  winner: string;
  flag: string;
}
export type CompetitionStats = Partial<Record<ClubCupId, Stats>>;
