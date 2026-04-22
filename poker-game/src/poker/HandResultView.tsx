import type { LastHandResult } from 'poker-shared';
import Card from 'react-free-playing-cards';
import Hand from './hand';
import { rotateSeatsForViewer, seatLabel } from './tableLayouts';

export type HandResultViewProps = {
  result: LastHandResult;
  viewerId: string;
  holeCount: number;
  handNumber?: number;
};

function labelPlayer(playerId: string, viewerId: string): string {
  return seatLabel(playerId, viewerId, 0, 2);
}

/**
 * Card recap (used by the post-hand overlay and the hand history panel).
 */
function HandResultView({ result, viewerId, holeCount, handNumber }: HandResultViewProps) {
  const { potAmount, description, split, winnerId, reveal } = result;
  const seatIds = rotateSeatsForViewer(Object.keys(reveal.playerHands).sort(), viewerId);
  const fourCard = holeCount === 4;
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
        {reveal.board.map((c, i) => (
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
