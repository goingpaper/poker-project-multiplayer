const httpServer = require("http").createServer();
const io = require("socket.io")(httpServer, {
  // ...
});
const { 
  v4: uuidv4,
} = require('uuid');

const connected = {};

// var currentHand = {
//   potSize: 15,
//   playerTurn: null, // playerId
//   boardTurn: null, // ie. 0,1,2,3 preflop, flop, turn, river
//   board: null,
//   playerHands: null, {1231234: AcKd, 435243: 5d6c}
//   playerStacks: null, {1231234: 1100, 435243: 900}
//   currentTurnBets: null ie. {1231234: 30, 435243: 90} player 1 bets 30 and player 2 raises to 90
// };

var currentHand = null;

const createDeck = () => {
  const suits = ["c","h","d","s"];
  const numbers = ["A","K","Q","J","2","3","4","5","6","7","8","9","T"];
  var deck = [];
  for (i in numbers) {
    for (j in suits) {
      card = numbers[i] + suits[j];
      deck.push(card);
    }
  }
  return deck;
}

const createBoardString = (deck) => {
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
  player1Hand = cards[0] + cards[1];
  player2Hand = cards[2] + cards[3];
  return [player1Hand, player2Hand];
}

const createNewHand = (player1Id, player2Id) => {

  var playerTurn = player1Id;
  var actSecond = player2Id;
  if (Math.random()>0.5) {
    playerTurn = player2Id;
    actSecond = player1Id;
  }
  var currentDeck = createDeck();
  const playerHands = createPlayerHands(currentDeck);

  var idPlayerHands = {};
  idPlayerHands[player1Id] = playerHands[0];
  idPlayerHands[player2Id] = playerHands[1];

  const boardString = createBoardString(currentDeck);

  var playerStacks = {};
  playerStacks[player1Id] = 1000;
  playerStacks[player2Id] = 1000;
  playerStacks[playerTurn] -= 5;
  playerStacks[actSecond] -= 10;

  var currentTurnBets = {};
  currentTurnBets[playerTurn] = 5;
  currentTurnBets[actSecond] = 10;

  return {
    potSize: 15,
    playerTurn: playerTurn,
    boardTurn: 0,
    board: boardString,
    playerHands: idPlayerHands,
    playerStacks: playerStacks,
    currentTurnBets: currentTurnBets
  };
}

// turns 0 - 3, preflop, flop, turn, river
io.on("connection", (socket) => {

  if (Object.keys(connected).length == 2) {
    return;
  }

  connected[socket.id] = socket;
  console.log(Object.keys(connected).length);
  socket.emit("playerConnected", socket.id);
  
  socket.on("disconnect", (reason) => {
    delete connected[socket.id];
    socket.broadcast.emit("playerleft");
  });
  const connectedCount = Object.keys(connected).length;

  if (connectedCount == 2) {
    // broadcast to all clients
    io.emit("started");
    // setup a new hand
    // create a playerTurn
    const players = Object.keys(connected);
    currentHand = createNewHand(players[0], players[1]);
    io.emit("receiveHandState", JSON.stringify(currentHand));
  }
  socket.on("playerAction", (action) => {
    //data will be JSON
    actionParsed = JSON.parse(action);
    console.log(action);
    // check if the player sending the action is allowed to act
    if (currentHand != null && currentHand.playerTurn == socket.id) {
      
    }
  });
});

httpServer.listen(3000);

// create a callback to wait until there are two concurrent connections




