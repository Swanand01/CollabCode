export interface Participant {
  userId: string;
  displayName: string;
  joinedAt: number;
  lastSeen: number;
}

export interface KnockRequest {
  requestId: string;
  displayName: string;
  status: 'pending' | 'admitted' | 'denied';
  userId: string;
  createdAt: number;
}

export interface Room {
  roomId: string;
  hostSecret: string;
  hostUserId: string | null;
  participants: Map<string, Participant>;
  knockRequests: Map<string, KnockRequest>;
  createdAt: number;
  lastActiveAt: number;
}
