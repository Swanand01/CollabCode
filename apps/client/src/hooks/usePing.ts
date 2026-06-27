import { useCallback, useEffect, useState } from 'react';
import { admit, ping } from '../lib/api';
import type { PendingKnock } from '../types';

export function usePing(roomId: string, userId: string, hostSecret?: string) {
  const [isHost, setIsHost] = useState(false);
  const [knocks, setKnocks] = useState<PendingKnock[]>([]);

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        const result = await ping(roomId, userId);
        if (!active) return;
        setIsHost(result.isHost);
        setKnocks(result.isHost ? result.pendingKnocks ?? [] : []);
      } catch {
        // transient — next tick will retry
      }
    }

    void refresh();
    const interval = window.setInterval(() => void refresh(), 3000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [roomId, userId]);

  const handleAdmit = useCallback(
    async (requestId: string) => {
      if (!hostSecret) return;
      await admit(roomId, requestId, 'admit', hostSecret);
      setKnocks(prev => prev.filter(knock => knock.requestId !== requestId));
    },
    [hostSecret, roomId],
  );

  const handleDeny = useCallback(
    async (requestId: string) => {
      if (!hostSecret) return;
      await admit(roomId, requestId, 'deny', hostSecret);
      setKnocks(prev => prev.filter(knock => knock.requestId !== requestId));
    },
    [hostSecret, roomId],
  );

  return { isHost, knocks, handleAdmit, handleDeny };
}
