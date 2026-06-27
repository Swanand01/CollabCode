import { beforeEach, describe, expect, it } from 'vitest';
import { addParticipant, createRoom, _resetStore } from '../src/roomStore.js';
import { canJoinBoard, parseBoardSyncRequest } from '../src/boardSync.js';

beforeEach(() => _resetStore());

describe('parseBoardSyncRequest', () => {
  it('returns null for unrelated paths', () => {
    expect(parseBoardSyncRequest('/rooms/abc/join?userId=u1')).toBeNull();
  });

  it('returns null when userId is missing', () => {
    expect(parseBoardSyncRequest('/rooms/abc/board-sync')).toBeNull();
  });

  it('parses roomId, userId, and provided sessionId', () => {
    const parsed = parseBoardSyncRequest('/rooms/room1/board-sync?userId=u1&sessionId=s1');
    expect(parsed).toEqual({ roomId: 'room1', userId: 'u1', sessionId: 's1' });
  });

  it('generates a sessionId when one is not provided', () => {
    const parsed = parseBoardSyncRequest('/rooms/room1/board-sync?userId=u1');
    expect(parsed?.sessionId).toHaveLength(12);
  });
});

describe('canJoinBoard', () => {
  it('returns false for unknown room', () => {
    expect(canJoinBoard('missing', 'u1')).toBe(false);
  });

  it('returns false for a user who is not admitted', () => {
    const { roomId } = createRoom();
    expect(canJoinBoard(roomId, 'u1')).toBe(false);
  });

  it('returns true for an admitted participant', () => {
    const { roomId } = createRoom();
    addParticipant(roomId, { userId: 'u1', displayName: 'Alex', joinedAt: Date.now() });
    expect(canJoinBoard(roomId, 'u1')).toBe(true);
  });
});
