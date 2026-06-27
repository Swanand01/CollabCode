import { InMemorySyncStorage, TLSocketRoom, type RoomSnapshot } from '@tldraw/sync-core';
import {
  createTLSchema,
  defaultBindingSchemas,
  defaultShapeSchemas,
  type TLRecord,
} from '@tldraw/tlschema';
import { Level } from 'level';
import type { BoardSessionMeta } from './types/index.js';

const boardDb = new Level<string, RoomSnapshot>('./data/tldraw', { valueEncoding: 'json' });
const boardRooms = new Map<string, TLSocketRoom<TLRecord, BoardSessionMeta>>();
const boardRoomPending = new Map<string, Promise<TLSocketRoom<TLRecord, BoardSessionMeta>>>();
const schema = createTLSchema({
  shapes: defaultShapeSchemas,
  bindings: defaultBindingSchemas,
});

export async function getBoardRoom(
  roomId: string,
): Promise<TLSocketRoom<TLRecord, BoardSessionMeta>> {
  const existing = boardRooms.get(roomId);
  if (existing && !existing.isClosed()) return existing;

  const inflight = boardRoomPending.get(roomId);
  if (inflight) return inflight;

  const init = (async () => {
    const snapshot = await loadSnapshot(roomId);
    const storage = new InMemorySyncStorage<TLRecord>({
      snapshot,
      onChange() {
        void boardDb.put(roomId, storage.getSnapshot());
      },
    });

    const boardRoom = new TLSocketRoom<TLRecord, BoardSessionMeta>({
      schema,
      storage,
      onSessionRemoved: (_room, { numSessionsRemaining }) => {
        if (numSessionsRemaining === 0) {
          boardRoom.close();
          boardRooms.delete(roomId);
        }
      },
    });

    boardRooms.set(roomId, boardRoom);
    boardRoomPending.delete(roomId);
    return boardRoom;
  })();

  boardRoomPending.set(roomId, init);
  return init;
}

async function loadSnapshot(roomId: string): Promise<RoomSnapshot | undefined> {
  try {
    return await boardDb.get(roomId);
  } catch {
    return undefined;
  }
}

export function _getBoardRoomCountForTests(): number {
  return boardRooms.size;
}

export function _resetBoardRoomsForTests(): void {
  for (const room of boardRooms.values()) {
    room.close();
  }
  boardRooms.clear();
  boardRoomPending.clear();
}
