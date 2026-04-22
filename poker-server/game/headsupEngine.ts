import type {
  ActiveHandState,
  HandHistoryEntry,
  HandSnapshot,
  LastHandResult,
  PlayerId,
} from "poker-shared";
import { isGameOver } from "poker-shared";
import { CALL, CHECK, FOLD, RAISE } from "../constants.js";
import dealNewHand, { type DealHandOptions } from "../util/createhand.js";
import resolveShowdownWinners from "../util/showdown.js";
import type { EngineAction } from "./playerAction.js";
import { computeCurrentMaxRaiseTo, computeMinRaiseToTotal } from "./betting.js";

const MAX_HAND_HISTORY = 50;

export type ApplyActionResult =
  | { ok: true; snapshot: HandSnapshot; handHistoryEntry?: HandHistoryEntry }
  | {
      ok: false;
      reason:
        | "no_hand"
        | "game_over"
        | "not_your_turn"
        | "no_opponent"
        | "unknown_action"
        | "invalid_raise";
    };

function opponentOf(players: Record<string, unknown>, playerId: PlayerId): PlayerId | undefined {
  return Object.keys(players).find((id) => id !== playerId);
}

function solvedHandLabel(h: { descr?: string; name?: string }): string {
  return h.descr || h.name || "Showdown";
}

/**
 * Heads-up poker rules and state. No knowledge of sockets or transport.
 */
export class HeadsUpGame {
  private state: HandSnapshot | null = null;
  private handHistory: HandHistoryEntry[] = [];
  private handNumberSeq = 0;

  constructor(private readonly dealOptions: DealHandOptions) {}

  getSnapshot(): HandSnapshot | null {
    return this.state;
  }

  /** Per-room list (capped); same order for all clients. */
  getHandHistory(): readonly HandHistoryEntry[] {
    return this.handHistory;
  }

  private pushHandHistory(last: LastHandResult): HandHistoryEntry {
    const entry: HandHistoryEntry = { ...last, handNumber: ++this.handNumberSeq };
    this.handHistory.push(entry);
    if (this.handHistory.length > MAX_HAND_HISTORY) {
      this.handHistory.shift();
    }
    return entry;
  }

  /** Deal the first hand between two players. */
  startHand(player1Id: PlayerId, player2Id: PlayerId): HandSnapshot {
    this.state = dealNewHand(player1Id, player2Id, null, this.dealOptions);
    this.refreshRaiseCap();
    return this.state;
  }

  private refreshRaiseCap(): void {
    if (this.state == null || isGameOver(this.state)) {
      return;
    }
    const h = this.state;
    const opp = opponentOf(h.playerStacks, h.playerTurn);
    if (opp === undefined) {
      return;
    }
    h.currentMaxRaiseTo = computeCurrentMaxRaiseTo(h, h.playerTurn, opp);
  }

