import type { ReactElement } from 'react';
import Card from 'react-free-playing-cards';
import { ChipStack } from './ChipStack';
import feltUrl from '../pokerboard.svg';
import { getBetOnFeltPositions, seatAnchorStyle, seatLabel } from './tableLayouts';

type BoardProps = {
  boardArray: string[];
  turn: number;
  potSize: number;
  seatCount?: number;
  seatIds?: string[];
  currentTurnBets?: Record<string, number>;
  viewerId: string;
};

function Board({
  boardArray,
  turn,
  potSize,
  seatCount = 2,
  seatIds = [],
  currentTurnBets = {},
  viewerId,
}: BoardProps) {
  const showMask = [0, 3, 4, 5];
  const cardHeight =
    seatCount <= 4 ? 'clamp(76px, 10vw, 120px)' : 'clamp(56px, 7vw, 96px)';

  const n = Math.max(seatIds.length || 0, seatCount);
  const betPositions = getBetOnFeltPositions(n);

  let boardCards: ReactElement | undefined;
  if (turn !== 0) {
    boardCards = (
      <div className="board__cards">
        {boardArray.slice(0, showMask[turn]).map((card, index) => (
          <Card key={`${card}-${index}`} card={card} deckType="FcN" height={cardHeight} />
        ))}
      </div>
    );
  }

  return (
    <div
      className="board"
      data-seats={seatCount}
      style={{
        backgroundImage: `url(${feltUrl})`,
      }}
    >
      {seatIds.map((playerId, slot) => {
        const pos = betPositions[slot] ?? betPositions[0]!;
        const amount = currentTurnBets[playerId] ?? 0;
        const cap = seatLabel(playerId, viewerId, slot, seatCount);
        return (
          <div
            key={`felt-bet-${playerId}`}
            className={`board__felt-bet${amount === 0 ? ' board__felt-bet--empty' : ''}`}
            style={seatAnchorStyle(pos)}
          >
            <ChipStack amount={amount} caption={cap} variant="felt" showAmount />
          </div>
        );
      })}

      <div className="board__community board__community--solo">
        <div className="board__center-stack">
          <div className="board__pot-mid">
            <ChipStack amount={potSize} caption="Pot" variant="felt" showAmount />
          </div>
          {boardCards != null ? (
            <div className="board__cards-wrap">{boardCards}</div>
          ) : (
            <div className="board__cards-wrap board__cards-wrap--empty" aria-hidden />
          )}
        </div>
      </div>
    </div>
  );
}

export default Board;
