import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app, _resetExecuteRateLimitsForTests } from '../src/roomApi.js';
import { _resetStore } from '../src/roomStore.js';

beforeEach(() => {
  _resetStore();
  _resetExecuteRateLimitsForTests();
  vi.restoreAllMocks();
});

describe('POST /rooms', () => {
  it('creates a room and returns roomId + hostSecret', async () => {
    const res = await request(app).post('/rooms').expect(200);
    expect(res.body.roomId).toHaveLength(12);
    expect(res.body.hostSecret).toHaveLength(21);
  });
});

describe('GET /rooms/:id', () => {
  it('returns 404 for unknown room', async () => {
    await request(app).get('/rooms/doesnotexist').expect(404);
  });

  it('returns room info for valid room', async () => {
    const { body } = await request(app).post('/rooms');
    const res = await request(app).get(`/rooms/${body.roomId}`).expect(200);
    expect(res.body.roomId).toBe(body.roomId);
    expect(res.body.participantCount).toBe(0);
  });
});

describe('POST /rooms/:id/join', () => {
  it('returns 404 for unknown room', async () => {
    await request(app)
      .post('/rooms/nope/join')
      .send({ displayName: 'Sam' })
      .expect(404);
  });

  it('admits host immediately when hostSecret matches', async () => {
    const { body: room } = await request(app).post('/rooms');
    const res = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Host', hostSecret: room.hostSecret })
      .expect(200);
    expect(res.body.status).toBe('admitted');
    expect(res.body.userId).toBeDefined();
  });

  it('returns 403 when room is full', async () => {
    const { body: room } = await request(app).post('/rooms');
    await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Host', hostSecret: room.hostSecret });
    const { _resetStore: _, ...storeModule } = await import('../src/roomStore.js');
    for (let i = 0; i < 9; i++) {
      storeModule.addParticipant(room.roomId, {
        userId: `u${i}`, displayName: `P${i}`, joinedAt: Date.now(),
      });
    }
    const res = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Overflow' })
      .expect(403);
    expect(res.body.error).toMatch(/full/i);
  });

  it('returns requestId for non-host joiner', async () => {
    const { body: room } = await request(app).post('/rooms');
    const res = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Alex' })
      .expect(200);
    expect(res.body.requestId).toBeDefined();
    expect(res.body.status).toBeUndefined();
  });

  it('returns the same pending requestId for duplicate pending displayName', async () => {
    const { body: room } = await request(app).post('/rooms');
    const first = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Alex' })
      .expect(200);
    const second = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: ' alex ' })
      .expect(200);

    expect(second.body.requestId).toBe(first.body.requestId);
  });

  it('rejects non-host joiner when displayName is already admitted', async () => {
    const { body: room } = await request(app).post('/rooms');
    await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Host', hostSecret: room.hostSecret });

    const res = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'host' })
      .expect(409);

    expect(res.body.error).toMatch(/display name/i);
  });

  it('returns the same userId when host join is repeated with same displayName', async () => {
    const { body: room } = await request(app).post('/rooms');
    const first = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Host', hostSecret: room.hostSecret })
      .expect(200);
    const second = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: ' host ', hostSecret: room.hostSecret })
      .expect(200);
    const roomInfo = await request(app).get(`/rooms/${room.roomId}`);

    expect(second.body.userId).toBe(first.body.userId);
    expect(roomInfo.body.participantCount).toBe(1);
  });

  it('returns 400 when displayName is missing', async () => {
    const { body: room } = await request(app).post('/rooms');
    await request(app).post(`/rooms/${room.roomId}/join`).send({}).expect(400);
  });
});

describe('GET /rooms/:id/join-status/:requestId', () => {
  it('returns pending status while waiting', async () => {
    const { body: room } = await request(app).post('/rooms');
    const { body: join } = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Alex' });
    const res = await request(app)
      .get(`/rooms/${room.roomId}/join-status/${join.requestId}`)
      .expect(200);
    expect(res.body.status).toBe('pending');
  });

  it('returns admitted status after host admits', async () => {
    const { body: room } = await request(app).post('/rooms');
    await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Host', hostSecret: room.hostSecret });
    const { body: join } = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Alex' });
    await request(app)
      .post(`/rooms/${room.roomId}/admit`)
      .send({ requestId: join.requestId, decision: 'admit', hostSecret: room.hostSecret });
    const res = await request(app)
      .get(`/rooms/${room.roomId}/join-status/${join.requestId}`)
      .expect(200);
    expect(res.body.status).toBe('admitted');
    expect(res.body.userId).toBeDefined();
  });

  it('returns 404 for unknown requestId', async () => {
    const { body: room } = await request(app).post('/rooms');
    await request(app)
      .get(`/rooms/${room.roomId}/join-status/doesnotexist`)
      .expect(404);
  });
});

