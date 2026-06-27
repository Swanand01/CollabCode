// apps/server/tests/roomStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createRoom,
  getRoom,
  addParticipant,
  removeParticipant,
  createKnockRequest,
  resolveKnockRequest,
  getKnockRequest,
  getPendingKnocks,
  heartbeat,
  cleanupExpiredRooms,
  _resetStore,
} from '../src/roomStore.js';

beforeEach(() => {
  _resetStore();
});

describe('createRoom', () => {
  it('returns roomId and hostSecret', () => {
    const { roomId, hostSecret } = createRoom();
    expect(roomId).toHaveLength(12);
    expect(hostSecret).toHaveLength(21);
  });

  it('creates distinct rooms on each call', () => {
    const a = createRoom();
    const b = createRoom();
    expect(a.roomId).not.toBe(b.roomId);
    expect(a.hostSecret).not.toBe(b.hostSecret);
  });
});

describe('addParticipant + getRoom', () => {
  it('room starts with zero participants', () => {
    const { roomId } = createRoom();
    expect(getRoom(roomId)!.participants.size).toBe(0);
  });

  it('adds participant to room', () => {
    const { roomId } = createRoom();
    addParticipant(roomId, { userId: 'u1', displayName: 'Sam', joinedAt: Date.now() });
    expect(getRoom(roomId)!.participants.get('u1')!.displayName).toBe('Sam');
  });
});

describe('removeParticipant + host promotion', () => {
  it('returns null when non-host leaves', () => {
    const { roomId } = createRoom();
    addParticipant(roomId, { userId: 'host', displayName: 'Host', joinedAt: 1000 });
    addParticipant(roomId, { userId: 'other', displayName: 'Other', joinedAt: 2000 });
    getRoom(roomId)!.hostUserId = 'host';
    const newHost = removeParticipant(roomId, 'other');
    expect(newHost).toBeNull();
  });

  it('promotes oldest remaining when host leaves', () => {
    const { roomId } = createRoom();
    addParticipant(roomId, { userId: 'host', displayName: 'Host', joinedAt: 1000 });
    addParticipant(roomId, { userId: 'p1', displayName: 'P1', joinedAt: 2000 });
    addParticipant(roomId, { userId: 'p2', displayName: 'P2', joinedAt: 3000 });
    getRoom(roomId)!.hostUserId = 'host';
    const newHost = removeParticipant(roomId, 'host');
    expect(newHost).toBe('p1');
    expect(getRoom(roomId)!.hostUserId).toBe('p1');
  });

  it('returns null and sets hostUserId to null when host is last participant', () => {
    const { roomId } = createRoom();
    addParticipant(roomId, { userId: 'host', displayName: 'Host', joinedAt: 1000 });
    getRoom(roomId)!.hostUserId = 'host';
    const newHost = removeParticipant(roomId, 'host');
    expect(newHost).toBeNull();
    expect(getRoom(roomId)!.hostUserId).toBeNull();
  });
});

describe('knock requests', () => {
  it('creates and retrieves a knock request', () => {
    const { roomId } = createRoom();
    const knock = createKnockRequest(roomId, 'Alex');
    expect(knock).not.toBeNull();
    expect(knock!.displayName).toBe('Alex');
    expect(knock!.status).toBe('pending');
    expect(getKnockRequest(roomId, knock!.requestId)).toEqual(knock);
  });

  it('resolves knock to admitted', () => {
    const { roomId } = createRoom();
    const knock = createKnockRequest(roomId, 'Alex')!;
    const resolved = resolveKnockRequest(roomId, knock.requestId, 'admit');
    expect(resolved!.status).toBe('admitted');
  });

  it('resolves knock to denied', () => {
    const { roomId } = createRoom();
    const knock = createKnockRequest(roomId, 'Alex')!;
    resolveKnockRequest(roomId, knock.requestId, 'deny');
    expect(getKnockRequest(roomId, knock.requestId)!.status).toBe('denied');
  });

  it('getPendingKnocks returns only pending ones', () => {
    const { roomId } = createRoom();
    const k1 = createKnockRequest(roomId, 'A')!;
    const k2 = createKnockRequest(roomId, 'B')!;
    resolveKnockRequest(roomId, k1.requestId, 'admit');
    const pending = getPendingKnocks(roomId);
    expect(pending).toHaveLength(1);
    expect(pending[0].requestId).toBe(k2.requestId);
  });

  it('returns null when resolving an already-resolved request', () => {
    const { roomId } = createRoom();
    const knock = createKnockRequest(roomId, 'Alex')!;
    resolveKnockRequest(roomId, knock.requestId, 'admit');
    const result = resolveKnockRequest(roomId, knock.requestId, 'deny');
    expect(result).toBeNull();
    expect(getKnockRequest(roomId, knock.requestId)!.status).toBe('admitted');
  });
});

describe('heartbeat + host promotion via timeout', () => {
  it('returns the room on valid heartbeat', () => {
    const { roomId } = createRoom();
    addParticipant(roomId, { userId: 'u1', displayName: 'U1', joinedAt: Date.now() });
    const room = heartbeat(roomId, 'u1');
    expect(room).not.toBeNull();
  });

  it('promotes participant when host lastSeen is stale', () => {
    const { roomId } = createRoom();
    const now = Date.now();
    addParticipant(roomId, { userId: 'host', displayName: 'Host', joinedAt: now - 60000 });
    addParticipant(roomId, { userId: 'p1', displayName: 'P1', joinedAt: now - 50000 });
    const room = getRoom(roomId)!;
    room.hostUserId = 'host';
    room.participants.get('host')!.lastSeen = now - 40000;
    room.participants.get('p1')!.lastSeen = now;
    heartbeat(roomId, 'p1');
    expect(getRoom(roomId)!.hostUserId).toBe('p1');
  });

  it('returns null for unknown room', () => {
    expect(heartbeat('unknownroom', 'u1')).toBeNull();
  });

  it('returns room when userId is not a participant', () => {
    const { roomId } = createRoom();
    const room = heartbeat(roomId, 'nonexistent');
    expect(room).not.toBeNull();
  });
});

describe('cleanupExpiredRooms', () => {
  it('removes rooms with no participants inactive for over 24h', () => {
    const { roomId } = createRoom();
    const room = getRoom(roomId)!;
    room.lastActiveAt = Date.now() - 25 * 60 * 60 * 1000;
    cleanupExpiredRooms();
    expect(getRoom(roomId)).toBeUndefined();
  });

  it('keeps rooms with active participants', () => {
    const { roomId } = createRoom();
    addParticipant(roomId, { userId: 'u1', displayName: 'U', joinedAt: Date.now() });
    getRoom(roomId)!.lastActiveAt = Date.now() - 25 * 60 * 60 * 1000;
    cleanupExpiredRooms();
    expect(getRoom(roomId)).toBeDefined();
  });
});
