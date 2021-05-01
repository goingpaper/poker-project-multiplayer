const createDeck = () => {
    const suits = ["c","h","d","s"];
    const numbers = ["A","K","Q","J","2","3","4","5","6","7","8","9","T"];
    var deck = [];
    for (var i in numbers) {
      for (var j in suits) {
        const card = numbers[i] + suits[j];
        deck.push(card);
      }
    }
    return deck;
}
  
const createBoardArray = (deck) => {
    var i = 0
    var cards = [];
    for (var i = 0; i<5; i++) {
      const randomNumber = Math.floor(Math.random() * deck.length);
      cards.push(deck[randomNumber]);
      deck.splice(randomNumber, 1);
    }
    return cards;
}
  
const createPlayerHands = (deck) => {
    var i = 0
    var cards = [];
    for (var i = 0; i<4; i++) {
      const randomNumber = Math.floor(Math.random() * deck.length);
      cards.push(deck[randomNumber]);
      deck.splice(randomNumber, 1);
    }
    const player1Hand = cards[0] + cards[1];
    const player2Hand = cards[2] + cards[3];
    return [player1Hand, player2Hand];
}

const createNewHand = (player1Id, player2Id, previousHandStacks) => {

    var playerTurn = player1Id;
    var actSecond = player2Id;
    if (Math.random()>0.5) {
      playerTurn = player2Id;
      actSecond = player1Id;
    }
    var currentDeck = createDeck();
    const playerHands = createPlayerHands(currentDeck);
    console.log(playerHands);
  
    var idPlayerHands = {};
    idPlayerHands[player1Id] = playerHands[0];
    idPlayerHands[player2Id] = playerHands[1];
  
    const boardArray = createBoardArray(currentDeck);
  
    var playerStacks = {};

    if (previousHandStacks != null) {
      playerStacks = previousHandStacks;
    } else {
      playerStacks[player1Id] = 1000;
      playerStacks[player2Id] = 1000;
      playerStacks[playerTurn] -= 5;
      playerStacks[actSecond] -= 10;
    }
    
    var currentTurnBets = {};
    currentTurnBets[playerTurn] = 5;
    currentTurnBets[actSecond] = 10;
  
    return {
      potSize: 15,
      playerTurn: playerTurn,
      boardTurn: 0,
      board: boardArray,
      playerHands: idPlayerHands,
      playerStacks: playerStacks,
      currentTurnBets: currentTurnBets,
      buttonPlayer: playerTurn,
      bigBlindPlayer: actSecond,
      lastRaiser: null,
      winner: null
    };
}
export default createNewHand;