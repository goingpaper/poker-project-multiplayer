import type { HandSnapshot, PokerVariantId, TableConfigPayload, TablePublicMeta } from 'poker-shared';
import { isGameOver } from 'poker-shared';
import { BIG_BLIND } from './config';

const defaultTable: TablePublicMeta = {
  variant: 'nlhe_hu',
  format: 'cash',
  betting: { structure: 'no_limit', smallBlind: 5, bigBlind: BIG_BLIND },
  cash: { autoRefill: true, stackCap: 1000 },
};

/**
 * Prefer hand snapshot `table`, then the server’s `tableConfig` event, then local defaults.
 */
export function resolveTableMeta(
  handState: HandSnapshot | null,
  serverTable: TableConfigPayload | null,
): TablePublicMeta {
  if (handState && !isGameOver(handState) && handState.table) {
    return handState.table;
  }
  if (serverTable?.table) {
    return serverTable.table;
  }
  return defaultTable;
}

/** Long-form name for a variant (table bar, lobby, etc.). */
const VARIANT_DISPLAY_NAMES = {
  nlhe_hu: "No-limit Hold'em",
  plhe_hu_aces: "Pot Limit Hold'em · Pocket aces · Flop start",
  plpog_hu: 'Progressive Pot Limit Omaha',
  plo_hu: 'Pot Limit Omaha',
} as const satisfies Record<PokerVariantId, string>;

export function formatVariantName(variant: PokerVariantId): string {
  return VARIANT_DISPLAY_NAMES[variant];
}

export function formatTableLabel(meta: TablePublicMeta): string {
  const v = formatVariantName(meta.variant);
  const f = meta.format === 'tournament' ? 'Tournament' : 'Cash';
  const blinds = `${meta.betting.smallBlind}/${meta.betting.bigBlind}`;
  const cap = meta.cash?.autoRefill ? ` · top-up ${meta.cash.stackCap}` : '';
  return `${v} · ${f} · ${blinds}${cap}`;
}
