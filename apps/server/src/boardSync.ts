import type { Server as HttpServer } from 'node:http';
import { nanoid } from 'nanoid';
import { WebSocketServer } from 'ws';
import { getBoardRoom } from './boardStore.js';
import * as roomStore from './roomStore.js';
import type { BoardSyncRequest } from './types/index.js';

export function parseBoardSyncRequest(url: string): BoardSyncRequest | null {
  const parsed = new URL(url, 'http://localhost');
  const match = parsed.pathname.match(/^\/rooms\/([^/]+)\/board-sync$/);
  if (!match) return null;

  const userId = parsed.searchParams.get('userId')?.trim();
  if (!userId) return null;

  return {
    roomId: decodeURIComponent(match[1]),
    userId,
    sessionId: parsed.searchParams.get('sessionId')?.trim() || nanoid(12),
  };
}

export function canJoinBoard(roomId: string, userId: string): boolean {
  const room = roomStore.getRoom(roomId);
  return Boolean(room?.participants.has(userId));
}

export function attachBoardSync(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const parsed = parseBoardSyncRequest(req.url ?? '');
    if (!parsed || !canJoinBoard(parsed.roomId, parsed.userId)) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      void getBoardRoom(parsed.roomId)
        .then((boardRoom) => {
          boardRoom.handleSocketConnect({
            sessionId: parsed.sessionId,
            socket: ws,
            isReadonly: false,
            meta: { userId: parsed.userId },
          });
        })
        .catch(() => ws.close());
    });
  });
}
