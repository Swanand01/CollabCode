import { useEffect, useRef, useState } from 'react';
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';

export function useYjs(roomId: string, userId: string) {
  const ydocRef = useRef<Y.Doc>(new Y.Doc());
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const nextProvider = new HocuspocusProvider({
      url: `ws://${window.location.hostname}:1234`,
      name: `editor:${roomId}`,
      document: ydocRef.current,
      token: userId,
      onConnect: () => setConnected(true),
      onDisconnect: () => setConnected(false),
    });

    setProvider(nextProvider);
    return () => {
      nextProvider.destroy();
      setProvider(null);
      setConnected(false);
    };
  }, [roomId, userId]);

  return { ydoc: ydocRef.current, provider, connected };
}
