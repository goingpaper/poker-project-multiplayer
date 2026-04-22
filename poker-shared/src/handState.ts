import type { TablePublicMeta } from "./session.js";

export type PlayerId = string;

export type PlayerStacks = Record<PlayerId, number>;

/** Shown briefly after a hand completes; cleared when the next action is taken. */
export interface LastHandResult {
  potAmount: number;
  /** Hold'em/Omaha: winning 5-card description; fold: short text. */
  description: string;
  split: boolean;
  /** Single winner; null when split. */
  winnerId: PlayerId | null;
  reveal: {
    board: string[];
    playerHands: Record<PlayerId, string[]>;
  };
}

/** Completed hand, stored for the session (see `HandHistoryPanel` / `handHistory` socket). */
export type HandHistoryEntry = LastHandResult & {
  handNumber: number;
};

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
  /**
   * `plhe_hu_aces` only: which player was dealt pocket aces this hand (alternates each hand).
   * Omitted or null for other variants.
   */
  acesPlayerId?: PlayerId | null;
  /** Summary of the hand that just finished (new hand is already dealt). */
  lastHandResult?: LastHandResult;
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
