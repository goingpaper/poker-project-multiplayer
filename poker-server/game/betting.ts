import type { ActiveHandState } from "poker-shared";

/**
 * Pot-limit: maximum **raise-to** total (chips committed this betting round) for `actorId`.
 *
 * Reference: common rule used by major online sites — the maximum total wager is the amount
 * already in the pot (`potSize`, all prior streets plus this street) plus the amount needed
 * to call the current facing bet. Equivalently: `myStreetBet + potSize + facing`, where
 * `facing = max(0, opponentStreetBet - myStreetBet)`. See e.g. Wikipedia “Betting in poker”
 * (Pot-limit) and operator help pages (e.g. PokerStars) for the “pot + amount to call” wording.
 *
 * This replaces an earlier `+ 2 * facing` form that double-counted the call amount.
 */
export function computeCurrentMaxRaiseTo(
  h: ActiveHandState,
  actorId: string,
  opponentId: string,
): number {
  const my = h.currentTurnBets[actorId]!;
  const opp = h.currentTurnBets[opponentId]!;
  const stack = h.playerStacks[actorId]!;
  const facing = Math.max(0, opp - my);
  const allInCap = my + stack;
  const structure = h.table?.betting.structure ?? "no_limit";
  if (structure === "no_limit") {
    return allInCap;
  }
  const potLimitCap = my + h.potSize + facing;
  return Math.min(allInCap, potLimitCap);
}

export function computeMinRaiseToTotal(h: ActiveHandState, opponentId: string, playerId: string): number {
  const bb = h.table?.betting.bigBlind ?? 10;
  const opp = h.currentTurnBets[opponentId]!;
  const my = h.currentTurnBets[playerId]!;
  if (h.lastRaiser == null) {
    return 2 * bb;
  }
  return 2 * opp - my;
}
