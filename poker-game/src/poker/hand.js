import Card from "react-free-playing-cards"

function Hand ({ handArray, hidden, cardAmount }) {
    if (hidden) {
        return [...Array(cardAmount).keys()].map(() => {
            return <Card back height="150px" />
        })
    }
    return <div>
        {handArray.map((card) => {
            return <Card card={card} deckType={'FcN'} height="150px" />
        })}
    </div>
};
export default Hand;