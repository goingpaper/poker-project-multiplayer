import { randomUUID } from "node:crypto";
import { HeadsUpGame } from "./headsupEngine.js";
import type { TableRuntimeConfig } from "./tableConfig.js";

export interface Room {
  id: string;
  config: TableRuntimeConfig;
  game: HeadsUpGame;
}

/** Heads-up “open two tabs” table without using POST /api/tables. Kept when empty. */
export const DEFAULT_TABLE_ROOM_ID = "default";

const rooms = new Map<string, Room>();
/** socket.id → room id */
const socketToRoom = new Map<string, string>();
/** room id → set of socket ids (heads-up: max 2) */
const roomMembers = new Map<string, Set<string>>();

export function createRoom(config: TableRuntimeConfig): string {
  const id = randomUUID();
  rooms.set(id, {
    id,
    config,
    game: new HeadsUpGame(config),
  });
  roomMembers.set(id, new Set());
  return id;
}

/** Idempotent — used for the persistent default table. */
export function ensureRoom(roomId: string, config: TableRuntimeConfig): void {
  if (rooms.has(roomId)) {
    return;
  }
  rooms.set(roomId, {
    id: roomId,
    config,
    game: new HeadsUpGame(config),
  });
  roomMembers.set(roomId, new Set());
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

export function deleteRoom(roomId: string): void {
  rooms.delete(roomId);
  roomMembers.delete(roomId);
}

export function roomPlayerCount(roomId: string): number {
  return roomMembers.get(roomId)?.size ?? 0;
}

export function joinRoom(roomId: string, socketId: string): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;
  const members = roomMembers.get(roomId);
  if (!members || members.size >= 2) return false;
  members.add(socketId);
  socketToRoom.set(socketId, roomId);
  return true;
}

export function leaveRoom(socketId: string): string | undefined {
  const roomId = socketToRoom.get(socketId);
  if (roomId === undefined) return undefined;
  socketToRoom.delete(socketId);
  const members = roomMembers.get(roomId);
  members?.delete(socketId);
  if (members && members.size === 0 && roomId !== DEFAULT_TABLE_ROOM_ID) {
    deleteRoom(roomId);
  }
  return roomId;
}

export function getRoomIdForSocket(socketId: string): string | undefined {
  return socketToRoom.get(socketId);
}

export function getRoomMemberIds(roomId: string): string[] {
  return Array.from(roomMembers.get(roomId) ?? []).sort();
}

/** When fewer than two players remain, clear engine state so the next pairing starts fresh. */
export function resetRoomGameIfShortHanded(roomId: string): void {
  const room = rooms.get(roomId);
  if (!room) {
    return;
  }
  if (roomPlayerCount(roomId) < 2) {
    room.game = new HeadsUpGame(room.config);
  }
}
