import { Mic, MicOff, Video, VideoOff } from 'lucide-react';
import type { ILocalVideoTrack, IRemoteVideoTrack } from 'agora-rtc-sdk-ng';
import { classesForUserId } from '../../lib/colors';
import type { AwarenessUser } from '../../types';
import VideoTile from './VideoTile';

interface TileControls {
  micOn: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
}

interface UserTileProps {
  user: AwarenessUser;
  isHost: boolean;
  isLocal: boolean;
  videoTrack: ILocalVideoTrack | IRemoteVideoTrack | null;
  cameraOn: boolean;
  controls?: TileControls;
}

export default function UserTile({
  user,
  isHost,
  isLocal,
  videoTrack,
  cameraOn,
  controls,
}: UserTileProps) {
  const cls = classesForUserId(user.userId);

  return (
    <li className="relative aspect-video w-full overflow-hidden bg-muted">
      {cameraOn && videoTrack ? (
        <VideoTile track={videoTrack} />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold text-primary-foreground ${cls.bg}`}
          >
            {user.displayName[0]?.toUpperCase() ?? '?'}
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-video-overlay/70 to-transparent px-2 pb-1.5 pt-6">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-primary-foreground drop-shadow">
            {isLocal ? 'You' : user.displayName}
          </span>
          {isHost ? <span className="text-xs text-success">host</span> : null}
        </div>

        {controls ? (
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              aria-label={controls.micOn ? 'Mute mic' : 'Unmute mic'}
              onClick={controls.onToggleMic}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-background text-foreground hover:bg-muted"
            >
              {controls.micOn ? (
                <Mic size={15} />
              ) : (
                <MicOff size={15} className="text-destructive" />
              )}
            </button>
            <button
              type="button"
              aria-label={cameraOn ? 'Turn off camera' : 'Turn on camera'}
              onClick={controls.onToggleCamera}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-background text-foreground hover:bg-muted"
            >
              {cameraOn ? <Video size={15} /> : <VideoOff size={15} className="text-destructive" />}
            </button>
          </div>
        ) : null}
      </div>
    </li>
  );
}
