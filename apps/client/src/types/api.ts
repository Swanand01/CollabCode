export interface PendingKnock {
  requestId: string;
  displayName: string;
}

export interface PingResponse {
  isHost: boolean;
  pendingKnocks?: PendingKnock[];
}

export type JoinResponse =
  | { status: 'admitted'; userId: string }
  | { requestId: string };

export type JoinStatusResponse =
  | { status: 'pending' }
  | { status: 'denied' }
  | { status: 'admitted'; userId: string };

export interface ExecuteResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
}
