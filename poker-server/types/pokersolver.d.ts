declare module "pokersolver" {
  export interface SolvedHand {
    playerNumber?: number;
    rank: number;
    cards: unknown[];
  }

  export class Hand {
    static solve(cards: string[], game?: string, canDisqualify?: boolean): SolvedHand;
    static winners(hands: SolvedHand[]): SolvedHand[];
  }
}
