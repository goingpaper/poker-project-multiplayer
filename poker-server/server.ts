import http from "http";
import type { Socket } from "socket.io";
import { Server } from "socket.io";
import { parsePlayerActionJson } from "./game/playerAction.js";
import {
  DEFAULT_TABLE_ROOM_ID,
  ensureRoom,
  getRoom,
  getRoomIdForSocket,
  getRoomMemberIds,
  joinRoom,
  leaveRoom,
  resetRoomGameIfShortHanded,
  roomPlayerCount,
} from "./game/rooms.js";
import { tableConfigFromEnv, tableConfigPayload } from "./game/tableConfig.js";
import { handleCreateTableApi } from "./http/createTableApi.js";

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

const defaultEnvConfig = tableConfigFromEnv();
console.log(
  "default env table (used as merge base for POST /api/tables):",
  defaultEnvConfig.variant,
  defaultEnvConfig.format,
  defaultEnvConfig.bettingStructure,
  `${defaultEnvConfig.smallBlind}/${defaultEnvConfig.bigBlind}`,
);

ensureRoom(DEFAULT_TABLE_ROOM_ID, defaultEnvConfig);

httpServer.on("request", (req, res) => {
  void (async () => {
    if (await handleCreateTableApi(req, res)) {
      return;
    }
  })();
});

function attachSocketHandlers(socket: Socket, roomId: string): void {
  socket.on("playerAction", (action: string) => {
    const rid = getRoomIdForSocket(socket.id);
    if (rid !== roomId || rid === undefined) {
      return;
    }
    const room = getRoom(roomId);
    if (!room) {
      return;
    }
    const parsed = parsePlayerActionJson(action);
    if (!parsed.ok) {
      return;
    }
    const result = room.game.applyAction(socket.id, parsed.action);
    if (!result.ok) {
      return;
    }
    io.to(roomId).emit("receiveHandState", JSON.stringify(result.snapshot));
  });
}

io.on("connection", (socket) => {
  const q = socket.handshake.query;
  const raw =
    typeof q.room === "string" ? q.room : Array.isArray(q.room) ? q.room[0] : "";
  const roomId = (raw && String(raw).trim()) || DEFAULT_TABLE_ROOM_ID;

  const room = getRoom(roomId);
  if (room === undefined) {
    socket.emit("joinError", { reason: "invalid_room" });
    socket.disconnect(true);
    return;
  }

  if (!joinRoom(roomId, socket.id)) {
    socket.emit("joinError", {
      reason: roomPlayerCount(roomId) >= 2 ? "room_full" : "join_failed",
    });
    socket.disconnect(true);
    return;
  }

  void socket.join(roomId);

  socket.emit("tableConfig", tableConfigPayload(room.config));
  socket.emit("playerConnected", socket.id);

  socket.on("disconnect", () => {
    const rid = getRoomIdForSocket(socket.id);
    leaveRoom(socket.id);
    if (rid !== undefined) {
      resetRoomGameIfShortHanded(rid);
      io.to(rid).emit("playerleft");
    }
  });

  attachSocketHandlers(socket, roomId);

  if (roomPlayerCount(roomId) === 2 && room.game.getSnapshot() == null) {
    io.to(roomId).emit("started");
    const players = getRoomMemberIds(roomId);
    if (players.length === 2) {
      const snapshot = room.game.startHand(players[0]!, players[1]!);
      io.to(roomId).emit("receiveHandState", JSON.stringify(snapshot));
    }
  }
});

httpServer.listen(PORT, () => {
  console.log(`poker server listening on http://localhost:${PORT}`);
});
