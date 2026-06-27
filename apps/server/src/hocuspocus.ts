import { Server } from '@hocuspocus/server';
import { Database } from '@hocuspocus/extension-database';
import { Level } from 'level';
import * as store from './roomStore.js';

const db = new Level<string, Uint8Array>('./data', { valueEncoding: 'buffer' });

export const hocuspocus = Server.configure({
  port: 1234,
  extensions: [
    new Database({
      fetch: async ({ documentName }) => {
        try {
          return await db.get(documentName) as unknown as Uint8Array;
        } catch {
          return null;
        }
      },
      store: async ({ documentName, state }) => {
        await db.put(documentName, state as unknown as Uint8Array);
      },
    }),
  ],

  async onAuthenticate({ documentName, token, context }) {
    // documentName format: "editor:{roomId}" or "board:{roomId}" or "output:{roomId}"
    const roomId = documentName.split(':')[1];
    if (!roomId) throw new Error('Invalid document name');

    const room = store.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    // token is the userId — verify they are an admitted participant
    const userId = token as string;
    if (!room.participants.has(userId)) {
      throw new Error('Not admitted to room');
    }

    context.userId = userId;
    context.roomId = roomId;
  },

});
