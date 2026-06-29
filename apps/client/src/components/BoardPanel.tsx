import { Tldraw, createTLUser, defaultUserPreferences } from 'tldraw';
import { atom } from '@tldraw/state';
import { useMemo } from 'react';
import { colorForUserId } from '../lib/colors';
import { useBoardSync } from '../hooks/useBoardSync';

interface BoardPanelProps {
  roomId: string;
  userId: string;
  displayName: string;
}

export default function BoardPanel({ roomId, userId, displayName }: BoardPanelProps) {
  const syncedStore = useBoardSync(roomId, userId, displayName);
  const user = useMemo(
    () =>
      createTLUser({
        userPreferences: atom(`board-user-preferences-${userId}`, {
          ...defaultUserPreferences,
          id: userId,
          name: displayName,
          color: colorForUserId(userId) as typeof defaultUserPreferences.color,
          colorScheme: 'dark',
        }),
      }),
    [displayName, userId],
  );

  if (syncedStore.status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading board...
      </div>
    );
  }

  if (syncedStore.status === 'error') {
    return (
      <div className="flex h-full items-center justify-center text-sm text-destructive">
        Could not load board.
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden bg-background">
      <div className="h-full w-full">
        <Tldraw
          store={syncedStore.store}
          user={user}
          autoFocus
          licenseKey={import.meta.env.VITE_TLDRAW_LICENSE_KEY}
        />
      </div>
    </div>
  );
}
