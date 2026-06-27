import { useEffect, useRef, useState } from 'react';
import AgoraRTC, {
  type IAgoraRTCClient,
  type IAgoraRTCRemoteUser,
  type ICameraVideoTrack,
  type IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';
import type { AgoraState } from '../types';
import { fetchAgoraToken } from '../lib/api';

AgoraRTC.setLogLevel(4);

export function useAgora(roomId: string, userId: string): AgoraState {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localVideoRef = useRef<ICameraVideoTrack | null>(null);
  const localAudioRef = useRef<IMicrophoneAudioTrack | null>(null);
  const isCreatingVideoRef = useRef(false);
  const isCreatingAudioRef = useRef(false);

  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);

  useEffect(() => {
    let active = true;
    let joined = false;

    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    clientRef.current = client;

    client.on('user-published', async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      if (mediaType === 'audio') user.audioTrack?.play();
      setRemoteUsers(prev => {
        const exists = prev.some(u => u.uid === user.uid);
        return exists ? prev.map(u => (u.uid === user.uid ? user : u)) : [...prev, user];
      });
    });

    client.on('user-unpublished', user => {
      setRemoteUsers(prev => prev.map(u => (u.uid === user.uid ? user : u)));
    });

    client.on('user-left', user => {
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    });

    async function onTokenWillExpire() {
      const { token } = await fetchAgoraToken(roomId, userId);
      if (!active) return;
      await client.renewToken(token);
    }
    client.on('token-privilege-will-expire', onTokenWillExpire);

    async function join() {
      const { token, appId, channel } = await fetchAgoraToken(roomId, userId);
      if (!active) return;
      await client.join(appId, channel, token, userId);
      joined = true;
      if (!active) {
        joined = false;
        await client.leave();
      }
    }

    void join();

    return () => {
      active = false;
      client.off('token-privilege-will-expire', onTokenWillExpire);
      localVideoRef.current?.close();
      localAudioRef.current?.close();
      localVideoRef.current = null;
      localAudioRef.current = null;
      setLocalVideoTrack(null);
      setLocalAudioTrack(null);
      setRemoteUsers([]);
      if (joined) {
        joined = false;
        void client.leave();
      }
    };
  }, [roomId, userId]);

  async function toggleCamera() {
    const client = clientRef.current;
    if (!client) return;
    if (!localVideoRef.current) {
      if (isCreatingVideoRef.current) return;
      isCreatingVideoRef.current = true;
      try {
        const videoTrack = await AgoraRTC.createCameraVideoTrack();
        localVideoRef.current = videoTrack;
        setLocalVideoTrack(videoTrack);
        await client.publish([videoTrack]);
        setCameraOn(true);
      } catch {
        // Camera not available
      } finally {
        isCreatingVideoRef.current = false;
      }
      return;
    }
    const next = !cameraOn;
    await localVideoRef.current.setEnabled(next);
    setCameraOn(next);
  }

  async function toggleMic() {
    const client = clientRef.current;
    if (!client) return;
    if (!localAudioRef.current) {
      if (isCreatingAudioRef.current) return;
      isCreatingAudioRef.current = true;
      try {
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        localAudioRef.current = audioTrack;
        setLocalAudioTrack(audioTrack);
        await client.publish([audioTrack]);
        setMicOn(true);
      } catch {
        // Mic not available
      } finally {
        isCreatingAudioRef.current = false;
      }
      return;
    }
    const next = !micOn;
    await localAudioRef.current.setEnabled(next);
    setMicOn(next);
  }

  return { localVideoTrack, localAudioTrack, remoteUsers, cameraOn, micOn, toggleCamera, toggleMic };
}
