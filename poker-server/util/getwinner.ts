import pkg from "pokersolver";

const { Hand } = pkg;

export default function getWinner(hand1: string[], hand2: string[], board: string[]) {
  const hand1Result = Hand.solve([...hand1, ...board]);
  hand1Result.playerNumber = 1;
  const hand2Result = Hand.solve([...hand2, ...board]);
  hand2Result.playerNumber = 2;
  return Hand.winners([hand1Result, hand2Result]);
}
