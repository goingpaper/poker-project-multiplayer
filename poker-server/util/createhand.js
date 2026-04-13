const createDeck = () => {
  const suits = ["c", "h", "d", "s"];
  const numbers = ["A", "K", "Q", "J", "2", "3", "4", "5", "6", "7", "8", "9", "T"];
  const deck = [];
  for (const num of numbers) {
    for (const suit of suits) {
      deck.push(`${num}${suit}`);
    }
  }
  return deck;
};

const takeRandomCards = (deck, count) => {
  const cards = [];
  for (let n = 0; n < count; n += 1) {
    const randomNumber = Math.floor(Math.random() * deck.length);
    cards.push(deck[randomNumber]);
    deck.splice(randomNumber, 1);
  }
  return cards;
};

const createBoardArray = (deck) => takeRandomCards(deck, 5);

const createPlayerHands = (deck) => {
  const cards = takeRandomCards(deck, 4);
  return [[cards[0], cards[1]], [cards[2], cards[3]]];
};

const updateGameStateOnHandEnd = (player1Id, player2Id, previousHandStacks) => {
  if (
    previousHandStacks &&
    (previousHandStacks[player1Id] === 0 || previousHandStacks[player2Id] === 0)
  ) {
    return {
      playerStacks: previousHandStacks,
      gameWinner: previousHandStacks[player1Id] === 0 ? player2Id : player1Id,
    };
  }

  let playerTurn = player1Id;
  let actSecond = player2Id;
  if (Math.random() > 0.5) {
    playerTurn = player2Id;
    actSecond = player1Id;
  }

  const currentDeck = createDeck();
  const playerHands = createPlayerHands(currentDeck);
  console.log(playerHands);

  const idPlayerHands = {
    [player1Id]: playerHands[0],
    [player2Id]: playerHands[1],
  };

  const boardArray = createBoardArray(currentDeck);

  const playerStacks =
    previousHandStacks != null
      ? { ...previousHandStacks }
      : { [player1Id]: 1000, [player2Id]: 1000 };

  playerStacks[playerTurn] -= 5;
  playerStacks[actSecond] -= 10;

  const currentTurnBets = {
    [playerTurn]: 5,
    [actSecond]: 10,
  };

  return {
    potSize: 15,
    playerTurn,
    boardTurn: 0,
    board: boardArray,
    playerHands: idPlayerHands,
    playerStacks,
    currentTurnBets,
    buttonPlayer: playerTurn,
    bigBlindPlayer: actSecond,
    lastRaiser: null,
    winner: null,
  };
};

export default updateGameStateOnHandEnd;
