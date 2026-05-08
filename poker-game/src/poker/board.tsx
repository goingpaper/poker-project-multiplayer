import type { ReactElement } from 'react';
import Card from 'react-free-playing-cards';
import { ChipStack } from './ChipStack';
import feltUrl from '../pokerboard.svg';

type BoardProps = {
  boardArray: string[];
  turn: number;
  /** Total chips in the main pot (includes posted blinds). */
  potSize: number;
  seatCount?: number;
};

function Board({ boardArray, turn, potSize, seatCount = 2 }: BoardProps) {
  const showMask = [0, 3, 4, 5];
  const cardHeight =
    seatCount <= 4 ? 'clamp(72px, 9.3vw, 112px)' : 'clamp(52px, 6.5vw, 88px)';

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
