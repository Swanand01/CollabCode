import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {
  admit,
  createRoom,
  executeCode,
  joinRoom,
  ping,
  pollJoinStatus,
  validateRoom,
} from '../lib/api';

const server = setupServer(
  http.post('/rooms', () =>
    HttpResponse.json({ roomId: 'abc1234567', hostSecret: 'secret123456789012345' }),
  ),
  http.get('/rooms/:id', ({ params }) =>
    params.id === 'abc1234567'
      ? HttpResponse.json({ roomId: 'abc1234567', participantCount: 1 })
      : new HttpResponse(null, { status: 404 }),
  ),
  http.post('/rooms/:id/join', () => HttpResponse.json({ status: 'admitted', userId: 'u1' })),
  http.get('/rooms/:id/join-status/:requestId', () =>
    HttpResponse.json({ status: 'pending' }),
  ),
  http.get('/rooms/:id/ping', () => HttpResponse.json({ isHost: true, pendingKnocks: [] })),
  http.post('/rooms/:id/admit', () => HttpResponse.json({ ok: true })),
  http.post('/rooms/:id/execute', () =>
    HttpResponse.json({ stdout: 'hello\n', stderr: '', exitCode: 0 }),
  ),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('createRoom', () => {
  it('returns roomId and hostSecret', async () => {
    const result = await createRoom();
    expect(result.roomId).toBe('abc1234567');
    expect(result.hostSecret).toBeDefined();
  });
});

describe('validateRoom', () => {
  it('returns true for existing room', async () => {
    expect(await validateRoom('abc1234567')).toBe(true);
  });

  it('returns false for unknown room', async () => {
    expect(await validateRoom('nope')).toBe(false);
  });
});

describe('joinRoom', () => {
  it('returns admitted response', async () => {
    const result = await joinRoom('abc1234567', 'Sam', 'secret');
    expect('status' in result && result.status).toBe('admitted');
  });
});

describe('pollJoinStatus', () => {
  it('returns status', async () => {
    const result = await pollJoinStatus('abc1234567', 'req1');
    expect(result.status).toBe('pending');
  });
});

describe('ping', () => {
  it('returns isHost and pendingKnocks', async () => {
    const result = await ping('abc1234567', 'u1');
    expect(result.isHost).toBe(true);
    expect(result.pendingKnocks).toEqual([]);
  });
});

describe('admit', () => {
  it('posts admit decision', async () => {
    const result = await admit('abc1234567', 'req1', 'admit', 'secret');
    expect(result.ok).toBe(true);
  });
});

describe('executeCode', () => {
  it('posts code execution requests', async () => {
    const result = await executeCode('abc1234567', 'u1', 'javascript', 'console.log("hello")');
    expect(result).toEqual({ stdout: 'hello\n', stderr: '', exitCode: 0 });
  });
});
