import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { createRoom, joinRoom, pollJoinStatus, validateRoom } from '../lib/api';

type Mode = 'create' | 'join';
type JoinPhase = 'idle' | 'joining' | 'waiting' | 'denied' | 'full';

export default function HomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const joinParam = searchParams.get('join') ?? '';
  const [mode, setMode] = useState<Mode>(joinParam ? 'join' : 'create');
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState(joinParam);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [joinPhase, setJoinPhase] = useState<JoinPhase>('idle');
  const requestIdRef = useRef<string | null>(null);
  const roomIdRef = useRef<string>('');

  function switchMode(next: Mode) {
    setMode(next);
    setError('');
    setRoomId('');
    cancelWaiting();
  }

  function cancelWaiting() {
    setJoinPhase('idle');
    requestIdRef.current = null;
    setLoading(false);
  }

  useEffect(() => {
    if (joinPhase !== 'waiting') return;

    const interval = window.setInterval(async () => {
      if (!requestIdRef.current) return;
      try {
        const result = await pollJoinStatus(roomIdRef.current, requestIdRef.current);
        if (!requestIdRef.current) return;
        if (result.status === 'admitted') {
          sessionStorage.setItem(`participant:${roomIdRef.current}`, result.userId);
          navigate(`/room/${roomIdRef.current}`);
        } else if (result.status === 'denied') {
          setJoinPhase('denied');
          requestIdRef.current = null;
        }
      } catch {
        // ignore transient poll failures
      }
    }, 2000);

    return () => window.clearInterval(interval);
  }, [joinPhase, navigate]);

  async function handleCreate() {
    const displayName = name.trim();
    if (!displayName || loading) return;
    setLoading(true);
    setError('');
    try {
      const room = await createRoom();
      const joined = await joinRoom(room.roomId, displayName, room.hostSecret);
      if (!('status' in joined) || joined.status !== 'admitted') throw new Error();
      sessionStorage.setItem('hostSecret', room.hostSecret);
      sessionStorage.setItem('displayName', displayName);
      sessionStorage.setItem(`participant:${room.roomId}`, joined.userId);
      navigate(`/room/${room.roomId}`);
    } catch {
      setError('Could not create room. Try again.');
      setLoading(false);
    }
  }

  async function handleJoin() {
    const displayName = name.trim();
    const targetRoomId = roomId.trim();
    if (!displayName || !targetRoomId || loading) return;
    setLoading(true);
    setError('');
    setJoinPhase('joining');
    try {
      const exists = await validateRoom(targetRoomId);
      if (!exists) {
        setError('Room not found. Check the Room ID and try again.');
        setJoinPhase('idle');
        setLoading(false);
        return;
      }
      const existingUserId = sessionStorage.getItem(`participant:${targetRoomId}`) ?? undefined;
      const result = await joinRoom(targetRoomId, displayName, undefined, existingUserId);
      sessionStorage.setItem('displayName', displayName);
      sessionStorage.removeItem('hostSecret');

      if ('status' in result && result.status === 'admitted') {
        sessionStorage.setItem(`participant:${targetRoomId}`, result.userId);
        navigate(`/room/${targetRoomId}`);
      } else if ('requestId' in result) {
        roomIdRef.current = targetRoomId;
        requestIdRef.current = result.requestId;
        setJoinPhase('waiting');
        setLoading(false);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not join room.';
      if (msg.toLowerCase().includes('full')) {
        setJoinPhase('full');
      } else {
        setJoinPhase('idle');
        setError(msg);
      }
      setLoading(false);
    }
  }

  const isCreateMode = mode === 'create';
  const canSubmit = name.trim().length > 0 && (isCreateMode || roomId.trim().length > 0);
  const isWaiting = joinPhase === 'waiting';
  const isBusy = loading || isWaiting;

  return (
    <main className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-background px-6">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative flex w-full max-w-sm flex-col items-center text-center">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <Code2 size={18} className="text-primary-foreground" />
          </div>
          <span className="text-3xl font-bold tracking-tight">
            <span className="text-foreground">Collab</span>
            <span className="text-primary">Code</span>
          </span>
        </div>

        <h1 className="mb-3 text-balance text-4xl font-bold tracking-tight text-foreground">
          Code Together,{' '}
          <span className="text-primary">In Real Time.</span>
        </h1>
        <p className="mb-10 text-sm text-muted-foreground">
          Collaborative editor + whiteboard for your team.
        </p>

        <div className="w-full text-left">
          <div className="mb-3 flex flex-col gap-1.5">
            <Label htmlFor="name">Your name</Label>
            <Input
              id="name"
              name="displayName"
              placeholder="Alice…"
              value={name}
              disabled={isBusy}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && canSubmit && !isBusy) {
                  void (isCreateMode ? handleCreate() : handleJoin());
                }
              }}
              spellCheck={false}
              autoFocus
              autoComplete="nickname"
            />
          </div>

          {!isCreateMode && (
            <div className="mb-3 flex flex-col gap-1.5">
              <Label htmlFor="room-id">Room ID</Label>
              <Input
                id="room-id"
                name="roomId"
                placeholder="asd-wzmx-qbu…"
                value={roomId}
                disabled={isBusy}
                onChange={e => setRoomId(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && canSubmit && !isBusy) void handleJoin();
                }}
                spellCheck={false}
                autoComplete="off"
              />
            </div>
          )}

          <div aria-live="polite" className="mb-3 min-h-[1.25rem]">
            {joinPhase === 'waiting' && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Spinner className="h-3 w-3" />
                Waiting for the host to admit you…
              </p>
            )}
            {joinPhase === 'denied' && (
              <p className="text-xs text-destructive">The host denied your request.</p>
            )}
            {joinPhase === 'full' && (
              <p className="text-xs text-destructive">This room is full.</p>
            )}
            {error && joinPhase === 'idle' ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>

          {isWaiting ? (
            <Button variant="outline" className="w-full" onClick={cancelWaiting}>
              Cancel
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={() => void (isCreateMode ? handleCreate() : handleJoin())}
              disabled={loading || !canSubmit || joinPhase === 'full'}
            >
              {loading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  {isCreateMode ? 'Creating…' : 'Joining…'}
                </>
              ) : isCreateMode ? (
                'Create Room'
              ) : joinPhase === 'denied' ? (
                'Try Again'
              ) : (
                'Join Room'
              )}
            </Button>
          )}

          <div className="mt-4 text-center text-sm">
            {isCreateMode ? (
              <button
                type="button"
                className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onClick={() => switchMode('join')}
              >
                or join an existing room →
              </button>
            ) : (
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onClick={() => switchMode('create')}
              >
                ← create a new room instead
              </button>
            )}
          </div>
        </div>

        <span className="mt-16 font-mono text-xs text-muted-foreground/40">v1.0.0</span>
      </div>
    </main>
  );
}
