import http from "http";
import { Server } from "socket.io";

const httpServer = http.createServer();
const io = new Server(httpServer, {});

import { RAISE, CALL, FOLD, CHECK } from "./constants.js";
import updateGameStateOnHandEnd from "./util/createhand.js";
import getWinner from "./util/getwinner.js";

const connected = {};

var currentHand = null;

const getOpponentId = (currentSocketId) => {

  const filterArray = Object.keys(connected).filter((playerId) => {
      return playerId != currentSocketId;
  })
  const opponentId = filterArray[0];
  return opponentId;
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
    currentHand = updateGameStateOnHandEnd(players[0], players[1]);
    io.emit("receiveHandState", JSON.stringify(currentHand));
  }
  socket.on("playerAction", (action) => {

    const actionParsed = JSON.parse(action);
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
          const callDifference = currentHand.currentTurnBets[opponentId] - currentHand.currentTurnBets[playerId];
          const callAmount = currentHand.playerStacks[playerId] < callDifference ? currentHand.playerStacks[playerId] : callDifference;
          currentHand.playerStacks[playerId] -= callAmount;
          currentHand.potSize += callAmount;
          currentHand.currentTurnBets[playerId] += callAmount;
          if (currentHand.lastRaiser == null) {
            currentHand.playerTurn = opponentId;
          } else {
            currentHand.playerTurn = currentHand.bigBlindPlayer
            currentHand.boardTurn = currentHand.boardTurn + 1

            var currentTurnBets = {};
            currentTurnBets[playerId] = 0;
            currentTurnBets[opponentId] = 0;
            currentHand.currentTurnBets = currentTurnBets;
            currentHand.lastRaiser = null;
          }
          if (currentHand.playerStacks[playerId] == 0 || currentHand.playerStacks[opponentId] == 0) {
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
              currentHand.playerTurn = currentHand.bigBlindPlayer;
              currentHand.boardTurn = currentHand.boardTurn + 1;
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
        case FOLD:
          currentHand.playerStacks[opponentId] += currentHand.potSize;
          currentHand = updateGameStateOnHandEnd(playerId, opponentId, currentHand.playerStacks);
          currentHand.winner = opponentId;
        default:
          // code block
      }
      if (currentHand.boardTurn >= 4) {
        const winningPlayerArray = getWinner(currentHand.playerHands[playerId], currentHand.playerHands[opponentId], currentHand.board);
        if (winningPlayerArray.length == 2) {
          console.log("split pot");
          currentHand.playerStacks[opponentId] += currentHand.potSize / 2;
          currentHand.playerStacks[playerId] += currentHand.potSize / 2;
        } else {
          const winningPlayer = winningPlayerArray[0].playerNumber == 1 ? playerId : opponentId;
          currentHand.playerStacks[winningPlayer] += currentHand.potSize;
          // can emit a message here and set a timeout to start the next hand
        }
        currentHand = updateGameStateOnHandEnd(playerId, opponentId, currentHand.playerStacks);
      }
      // emit to all clients the updated hand state
      io.emit("receiveHandState", JSON.stringify(currentHand));
    }
  });
});

httpServer.listen(process.env.PORT || 3000);

// create a callback to wait until there are two concurrent connections




