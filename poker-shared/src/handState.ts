import type { TablePublicMeta } from "./session.js";

export type PlayerId = string;

export type PlayerStacks = Record<PlayerId, number>;

/** In play or showdown; emitted as JSON to clients. */
export interface ActiveHandState {
  potSize: number;
  playerTurn: PlayerId;
  boardTurn: number;
  board: string[];
  playerHands: Record<PlayerId, string[]>;
  playerStacks: PlayerStacks;
  currentTurnBets: PlayerStacks;
  buttonPlayer: PlayerId;
  bigBlindPlayer: PlayerId;
  lastRaiser: PlayerId | null;
  winner: PlayerId | null;
  /** Table rules (variant, format, blinds). Omitted only in legacy snapshots. */
  table?: TablePublicMeta;
  /** Legal raise-to total for the current actor (this street). Helps PL-OMA clients cap the slider. */
  currentMaxRaiseTo?: number;
}

/** Someone busted — minimal payload. */
export interface GameOverState {
  playerStacks: PlayerStacks;
  gameWinner: PlayerId;
}

export type HandSnapshot = ActiveHandState | GameOverState;

export function isGameOver(s: HandSnapshot): s is GameOverState {
  return "gameWinner" in s && !("boardTurn" in s);
}
