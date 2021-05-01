import pkg from "pokersolver";
const { Hand } = pkg;
/**
 * @param {String} handString1
 * @param {String} handString2
 * @param {Array} [board]
 */
const getWinner = (handString1, handString2, board) => {
    console.log([handString1.substring(0,1),handString1.substring(2,3), ...board]);
    var hand1 = Hand.solve([handString1.substring(0,2),handString1.substring(2,4), ...board]);
    hand1.playerNumber = 1;
    var hand2 = Hand.solve([handString2.substring(0,2),handString2.substring(2,4), ...board]);
    hand2.playerNumber = 2;
    return Hand.winners([hand1, hand2]);
}
export default getWinner;