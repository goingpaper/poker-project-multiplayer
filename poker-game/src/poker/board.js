import Card from "react-free-playing-cards"
import Bet from "./bet";

// playerBets an object with keys 0-1
// 0 is the player and 1 is opponent
//
function Board ({ boardArray, turn, potSize, playerBets }) {
    console.log(potSize);
    const showMask = [0,3,4,5];
    let boardCards;
    if (turn !== 0) {
        boardCards = <div>
            {boardArray.slice(0, showMask[turn]).map((card) => {
                return <Card card={card} deckType={'FcN'} height="150px" />
            })}
        </div>
            
        
    }
    return <div className="board">
        {playerBets["opponent"] != 0 ? <Bet className={"opponentBet"} bet={playerBets["opponent"]}/>: false}
        <div className="potAndCommunity">
            Pot - {potSize}
            {boardCards}
        </div>
        {playerBets["player"] != 0 ? <Bet className={"playerBet"} bet={playerBets["player"]}/>: false}
    </div>
};
export default Board;