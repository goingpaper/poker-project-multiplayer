import http from "http";
import { Server } from "socket.io";
import { RAISE, CALL, FOLD, CHECK } from "./constants.js";
import updateGameStateOnHandEnd from "./util/createhand.js";
import getWinner from "./util/getwinner.js";

const PORT = Number(process.env.PORT) || 3001;
const corsOrigin =
  process.env.CORS_ORIGIN === undefined || process.env.CORS_ORIGIN === ""
    ? true
    : process.env.CORS_ORIGIN.split(",").map((s) => s.trim());

const httpServer = http.createServer();
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
  },
});

const connected = {};
let currentHand = null;

const getOpponentId = (currentSocketId) => {
  const others = Object.keys(connected).filter((id) => id !== currentSocketId);
  return others[0];
};

io.on("connection", (socket) => {
  if (Object.keys(connected).length === 2) {
    return;
  }

  connected[socket.id] = socket;
  console.log("players connected:", Object.keys(connected).length);
  socket.emit("playerConnected", socket.id);

  socket.on("disconnect", () => {
    delete connected[socket.id];
    socket.broadcast.emit("playerleft");
  });

  if (Object.keys(connected).length === 2) {
    io.emit("started");
    const players = Object.keys(connected);
    currentHand = updateGameStateOnHandEnd(players[0], players[1]);
    io.emit("receiveHandState", JSON.stringify(currentHand));
  }

  socket.on("playerAction", (action) => {
    const actionParsed = JSON.parse(action);
    if (currentHand == null || currentHand.playerTurn !== socket.id) {
      return;
    }

    const playerId = socket.id;
    const opponentId = getOpponentId(playerId);

    switch (actionParsed.actionType) {
      case CALL: {
        const callDifference =
          currentHand.currentTurnBets[opponentId] - currentHand.currentTurnBets[playerId];
        const callAmount =
          currentHand.playerStacks[playerId] < callDifference
            ? currentHand.playerStacks[playerId]
            : callDifference;
        currentHand.playerStacks[playerId] -= callAmount;
        currentHand.potSize += callAmount;
        currentHand.currentTurnBets[playerId] += callAmount;
        if (currentHand.lastRaiser == null) {
          currentHand.playerTurn = opponentId;
        } else {
          currentHand.playerTurn = currentHand.bigBlindPlayer;
          currentHand.boardTurn += 1;
          currentHand.currentTurnBets = {
            [playerId]: 0,
            [opponentId]: 0,
          };
          currentHand.lastRaiser = null;
        }
        if (currentHand.playerStacks[playerId] === 0 || currentHand.playerStacks[opponentId] === 0) {
          currentHand.boardTurn = 4;
        }
        break;
      }
      case CHECK: {
        if (currentHand.boardTurn === 0 && currentHand.bigBlindPlayer === playerId) {
          currentHand.playerTurn = currentHand.bigBlindPlayer;
          currentHand.boardTurn += 1;
          currentHand.currentTurnBets = {
            [playerId]: 0,
            [opponentId]: 0,
          };
        } else if (currentHand.bigBlindPlayer === playerId) {
          currentHand.playerTurn = opponentId;
        } else {
          currentHand.playerTurn = currentHand.bigBlindPlayer;
          currentHand.boardTurn += 1;
        }
        break;
      }
      case RAISE: {
        const raiseSize = actionParsed.betSize - currentHand.currentTurnBets[playerId];
        currentHand.currentTurnBets[playerId] = actionParsed.betSize;
        currentHand.playerStacks[playerId] -= raiseSize;
        currentHand.playerTurn = opponentId;
        currentHand.potSize += raiseSize;
        currentHand.lastRaiser = playerId;
        break;
      }
      case FOLD: {
        currentHand.playerStacks[opponentId] += currentHand.potSize;
        currentHand = updateGameStateOnHandEnd(playerId, opponentId, currentHand.playerStacks);
        currentHand.winner = opponentId;
        break;
      }
      default:
        break;
    }

    if (currentHand.boardTurn >= 4) {
      const winningPlayerArray = getWinner(
        currentHand.playerHands[playerId],
        currentHand.playerHands[opponentId],
        currentHand.board,
      );
      if (winningPlayerArray.length === 2) {
        currentHand.playerStacks[opponentId] += currentHand.potSize / 2;
        currentHand.playerStacks[playerId] += currentHand.potSize / 2;
      } else {
        const winningPlayer =
          winningPlayerArray[0].playerNumber === 1 ? playerId : opponentId;
        currentHand.playerStacks[winningPlayer] += currentHand.potSize;
      }
      currentHand = updateGameStateOnHandEnd(playerId, opponentId, currentHand.playerStacks);
    }

    io.emit("receiveHandState", JSON.stringify(currentHand));
  });
});

httpServer.listen(PORT, () => {
  console.log(`poker server listening on http://localhost:${PORT}`);
});
