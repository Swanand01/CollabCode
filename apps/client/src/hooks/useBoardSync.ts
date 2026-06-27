import { useMemo } from 'react';
import { useSync } from '@tldraw/sync';
import { atom } from '@tldraw/state';
import { inlineBase64AssetStore } from 'tldraw';
import { colorForUserId } from '../lib/colors';

export function useBoardSync(roomId: string, userId: string, displayName: string) {
  const userInfo = useMemo(
    () =>
      atom(`board-user-${userId}`, {
        id: userId,
        name: displayName,
        color: colorForUserId(userId),
      }),
    [displayName, userId],
  );

  return useSync({
    uri: `ws://${window.location.hostname}:3000/rooms/${encodeURIComponent(roomId)}/board-sync?userId=${encodeURIComponent(userId)}`,
    assets: inlineBase64AssetStore,
    userInfo,
  });
}
