import type { PokerVariantId } from "poker-shared";
import getWinnerHoldem from "./getwinner.js";
import omahaWinners from "./omahaShowdown.js";

export default function resolveShowdownWinners(
  variant: PokerVariantId,
  hole1: string[],
  hole2: string[],
  board: string[],
) {
  if (variant === "plo_hu") {
    return omahaWinners(hole1, hole2, board);
  }
  return getWinnerHoldem(hole1, hole2, board);
}