describe('POST /rooms/:id/admit', () => {
  it('returns 403 when hostSecret is wrong', async () => {
    const { body: room } = await request(app).post('/rooms');
    const { body: join } = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Alex' });
    await request(app)
      .post(`/rooms/${room.roomId}/admit`)
      .send({ requestId: join.requestId, decision: 'admit', hostSecret: 'wrong' })
      .expect(403);
  });

  it('admits joiner and adds them as participant', async () => {
    const { body: room } = await request(app).post('/rooms');
    await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Host', hostSecret: room.hostSecret });
    const { body: join } = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Alex' });
    const res = await request(app)
      .post(`/rooms/${room.roomId}/admit`)
      .send({ requestId: join.requestId, decision: 'admit', hostSecret: room.hostSecret })
      .expect(200);
    expect(res.body.ok).toBe(true);
    const roomInfo = await request(app).get(`/rooms/${room.roomId}`);
    expect(roomInfo.body.participantCount).toBe(2);
  });

  it('denies joiner and does not add them as participant', async () => {
    const { body: room } = await request(app).post('/rooms');
    await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Host', hostSecret: room.hostSecret });
    const { body: join } = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Alex' });
    await request(app)
      .post(`/rooms/${room.roomId}/admit`)
      .send({ requestId: join.requestId, decision: 'deny', hostSecret: room.hostSecret })
      .expect(200);
    const roomInfo = await request(app).get(`/rooms/${room.roomId}`);
    expect(roomInfo.body.participantCount).toBe(1);
  });

  it('returns 404 for already-resolved request', async () => {
    const { body: room } = await request(app).post('/rooms');
    const { body: join } = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Alex' });
    await request(app)
      .post(`/rooms/${room.roomId}/admit`)
      .send({ requestId: join.requestId, decision: 'admit', hostSecret: room.hostSecret });
    await request(app)
      .post(`/rooms/${room.roomId}/admit`)
      .send({ requestId: join.requestId, decision: 'admit', hostSecret: room.hostSecret })
      .expect(404);
  });
});

describe('GET /rooms/:id/ping', () => {
  it('returns isHost true for the host participant', async () => {
    const { body: room } = await request(app).post('/rooms');
    const { body: join } = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Host', hostSecret: room.hostSecret });
    const res = await request(app)
      .get(`/rooms/${room.roomId}/ping?userId=${join.userId}`)
      .expect(200);
    expect(res.body.isHost).toBe(true);
  });

  it('returns pendingKnocks only for host', async () => {
    const { body: room } = await request(app).post('/rooms');
    const { body: join } = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Host', hostSecret: room.hostSecret });
    await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Alex' });
    const res = await request(app)
      .get(`/rooms/${room.roomId}/ping?userId=${join.userId}`)
      .expect(200);
    expect(res.body.pendingKnocks).toHaveLength(1);
    expect(res.body.pendingKnocks[0].displayName).toBe('Alex');
  });

  it('returns isHost false and no pendingKnocks for non-host', async () => {
    const { body: room } = await request(app).post('/rooms');
    await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Host', hostSecret: room.hostSecret });
    const { body: knock } = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Alex' });
    await request(app)
      .post(`/rooms/${room.roomId}/admit`)
      .send({ requestId: knock.requestId, decision: 'admit', hostSecret: room.hostSecret });
    const { body: pollJoin } = await request(app)
      .get(`/rooms/${room.roomId}/join-status/${knock.requestId}`);
    const res = await request(app)
      .get(`/rooms/${room.roomId}/ping?userId=${pollJoin.userId}`)
      .expect(200);
    expect(res.body.isHost).toBe(false);
    expect(res.body.pendingKnocks).toBeUndefined();
  });
});

describe('POST /rooms/:id/execute', () => {
  it('returns 404 for unknown room', async () => {
    await request(app)
      .post('/rooms/missing/execute')
      .send({ userId: 'u1', language: 'javascript', code: 'console.log(1)' })
      .expect(404);
  });

  it('requires an admitted participant', async () => {
    const { body: room } = await request(app).post('/rooms');

    await request(app)
      .post(`/rooms/${room.roomId}/execute`)
      .send({ userId: 'missing', language: 'javascript', code: 'console.log(1)' })
      .expect(403);
  });

  it('proxies execution to Piston and normalizes output', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          run: { stdout: 'hello\n', stderr: '', code: 0 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const { body: room } = await request(app).post('/rooms');
    const { body: host } = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Host', hostSecret: room.hostSecret });

    const res = await request(app)
      .post(`/rooms/${room.roomId}/execute`)
      .send({ userId: host.userId, language: 'javascript', code: 'console.log(\"hello\")' })
      .expect(200);

    expect(res.body).toEqual({ stdout: 'hello\n', stderr: '', exitCode: 0 });
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:2000/api/v2/execute',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"language":"javascript"'),
      }),
    );
  });

  it('rate limits executions per room', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ run: { stdout: '', stderr: '', code: 0 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const { body: room } = await request(app).post('/rooms');
    const { body: host } = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Host', hostSecret: room.hostSecret });

    await request(app)
      .post(`/rooms/${room.roomId}/execute`)
      .send({ userId: host.userId, language: 'python', code: 'print(1)' })
      .expect(200);
    const limited = await request(app)
      .post(`/rooms/${room.roomId}/execute`)
      .send({ userId: host.userId, language: 'python', code: 'print(2)' })
      .expect(429);

    expect(limited.body.retryAfterMs).toBeGreaterThan(0);
  });

  it('returns 503 when Piston is unavailable', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 500 }));
    const { body: room } = await request(app).post('/rooms');
    const { body: host } = await request(app)
      .post(`/rooms/${room.roomId}/join`)
      .send({ displayName: 'Host', hostSecret: room.hostSecret });

    const res = await request(app)
      .post(`/rooms/${room.roomId}/execute`)
      .send({ userId: host.userId, language: 'go', code: 'package main' })
      .expect(503);

    expect(res.body.error).toMatch(/unavailable/i);
  });
});
