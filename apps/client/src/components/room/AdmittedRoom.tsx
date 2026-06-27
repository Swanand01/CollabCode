import { useState } from 'react';
import KnockBanner from '../KnockBanner';
import RoomShell from '../RoomShell';
import VideoSidebar from '../video-sidebar';
import WorkspaceTabs from '../WorkspaceTabs';
import { useAgora } from '../../hooks/useAgora';
import { useAwareness } from '../../hooks/useAwareness';
import { useExecutionOutput } from '../../hooks/useExecutionOutput';
import { usePing } from '../../hooks/usePing';
import { useYjs } from '../../hooks/useYjs';
import { executeCode } from '../../lib/api';
import type { LanguageId } from '../../types';

interface AdmittedRoomProps {
  roomId: string;
  userId: string;
  displayName: string;
}

export default function AdmittedRoom({ roomId, userId, displayName }: AdmittedRoomProps) {
  const { ydoc, awareness, connected } = useYjs(roomId, userId);
  const users = useAwareness(awareness, userId, displayName);
  const { output, setOutput } = useExecutionOutput(ydoc);
  const [running, setRunning] = useState(false);
  const hostSecret = sessionStorage.getItem('hostSecret') ?? undefined;
  const { isHost, knocks, handleAdmit, handleDeny } = usePing(roomId, userId, hostSecret);
  const agora = useAgora(roomId, userId);

  async function handleRun({ language, code }: { language: LanguageId; code: string }) {
    if (running) return;
    setRunning(true);
    setOutput({
      status: 'running',
      stdout: '',
      stderr: '',
      exitCode: null,
      language,
      ranBy: displayName,
      ranAt: Date.now(),
    });

    try {
      const result = await executeCode(roomId, userId, language, code);
      setOutput({
        status: 'success',
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        language,
        ranBy: displayName,
        ranAt: Date.now(),
      });
    } catch (error) {
      setOutput({
        status: 'error',
        stdout: '',
        stderr: '',
        exitCode: null,
        language,
        ranBy: displayName,
        ranAt: Date.now(),
        error: error instanceof Error ? error.message : 'Execution failed',
      });
    } finally {
      setRunning(false);
    }
  }

  return (
    <RoomShell
      roomId={roomId}
      knockBanner={
        knocks.length > 0 ? (
          <KnockBanner knocks={knocks} onAdmit={handleAdmit} onDeny={handleDeny} />
        ) : null
      }
      sidebar={
        <VideoSidebar
          users={users}
          hostUserId={isHost ? userId : undefined}
          localUserId={userId}
          agora={agora}
        />
      }
    >
      <WorkspaceTabs
        roomId={roomId}
        userId={userId}
        displayName={displayName}
        ydoc={ydoc}
        awareness={awareness}
        connected={connected}
        running={running}
        onRun={handleRun}
        output={output}
      />
    </RoomShell>
  );
}
