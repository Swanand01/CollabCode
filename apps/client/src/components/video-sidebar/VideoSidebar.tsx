import type { AwarenessUser, AgoraState } from '../../types';
import UserTile from './UserTile';

interface VideoSidebarProps {
  users: AwarenessUser[];
  hostUserId?: string;
  localUserId: string;
  agora: AgoraState;
}

export default function VideoSidebar({ users, hostUserId, localUserId, agora }: VideoSidebarProps) {
  const localUser = users.find(u => u.userId === localUserId);
  const remoteAwarenessUsers = users.filter(u => u.userId !== localUserId);

  return (
    <aside
      aria-label="Participants"
      className="flex w-64 shrink-0 flex-col border-l border-border bg-background"
    >
      <ul className="flex flex-col gap-px">
        {localUser ? (
          <UserTile
            user={localUser}
            isHost={localUser.userId === hostUserId}
            isLocal
            videoTrack={agora.localVideoTrack}
            cameraOn={agora.cameraOn}
            controls={{
              micOn: agora.micOn,
              onToggleMic: () => void agora.toggleMic(),
              onToggleCamera: () => void agora.toggleCamera(),
            }}
          />
        ) : null}

        {remoteAwarenessUsers.map(user => {
          const remoteAgoraUser = agora.remoteUsers.find(r => String(r.uid) === user.userId);
          const videoTrack = remoteAgoraUser?.videoTrack ?? null;

          return (
            <UserTile
              key={user.userId}
              user={user}
              isHost={user.userId === hostUserId}
              isLocal={false}
              videoTrack={videoTrack}
              cameraOn={!!videoTrack}
            />
          );
        })}
      </ul>
    </aside>
  );
}
