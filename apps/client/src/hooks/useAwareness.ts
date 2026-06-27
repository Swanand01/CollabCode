import { useEffect, useState } from 'react';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import type { AwarenessUser } from '../types';
import { colorForUserId, colorLightForUserId } from '../lib/colors';

type Awareness = HocuspocusProvider['awareness'];

export function useAwareness(
  awareness: Awareness | null,
  userId: string,
  displayName: string,
) {
  const [users, setUsers] = useState<AwarenessUser[]>([]);

  useEffect(() => {
    if (!awareness) return;

    const localUser = {
      userId,
      name: displayName,
      displayName,
      color: colorForUserId(userId),
      colorLight: colorLightForUserId(userId),
    };

    const syncUsers = () => {
      const states = [...awareness.getStates().values()];
      const nextUsers = states
        .map(state => state.user)
        .filter((user): user is AwarenessUser => Boolean(user));
      setUsers(nextUsers);
    };

    awareness.setLocalStateField('user', localUser);
    syncUsers();
    awareness.on('update', syncUsers);

    return () => {
      awareness.off('update', syncUsers);
    };
  }, [awareness, displayName, userId]);

  return users;
}
