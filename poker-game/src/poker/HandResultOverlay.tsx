import type { LastHandResult } from 'poker-shared';
import HandResultView from './HandResultView';

type HandResultOverlayProps = {
  result: LastHandResult;
  viewerId: string;
  holeCount: number;
};

function HandResultOverlay({ result, viewerId, holeCount }: HandResultOverlayProps) {
  return (
    <div className="poker-hand-result" role="status" aria-live="polite">
      <HandResultView result={result} viewerId={viewerId} holeCount={holeCount} />
    </div>
  );
}

export default HandResultOverlay;
