function Board ({ boardString, turn }) {
    const showMask = [0,3,4,5];
    if (turn == 0) {
        return "Preflop";
    } else {
        return <div>
        Board: {boardString.substring(0, showMask[turn]-1)}
      </div>
    }
    
};
export default Board;