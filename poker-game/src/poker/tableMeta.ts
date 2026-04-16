import type { HandSnapshot, TableConfigPayload, TablePublicMeta } from 'poker-shared';
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

export function formatTableLabel(meta: TablePublicMeta): string {
  const v = meta.variant === 'plo_hu' ? 'PLO' : 'NLHE';
  const f = meta.format === 'tournament' ? 'Tournament' : 'Cash';
  const blinds = `${meta.betting.smallBlind}/${meta.betting.bigBlind}`;
  const cap = meta.cash?.autoRefill ? ` · top-up ${meta.cash.stackCap}` : '';
  return `${v} · ${f} · ${blinds}${cap}`;
}
