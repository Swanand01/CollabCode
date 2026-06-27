export type BoardSessionMeta = {
  userId: string;
};

export interface BoardSyncRequest {
  roomId: string;
  userId: string;
  sessionId: string;
}
