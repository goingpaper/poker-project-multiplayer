import type {
  ActiveHandState,
  HandHistoryEntry,
  HandSnapshot,
  LastHandResult,
  LastPlayerAction,
  PlayerId,
} from "poker-shared";
import { isGameOver } from "poker-shared";
import { CALL, CHECK, FOLD, RAISE } from "../constants.js";
import dealNewHand, {
  type DealHandExtras,
  type DealHandOptions,
  type DealHandResult,
} from "../util/createhand.js";
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
  /** Stable seat order from `startHand` — used for dealing and aces alternation. */
  private seatOrder: [PlayerId, PlayerId] | null = null;
  /** Increments each time a new hand is dealt; used to alternate aces for `plhe_hu_aces`. */
  private acesHandCounter = 0;
  /**
   * `plpog_hu`: one extra hole card per player for flop, turn, and river; applied when `boardTurn` advances.
   * Not part of the wire snapshot for security until dealt.
   */
  private pogHoleQueue: Record<PlayerId, [string, string, string]> | null = null;

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

  private stableSeats(): [PlayerId, PlayerId] {
    if (this.seatOrder == null) {
      throw new Error("seatOrder unset — startHand was not called");
    }
    return this.seatOrder;
  }

  private applyDealResult(res: DealHandResult): void {
    this.state = res.snapshot;
    if (isGameOver(res.snapshot) || this.dealOptions.variant !== "plpog_hu") {
      this.pogHoleQueue = null;
    } else {
      this.pogHoleQueue = res.pogHoleQueue;
    }
  }

  /**
   * Progressive-Omaha: hole count 2 (preflop) → 3 (flop) → 4 (turn) → 5 (river) as the board is revealed.
   * Must run after an action that changes `boardTurn` (including a jump to 4 all-in).
   */
  private syncPogHolesToBoard(): void {
    if (this.pogHoleQueue == null || this.dealOptions.variant !== "plpog_hu") {
      return;
    }
    if (this.state == null || isGameOver(this.state)) {
      return;
    }
    const h = this.state;
    const t =
      h.boardTurn === 0
        ? 2
        : h.boardTurn >= 4
          ? 5
          : 2 + h.boardTurn; /* 1→3, 2→4, 3→5 */
    const [p1, p2] = this.stableSeats();
    for (const pid of [p1, p2] as [PlayerId, PlayerId]) {
      const q = this.pogHoleQueue[pid];
      if (q == null) {
        return;
      }
      while (h.playerHands[pid]!.length < t) {
        const idx = h.playerHands[pid]!.length - 2;
        h.playerHands[pid]!.push(q[idx]!);
      }
    }
  }

  /** Who gets pocket aces on the *next* deal; advances alternation counter for aces mode. */
  private consumeAcesExtras(): DealHandExtras | undefined {
    if (this.dealOptions.variant !== "plhe_hu_aces") {
      return undefined;
    }
    const [a, b] = this.stableSeats();
    const holder = this.acesHandCounter % 2 === 0 ? a : b;
    this.acesHandCounter += 1;
    return { acesHolderId: holder };
  }

  /** Deal the first hand between two players. */
  startHand(player1Id: PlayerId, player2Id: PlayerId): HandSnapshot {
    this.seatOrder = [player1Id, player2Id];
    this.acesHandCounter = 0;
    this.applyDealResult(
      dealNewHand(player1Id, player2Id, null, this.dealOptions, this.consumeAcesExtras()),
    );
    this.refreshRaiseCap();
    return this.state!;
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

    const clearStreetBanner = (h: ActiveHandState): void => {
      delete h.lastAction;
    };

    const setActorBanner = (h: ActiveHandState, actor: PlayerId, a: LastPlayerAction): void => {
      h.lastAction = a;
    };

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
        const endsStreet = hand.lastRaiser != null;

        hand.playerStacks[playerId]! -= callAmount;
        hand.potSize += callAmount;
        hand.currentTurnBets[playerId]! += callAmount;
        if (!endsStreet) {
          hand.playerTurn = opponentId;
          setActorBanner(hand, playerId, {
            playerId,
            kind: "call",
            streetTotal: hand.currentTurnBets[playerId]!,
          });
        } else {
          hand.playerTurn = hand.bigBlindPlayer;
          hand.boardTurn += 1;
          hand.currentTurnBets = {
            [playerId]: 0,
            [opponentId]: 0,
          };
          hand.lastRaiser = null;
          clearStreetBanner(hand);
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
          clearStreetBanner(hand);
        } else if (hand.bigBlindPlayer === playerId) {
          hand.playerTurn = opponentId;
          setActorBanner(hand, playerId, { playerId, kind: "check" });
        } else {
          hand.playerTurn = hand.bigBlindPlayer;
          hand.boardTurn += 1;
          clearStreetBanner(hand);
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
        setActorBanner(hand, playerId, {
          playerId,
          kind: "raise",
          streetTotal: action.betSize,
        });
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
        const [p1, p2] = this.stableSeats();
        const next = dealNewHand(p1, p2, hand.playerStacks, this.dealOptions, this.consumeAcesExtras());
        this.applyDealResult(next);
        if (!isGameOver(next.snapshot)) {
          (this.state as ActiveHandState).lastHandResult = last;
        }
        break;
      }
      default:
        return { ok: false, reason: "unknown_action" };
    }

    this.syncPogHolesToBoard();

    if (this.state != null && !isGameOver(this.state) && this.state.boardTurn >= 4) {
      const h = this.state;
      const variant = h.table?.variant ?? "nlhe_hu";
      const potWon = h.potSize;
      const [sp1, sp2] = this.stableSeats();
      const sdReveal: LastHandResult["reveal"] = {
        board: [...h.board],
        playerHands: { ...h.playerHands },
      };
      const winningPlayerArray = resolveShowdownWinners(
        variant,
        h.playerHands[sp1]!,
        h.playerHands[sp2]!,
        h.board,
      );
      let last: LastHandResult;
      if (winningPlayerArray.length === 2) {
        h.playerStacks[sp2]! += h.potSize / 2;
        h.playerStacks[sp1]! += h.potSize / 2;
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
        const winningPlayer = wh.playerNumber === 1 ? sp1 : sp2;
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
      const d = dealNewHand(sp1, sp2, h.playerStacks, this.dealOptions, this.consumeAcesExtras());
      this.applyDealResult(d);
      if (!isGameOver(d.snapshot)) {
        (d.snapshot as ActiveHandState).lastHandResult = last;
      }
    }

    this.refreshRaiseCap();
    return { ok: true, snapshot: this.state!, handHistoryEntry: newHistoryEntry };
  }
}
