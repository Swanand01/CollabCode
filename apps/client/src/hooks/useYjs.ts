import { useEffect, useState } from 'react';
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';

type Awareness = HocuspocusProvider['awareness'];

export function useYjs(roomId: string, userId: string) {
  const [ydoc] = useState(() => new Y.Doc());
  const [awareness, setAwareness] = useState<Awareness | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const provider = new HocuspocusProvider({
      url: `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/hocus`,
      name: `editor:${roomId}`,
      document: ydoc,
      token: userId,
      onConnect: () => {
        setConnected(true);
        setAwareness(provider.awareness);
      },
      onDisconnect: () => setConnected(false),
    });

    return () => {
      provider.destroy();
      setAwareness(null);
      setConnected(false);
    };
  }, [roomId, userId, ydoc]);

  return { ydoc, awareness, connected };
}
