import { useEffect, useId, useMemo, useState } from 'react';
import type { HandHistoryEntry, PokerVariantId } from 'poker-shared';
import { seatLabel } from './tableLayouts';
import HandResultView from './HandResultView';

type HandHistoryPanelProps = {
  entries: readonly HandHistoryEntry[];
  viewerId: string | null;
  holeCount: number;
  tableVariant: PokerVariantId;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function summaryLine(entry: HandHistoryEntry, viewerId: string | null): string {
  const { potAmount, split, winnerId, handNumber, description } = entry;
  const pre = `Hand #${handNumber} · +${potAmount}`;
  if (viewerId == null) {
    return `${pre} · ${description}`;
  }
  if (split) {
    return `${pre} · Split — ${description}`;
  }
  if (winnerId == null) {
    return `${pre} · ${description}`;
  }
  return `${pre} · ${seatLabel(winnerId, viewerId, 0, 2)} wins — ${description}`;
}

export default function HandHistoryPanel({
  entries,
  viewerId,
  holeCount,
  tableVariant,
  open,
  onOpenChange,
}: HandHistoryPanelProps) {
  const titleId = useId();
  const [selected, setSelected] = useState<HandHistoryEntry | null>(null);
  const sorted = useMemo(() => [...entries].sort((a, b) => b.handNumber - a.handNumber), [entries]);

  useEffect(() => {
    if (open) {
      setSelected(sorted[0] ?? null);
    }
  }, [open, sorted]);

  useEffect(() => {
    if (selected && !entries.some((e) => e.handNumber === selected.handNumber)) {
      setSelected(sorted[0] ?? null);
    }
  }, [entries, selected, sorted]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  return (
    <>
      {open && (
        <div
          className="poker-hand-history__backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={() => onOpenChange(false)}
        >
          <div className="poker-hand-history__dialog" onClick={(e) => e.stopPropagation()}>
            <header className="poker-hand-history__header">
              <h2 id={titleId} className="poker-hand-history__title">
                Hand history
              </h2>
              <button
                type="button"
                className="poker-hand-history__close"
                onClick={() => onOpenChange(false)}
                aria-label="Close"
              >
                ×
              </button>
            </header>

            {entries.length === 0 ? (
              <p className="poker-hand-history__empty">No hands finished yet in this table.</p>
            ) : (
              <div className="poker-hand-history__body">
                <ol className="poker-hand-history__list" aria-label="Previous hands">
                  {sorted.map((e) => (
                    <li key={e.handNumber}>
                      <button
                        type="button"
                        className={
                          selected?.handNumber === e.handNumber
                            ? 'poker-hand-history__row poker-hand-history__row--active'
                            : 'poker-hand-history__row'
                        }
                        onClick={() => setSelected(e)}
                      >
                        {summaryLine(e, viewerId)}
                      </button>
                    </li>
                  ))}
                </ol>
                {selected && viewerId != null && (
                  <div className="poker-hand-history__detail">
                    <HandResultView
                      result={selected}
                      viewerId={viewerId}
                      holeCount={holeCount}
                      tableVariant={tableVariant}
                      handNumber={selected.handNumber}
                    />
                  </div>
                )}
                {selected && viewerId == null && (
                  <p className="poker-hand-history__empty">Loading seat…</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
