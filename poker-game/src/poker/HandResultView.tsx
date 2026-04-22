import type { LastHandResult, PokerVariantId } from 'poker-shared';
import Card from 'react-free-playing-cards';
import Hand from './hand';
import { rotateSeatsForViewer, seatLabel } from './tableLayouts';

/** POG: community cards in play match hole count (0 at preflop, then 3/4/5). */
function pogBoardSliceLength(maxHoleCount: number): number {
  if (maxHoleCount <= 2) {
    return 0;
  }
  return maxHoleCount;
}

export type HandResultViewProps = {
  result: LastHandResult;
  viewerId: string;
  /** Table max (e.g. 5 for POG); layout also uses per-hand data when `tableVariant` is POG. */
  holeCount: number;
  /** When `plpog_hu`, only community cards that had been dealt at hand end are shown. */
  tableVariant?: PokerVariantId;
  handNumber?: number;
};

function labelPlayer(playerId: string, viewerId: string): string {
  return seatLabel(playerId, viewerId, 0, 2);
}

/**
 * Card recap (used by the post-hand overlay and the hand history panel).
 */
function HandResultView({ result, viewerId, holeCount, tableVariant, handNumber }: HandResultViewProps) {
  const { potAmount, description, split, winnerId, reveal } = result;
  const seatIds = rotateSeatsForViewer(Object.keys(reveal.playerHands).sort(), viewerId);
  const maxHoleLen = Math.max(0, ...Object.values(reveal.playerHands).map((h) => h.length));
  const isPog = tableVariant === 'plpog_hu';
  const boardCardsToShow = isPog
    ? reveal.board.slice(0, pogBoardSliceLength(maxHoleLen))
    : reveal.board;
  const fourCard = tableVariant === 'plo_hu' ? holeCount === 4 : isPog ? maxHoleLen >= 4 : holeCount === 4;
  const cardH = 'clamp(56px, 7vw, 88px)';

  const headline = split
    ? 'Split pot'
    : winnerId != null
      ? `${labelPlayer(winnerId, viewerId)} wins`
      : 'Hand complete';

  return (
    <div className="poker-hand-result__panel">
      {handNumber != null && <p className="poker-hand-result__num">Hand #{handNumber}</p>}
      <p className="poker-hand-result__headline">{headline}</p>
      <p className="poker-hand-result__pot">+{potAmount} chips</p>
      <p className="poker-hand-result__desc">{description}</p>

      <div className="poker-hand-result__board">
        {boardCardsToShow.map((c, i) => (
          <Card key={`${c}-${i}`} card={c} deckType="FcN" height={cardH} />
        ))}
      </div>

      <div className="poker-hand-result__holes">
        {seatIds.map((pid) => (
          <div key={pid} className="poker-hand-result__hole-block">
            <span className="poker-hand-result__hole-label">{labelPlayer(pid, viewerId)}</span>
            <Hand handArray={reveal.playerHands[pid]!} cardHeight={cardH} fourCardRow={fourCard} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default HandResultView;
