import Card from 'react-free-playing-cards';

const DEFAULT_HEIGHT = '108px';

function Hand({ handArray, hidden, cardAmount, cardHeight = DEFAULT_HEIGHT }) {
  if (hidden) {
    return (
      <div className="hand-row">
        {[...Array(cardAmount).keys()].map((i) => (
          <Card key={i} back height={cardHeight} />
        ))}
      </div>
    );
  }
  return (
    <div className="hand-row">
      {handArray.map((card, index) => (
        <Card key={`${card}-${index}`} card={card} deckType="FcN" height={cardHeight} />
      ))}
    </div>
  );
}

export default Hand;
