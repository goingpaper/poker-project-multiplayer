import type { ActiveHandState, HandSnapshot, PlayerId } from "poker-shared";
import { isGameOver } from "poker-shared";
import { CALL, CHECK, FOLD, RAISE } from "../constants.js";
import dealNewHand, { type DealHandOptions } from "../util/createhand.js";
import resolveShowdownWinners from "../util/showdown.js";
import type { EngineAction } from "./playerAction.js";
import { computeCurrentMaxRaiseTo, computeMinRaiseToTotal } from "./betting.js";

export type ApplyActionResult =
  | { ok: true; snapshot: HandSnapshot }
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

/**
 * Heads-up poker rules and state. No knowledge of sockets or transport.
 */
export class HeadsUpGame {
  private state: HandSnapshot | null = null;

  constructor(private readonly dealOptions: DealHandOptions) {}

  getSnapshot(): HandSnapshot | null {
    return this.state;
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

    const playerId = actorId;

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
        hand.playerStacks[opponentId]! += hand.potSize;
        const next = dealNewHand(playerId, opponentId, hand.playerStacks, this.dealOptions);
        if (isGameOver(next)) {
          this.state = next;
        } else {
          next.winner = opponentId;
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
      const winningPlayerArray = resolveShowdownWinners(
        variant,
        h.playerHands[playerId]!,
        h.playerHands[opponentId]!,
        h.board,
      );
      if (winningPlayerArray.length === 2) {
        h.playerStacks[opponentId]! += h.potSize / 2;
        h.playerStacks[playerId]! += h.potSize / 2;
      } else {
        const winningPlayer =
          winningPlayerArray[0]!.playerNumber === 1 ? playerId : opponentId;
        h.playerStacks[winningPlayer]! += h.potSize;
      }
      this.state = dealNewHand(playerId, opponentId, h.playerStacks, this.dealOptions);
    }

    this.refreshRaiseCap();
    return { ok: true, snapshot: this.state! };
  }
}
