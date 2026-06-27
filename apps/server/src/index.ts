import { createServer } from 'node:http';
import { app } from './roomApi.js';
import { hocuspocus } from './hocuspocus.js';
import { cleanupExpiredRooms } from './roomStore.js';
import { attachBoardSync } from './boardSync.js';

const PORT = 3000;
const httpServer = createServer(app);

attachBoardSync(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Room API listening on http://localhost:${PORT}`);
  console.log(`Board sync listening on ws://localhost:${PORT}/rooms/:roomId/board-sync`);
});

hocuspocus.listen().then(() => {
  console.log('Hocuspocus listening on ws://localhost:1234');
});

setInterval(cleanupExpiredRooms, 60 * 60 * 1000);
