import { nanoid } from 'nanoid';
import type { Room, Participant, KnockRequest } from './types/index.js';

const rooms = new Map<string, Room>();

const ALPHA = 'abcdefghijklmnopqrstuvwxyz';

function randomSegment(len: number): string {
  return Array.from({ length: len }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');
}

function generateRoomId(): string {
  return `${randomSegment(3)}-${randomSegment(4)}-${randomSegment(3)}`;
}

export function createRoom(): { roomId: string; hostSecret: string } {
  let roomId = generateRoomId();
  while (rooms.has(roomId)) roomId = generateRoomId();
  const hostSecret = nanoid(21);
  rooms.set(roomId, {
    roomId,
    hostSecret,
    hostUserId: null,
    participants: new Map(),
    knockRequests: new Map(),
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
  });
  return { roomId, hostSecret };
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

export function addParticipant(roomId: string, p: Omit<Participant, 'lastSeen'>): void {
  const room = rooms.get(roomId);
  if (!room) return;
  room.participants.set(p.userId, { ...p, lastSeen: Date.now() });
  room.lastActiveAt = Date.now();
}

function normalizeDisplayName(displayName: string): string {
  return displayName.trim().toLowerCase();
}

export function getParticipantByDisplayName(
  roomId: string,
  displayName: string,
): Participant | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  const normalized = normalizeDisplayName(displayName);
  return (
    [...room.participants.values()].find(
      participant => normalizeDisplayName(participant.displayName) === normalized,
    ) ?? null
  );
}

export function removeParticipant(roomId: string, userId: string): string | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  const wasHost = room.hostUserId === userId;
  room.participants.delete(userId);
  room.lastActiveAt = Date.now();
  if (!wasHost) return null;
  const oldest = [...room.participants.values()].sort((a, b) => a.joinedAt - b.joinedAt)[0];
  room.hostUserId = oldest?.userId ?? null;
  return room.hostUserId;
}

export function createKnockRequest(roomId: string, displayName: string): KnockRequest | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  const existingPending = getPendingKnockByDisplayName(roomId, displayName);
  if (existingPending) return existingPending;

  const request: KnockRequest = {
    requestId: nanoid(10),
    displayName,
    status: 'pending',
    userId: nanoid(10),
    createdAt: Date.now(),
  };
  room.knockRequests.set(request.requestId, request);
  return request;
}

export function getPendingKnockByDisplayName(
  roomId: string,
  displayName: string,
): KnockRequest | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  const normalized = normalizeDisplayName(displayName);
  return (
    [...room.knockRequests.values()].find(
      request =>
        request.status === 'pending' && normalizeDisplayName(request.displayName) === normalized,
    ) ?? null
  );
}

export function resolveKnockRequest(
  roomId: string,
  requestId: string,
  decision: 'admit' | 'deny',
): KnockRequest | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  const request = room.knockRequests.get(requestId);
  if (!request || request.status !== 'pending') return null;
  request.status = decision === 'admit' ? 'admitted' : 'denied';
  return request;
}

export function getKnockRequest(roomId: string, requestId: string): KnockRequest | null {
  return rooms.get(roomId)?.knockRequests.get(requestId) ?? null;
}

export function getPendingKnocks(roomId: string): KnockRequest[] {
  const room = rooms.get(roomId);
  if (!room) return [];
  return [...room.knockRequests.values()].filter(r => r.status === 'pending');
}

const PARTICIPANT_TIMEOUT_MS = 30_000;

export function heartbeat(roomId: string, userId: string): Room | null {
  const room = rooms.get(roomId);
  if (!room) return null;
  const now = Date.now();

  const participant = room.participants.get(userId);
  if (participant) {
    participant.lastSeen = now;
    room.lastActiveAt = now;
  }

  // Evict participants who haven't sent a heartbeat recently
  for (const [pid, p] of room.participants) {
    if (now - p.lastSeen > PARTICIPANT_TIMEOUT_MS) {
      room.participants.delete(pid);
    }
  }

  // Promote a new host if the current one was evicted
  if (room.hostUserId && !room.participants.has(room.hostUserId)) {
    const oldest = [...room.participants.values()].sort((a, b) => a.joinedAt - b.joinedAt)[0];
    room.hostUserId = oldest?.userId ?? null;
  }

  return room;
}

const TTL_MS = 24 * 60 * 60 * 1000;

export function cleanupExpiredRooms(): void {
  const now = Date.now();
  for (const [roomId, room] of rooms) {
    if (room.participants.size === 0 && now - room.lastActiveAt > TTL_MS) {
      rooms.delete(roomId);
    }
  }
}

export function _resetStore(): void {
  rooms.clear();
}
