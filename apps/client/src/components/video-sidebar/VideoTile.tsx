import { useEffect, useRef } from 'react';
import type { ILocalVideoTrack, IRemoteVideoTrack } from 'agora-rtc-sdk-ng';

interface VideoTileProps {
  track: ILocalVideoTrack | IRemoteVideoTrack | null;
}

export default function VideoTile({ track }: VideoTileProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!track || !ref.current) return;
    track.play(ref.current);
    return () => {
      track.stop();
    };
  }, [track]);

  return <div ref={ref} className="h-full w-full" />;
}
