import pkg from "pokersolver";
const { Hand } = pkg;
/**
 * @param {Array} hand1
 * @param {Array} hand2
 * @param {Array} [board]
 */
const getWinner = (hand1, hand2, board) => {
    var hand1Result = Hand.solve([...hand1, ...board]);
    hand1Result.playerNumber = 1;
    var hand2Result = Hand.solve([...hand2, ...board]);
    hand2Result.playerNumber = 2;
    return Hand.winners([hand1Result, hand2Result]);
}
export default getWinner;