import type { DealHandOptions } from "../util/createhand.js";
import { dealOptionsToTableMeta } from "../util/createhand.js";
import type { CreateTableRequest, GameFormatId, PokerVariantId, TableConfigPayload } from "poker-shared";

export interface TableRuntimeConfig extends DealHandOptions {}

/** Wire payload for the `tableConfig` socket event (authoritative server settings). */
export function tableConfigPayload(config: TableRuntimeConfig): TableConfigPayload {
  return {
    table: dealOptionsToTableMeta(config),
    initialStack: config.defaultStartingStack,
  };
}

/** Build runtime config for a user-created table (defaults merged from env). */
export function tableConfigFromCreateRequest(body: CreateTableRequest): TableRuntimeConfig {
  const env = tableConfigFromEnv();
  const variant = body.variant ?? env.variant;
  const format = body.format ?? env.format;
  const bettingStructure =
    body.bettingStructure ?? (variant === "plo_hu" ? "pot_limit" : env.bettingStructure);
  const smallBlind = Math.max(1, Math.floor(body.smallBlind ?? env.smallBlind));
  const bigBlind = Math.max(smallBlind + 1, Math.floor(body.bigBlind ?? env.bigBlind));
  const defaultStartingStack = Math.max(
    bigBlind * 2,
    Math.floor(body.initialStack ?? env.defaultStartingStack),
  );
  const cash =
    format === "cash"
      ? {
          autoRefill: body.cashAutoRefill ?? env.cash?.autoRefill ?? true,
          stackCap: Math.max(
            defaultStartingStack,
            Math.floor(body.cashStackCap ?? env.cash?.stackCap ?? defaultStartingStack),
          ),
        }
      : undefined;
  return {
    variant,
    format,
    bettingStructure,
    smallBlind,
    bigBlind,
    defaultStartingStack,
    cash,
  };
}

function parseBool(raw: string | undefined, defaultTrue: boolean): boolean {
  if (raw === undefined || raw === "") return defaultTrue;
  return raw === "1" || raw.toLowerCase() === "true" || raw.toLowerCase() === "yes";
}

/**
 * Configure the table from environment (override per deployment).
 * Defaults: NLHE heads-up cash, 5/10 blinds, 1000 chips, auto top-up to 1000.
 */
export function tableConfigFromEnv(): TableRuntimeConfig {
  const variant = (process.env.TABLE_VARIANT as PokerVariantId) || "nlhe_hu";
  const format = (process.env.TABLE_FORMAT as GameFormatId) || "cash";

  const bettingStructureRaw = process.env.BETTING_STRUCTURE;
  const bettingStructure =
    bettingStructureRaw === "pl" || bettingStructureRaw === "pot_limit"
      ? "pot_limit"
      : bettingStructureRaw === "nl" || bettingStructureRaw === "no_limit"
        ? "no_limit"
        : variant === "plo_hu"
          ? "pot_limit"
          : "no_limit";

  const smallBlind = Number(process.env.SMALL_BLIND) || 5;
  const bigBlind = Number(process.env.BIG_BLIND) || 10;
  const defaultStartingStack = Number(process.env.INITIAL_STACK) || 1000;

  const cash =
    format === "cash"
      ? {
          autoRefill: parseBool(process.env.CASH_AUTO_REFILL, true),
          stackCap: Number(process.env.CASH_STACK_CAP) || defaultStartingStack,
        }
      : undefined;

  return {
    variant,
    format,
    bettingStructure,
    smallBlind,
    bigBlind,
    defaultStartingStack,
    cash,
  };
}
