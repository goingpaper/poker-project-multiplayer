import pkg from "pokersolver";

const { Hand } = pkg;

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (k > arr.length) return [];
  if (k === arr.length) return [[...arr]];
  const [head, ...tail] = arr;
  const withHead = combinations(tail, k - 1).map((c) => [head!, ...c]);
  const withoutHead = combinations(tail, k);
  return [...withHead, ...withoutHead];
}

/** Best 5-card Omaha high hand using exactly two hole cards and three board cards. */
function bestOmahaSolved(hole: string[], board: string[]) {
  const holePairs = combinations(hole, 2);
  const boardTriples = combinations(board, 3);
  const candidates: ReturnType<typeof Hand.solve>[] = [];
  for (const hp of holePairs) {
    for (const bt of boardTriples) {
      candidates.push(Hand.solve([...hp, ...bt], "standard"));
    }
  }
  const winners = Hand.winners(candidates);
  return winners[0]!;
}

export default function omahaWinners(hole1: string[], hole2: string[], board: string[]) {
  const best1 = bestOmahaSolved(hole1, board);
  best1.playerNumber = 1;
  const best2 = bestOmahaSolved(hole2, board);
  best2.playerNumber = 2;
  return Hand.winners([best1, best2]);
}
