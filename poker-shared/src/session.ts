/** Which poker rules apply (heads-up variants for now; extend with ring games later). */
export type PokerVariantId = "nlhe_hu" | "plo_hu";

/** Cash tables can auto-top-up; tournaments play to elimination with no refill. */
export type GameFormatId = "cash" | "tournament";

export type BettingStructure = "no_limit" | "pot_limit";

export interface TablePublicMeta {
  variant: PokerVariantId;
  format: GameFormatId;
  betting: {
    structure: BettingStructure;
    smallBlind: number;
    bigBlind: number;
  };
  /** Present when `format === "cash"` */
  cash?: {
    autoRefill: boolean;
    stackCap: number;
  };
  /** Present when `format === "tournament"` */
  tournament?: {
    levelIndex: number;
  };
}

/** Emitted by the server on socket connect so the client can show stakes before the first hand. */
export interface TableConfigPayload {
  table: TablePublicMeta;
  initialStack: number;
}

export function holeCardCountForVariant(variant: PokerVariantId): number {
  switch (variant) {
    case "plo_hu":
      return 4;
    case "nlhe_hu":
    default:
      return 2;
  }
}
