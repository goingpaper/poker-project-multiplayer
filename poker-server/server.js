const httpServer = require("http").createServer();
const io = require("socket.io")(httpServer, {
  // ...
});
const { 
  v4: uuidv4,
} = require('uuid');

const CHECK = "check";
const CALL = "call";
const FOLD = "fold";
const RAISE = "raise";

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

const getOpponentId = (currentSocketId) => {

  const filterArray = Object.keys(connected).filter((playerId) => {
      return playerId != currentSocketId;
  })
  const opponentId = filterArray[0];
  return opponentId;
}

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

  const boardArray = createBoardArray(currentDeck);

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
    board: boardArray,
    playerHands: idPlayerHands,
    playerStacks: playerStacks,
    currentTurnBets: currentTurnBets,
    buttonPlayer: playerTurn,
    bigBlindPlayer: actSecond,
    lastRaiser: null
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

    actionParsed = JSON.parse(action);
    // check if the player sending the action is allowed to act
    if (currentHand != null && currentHand.playerTurn == socket.id) {
      const playerId = socket.id;
      const opponentId = getOpponentId(playerId);
      switch(actionParsed.actionType) {
        case CALL:
          // find the difference between calling player current bet and aggressers current bet
          // subtract that amount from calling players stack and add to the potSize

          // if - last raiser is null then dont increase turn count but switch to next player
          // else - increase turn count and reset playerTurn to big blind player
          console.log("call");
          const callAmount = currentHand.currentTurnBets[opponentId] - currentHand.currentTurnBets[playerId];
          currentHand.playerStacks[playerId] -= callAmount
          currentHand.potSize += callAmount;
          currentHand.currentTurnBets[playerId] += callAmount;
          if (currentHand.lastRaiser == null) {
            nextPlayer = opponentId;
            currentHand.playerTurn = nextPlayer;
          } else {
            currentHand.playerTurn = currentHand.bigBlindPlayer
            currentHand.boardTurn = currentHand.boardTurn + 1

            var currentTurnBets = {};
            currentTurnBets[playerId] = 0;
            currentTurnBets[opponentId] = 0;
            currentHand.currentTurnBets = currentTurnBets;
            currentHand.lastRaiser = null;
          }
          if (currentHand.playerStacks[playerId] == 0 && currentHand.playerStacks[opponentId] == 0) {
            currentHand.boardTurn = 4;
          }
          break;
        case CHECK:
          console.log("check");
          if (currentHand.boardTurn == 0 && currentHand.bigBlindPlayer == playerId) {
            currentHand.playerTurn = currentHand.bigBlindPlayer;
            currentHand.boardTurn = currentHand.boardTurn + 1;

            var currentTurnBets = {};
            currentTurnBets[playerId] = 0;
            currentTurnBets[opponentId] = 0;
            currentHand.currentTurnBets = currentTurnBets;
          } else {
            if (currentHand.bigBlindPlayer == playerId) {
              currentHand.playerTurn = opponentId;
            } else {
              currentHand.playerTurn = currentHand.bigBlindPlayer
              currentHand.boardTurn = currentHand.boardTurn + 1
            }
          }
          break;
        case RAISE:
          console.log("raise");
          const raiseSize = actionParsed.betSize - currentHand.currentTurnBets[playerId];
          currentHand.currentTurnBets[playerId] = actionParsed.betSize;
          currentHand.playerStacks[playerId] -= raiseSize;
          currentHand.playerTurn = opponentId;
          currentHand.potSize += raiseSize;
          currentHand.lastRaiser = playerId;
          break;
        default:
          // code block
      }
      // emit to all clients the updated hand state
      io.emit("receiveHandState", JSON.stringify(currentHand));
    }
  });
});

httpServer.listen(process.env.PORT);

// create a callback to wait until there are two concurrent connections




