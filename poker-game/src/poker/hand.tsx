import Card from 'react-free-playing-cards';

const DEFAULT_HEIGHT = '108px';

type HandProps =
  | { hidden: true; cardAmount?: number; cardHeight?: string; fourCardRow?: boolean }
  | { hidden?: false; handArray: string[]; cardHeight?: string; fourCardRow?: boolean };

function Hand(props: HandProps) {
  const rowClass =
    props.fourCardRow === true ? 'hand-row hand-row--plo' : 'hand-row';

  if (props.hidden) {
    const cardAmount = props.cardAmount ?? 2;
    const cardHeight = props.cardHeight ?? DEFAULT_HEIGHT;
    return (
      <div className={rowClass}>
        {[...Array(cardAmount).keys()].map((i) => (
          <Card key={i} back height={cardHeight} />
        ))}
      </div>
    );
  }
  const { handArray, cardHeight = DEFAULT_HEIGHT } = props;
  return (
    <div className={rowClass}>
      {handArray.map((card, index) => (
        <Card key={`${card}-${index}`} card={card} deckType="FcN" height={cardHeight} />
      ))}
    </div>
  );
}

export default Hand;
