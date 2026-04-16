import type { GameFormatId, PokerVariantId } from "./session.js";

/** POST `/api/tables` body; omitted fields use server defaults (from env). */
export interface CreateTableRequest {
  variant?: PokerVariantId;
  format?: GameFormatId;
  bettingStructure?: "no_limit" | "pot_limit";
  smallBlind?: number;
  bigBlind?: number;
  initialStack?: number;
  cashAutoRefill?: boolean;
  cashStackCap?: number;
}

export interface CreateTableResponse {
  roomId: string;
  /** Path-only URL for the client router, e.g. `/play/<uuid>`. */
  playPath: string;
}
