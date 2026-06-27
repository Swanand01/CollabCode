import type {
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';

export type LanguageId = 'javascript' | 'typescript' | 'python' | 'go';

export interface ExecutionOutput {
  status: 'idle' | 'running' | 'success' | 'error';
  stdout: string;
  stderr: string;
  exitCode: number | null;
  language?: LanguageId;
  ranBy?: string;
  ranAt?: number;
  error?: string;
}

export interface AwarenessUser {
  userId: string;
  name: string;
  displayName: string;
  color: string;
  colorLight: string;
}

export interface AgoraState {
  localVideoTrack: ICameraVideoTrack | null;
  localAudioTrack: IMicrophoneAudioTrack | null;
  remoteUsers: IAgoraRTCRemoteUser[];
  cameraOn: boolean;
  micOn: boolean;
  toggleCamera: () => Promise<void>;
  toggleMic: () => Promise<void>;
}
