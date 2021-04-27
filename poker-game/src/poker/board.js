function Board ({ boardArray, turn }) {
    console.log(boardArray);
    const showMask = [0,3,4,5];
    if (turn == 0) {
        return "Preflop";
    } else {
        return <div>
        Board: {boardArray.slice(0, showMask[turn])}
      </div>
    }
    
};
export default Board;