  applyAction(actorId: PlayerId, action: EngineAction): ApplyActionResult {
    if (this.state == null || isGameOver(this.state)) {
      return { ok: false, reason: this.state == null ? "no_hand" : "game_over" };
    }

    const hand: ActiveHandState = this.state;
    if (hand.playerTurn !== actorId) {
      return { ok: false, reason: "not_your_turn" };
    }

    const opponentId = opponentOf(hand.playerStacks, actorId);
    if (opponentId === undefined) {
      return { ok: false, reason: "no_opponent" };
    }

    if (hand.lastHandResult) {
      delete (hand as { lastHandResult?: LastHandResult }).lastHandResult;
    }

    const playerId = actorId;

    let newHistoryEntry: HandHistoryEntry | undefined;

    switch (action.actionType) {
      case CALL: {
        const callDifference =
          hand.currentTurnBets[opponentId]! - hand.currentTurnBets[playerId]!;
        const callAmount =
          hand.playerStacks[playerId]! < callDifference
            ? hand.playerStacks[playerId]!
            : callDifference;
        hand.playerStacks[playerId]! -= callAmount;
        hand.potSize += callAmount;
        hand.currentTurnBets[playerId]! += callAmount;
        if (hand.lastRaiser == null) {
          hand.playerTurn = opponentId;
        } else {
          hand.playerTurn = hand.bigBlindPlayer;
          hand.boardTurn += 1;
          hand.currentTurnBets = {
            [playerId]: 0,
            [opponentId]: 0,
          };
          hand.lastRaiser = null;
        }
        if (hand.playerStacks[playerId] === 0 || hand.playerStacks[opponentId] === 0) {
          hand.boardTurn = 4;
        }
        break;
      }
      case CHECK: {
        if (hand.boardTurn === 0 && hand.bigBlindPlayer === playerId) {
          hand.playerTurn = hand.bigBlindPlayer;
          hand.boardTurn += 1;
          hand.currentTurnBets = {
            [playerId]: 0,
            [opponentId]: 0,
          };
        } else if (hand.bigBlindPlayer === playerId) {
          hand.playerTurn = opponentId;
        } else {
          hand.playerTurn = hand.bigBlindPlayer;
          hand.boardTurn += 1;
        }
        break;
      }
      case RAISE: {
        const minTo = computeMinRaiseToTotal(hand, opponentId, playerId);
        const maxTo = computeCurrentMaxRaiseTo(hand, playerId, opponentId);
        if (action.betSize < minTo || action.betSize > maxTo) {
          return { ok: false, reason: "invalid_raise" };
        }
        const raiseSize = action.betSize - hand.currentTurnBets[playerId]!;
        hand.currentTurnBets[playerId] = action.betSize;
        hand.playerStacks[playerId]! -= raiseSize;
        hand.playerTurn = opponentId;
        hand.potSize += raiseSize;
        hand.lastRaiser = playerId;
        break;
      }
      case FOLD: {
        const potWon = hand.potSize;
        const foldReveal: LastHandResult["reveal"] = {
          board: [...hand.board],
          playerHands: { ...hand.playerHands },
        };
        const last: LastHandResult = {
          potAmount: potWon,
          description: "Pot won (opponent folded)",
          split: false,
          winnerId: opponentId,
          reveal: foldReveal,
        };
        newHistoryEntry = this.pushHandHistory(last);
        hand.playerStacks[opponentId]! += hand.potSize;
        const next = dealNewHand(playerId, opponentId, hand.playerStacks, this.dealOptions);
        if (isGameOver(next)) {
          this.state = next;
        } else {
          (next as ActiveHandState).lastHandResult = last;
          this.state = next;
        }
        break;
      }
      default:
        return { ok: false, reason: "unknown_action" };
    }

    if (this.state != null && !isGameOver(this.state) && this.state.boardTurn >= 4) {
      const h = this.state;
      const variant = h.table?.variant ?? "nlhe_hu";
      const potWon = h.potSize;
      const sdReveal: LastHandResult["reveal"] = {
        board: [...h.board],
        playerHands: { ...h.playerHands },
      };
      const winningPlayerArray = resolveShowdownWinners(
        variant,
        h.playerHands[playerId]!,
        h.playerHands[opponentId]!,
        h.board,
      );
      let last: LastHandResult;
      if (winningPlayerArray.length === 2) {
        h.playerStacks[opponentId]! += h.potSize / 2;
        h.playerStacks[playerId]! += h.potSize / 2;
        const d0 = solvedHandLabel(winningPlayerArray[0]!);
        const d1 = solvedHandLabel(winningPlayerArray[1]!);
        last = {
          potAmount: potWon,
          description: `Split pot — ${d0} / ${d1}`,
          split: true,
          winnerId: null,
          reveal: sdReveal,
        };
      } else {
        const wh = winningPlayerArray[0]!;
        const winningPlayer = wh.playerNumber === 1 ? playerId : opponentId;
        h.playerStacks[winningPlayer]! += h.potSize;
        last = {
          potAmount: potWon,
          description: solvedHandLabel(wh),
          split: false,
          winnerId: winningPlayer,
          reveal: sdReveal,
        };
      }
      newHistoryEntry = this.pushHandHistory(last);
      this.state = dealNewHand(playerId, opponentId, h.playerStacks, this.dealOptions);
      if (!isGameOver(this.state)) {
        (this.state as ActiveHandState).lastHandResult = last;
      }
    }

    this.refreshRaiseCap();
    return { ok: true, snapshot: this.state!, handHistoryEntry: newHistoryEntry };
  }
}
