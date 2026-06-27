import { Allotment } from 'allotment';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';
import BoardPanel from './BoardPanel';
import EditorPanel from './editor-panel';
import OutputPanel from './OutputPanel';
import 'allotment/dist/style.css';
import type { ExecutionOutput, LanguageId } from '../types';

interface WorkspaceTabsProps {
  roomId: string;
  userId: string;
  displayName: string;
  ydoc: Y.Doc;
  provider: HocuspocusProvider | null;
  connected: boolean;
  running?: boolean;
  onRun?: (request: { language: LanguageId; code: string }) => void | Promise<void>;
  output: ExecutionOutput;
}

export default function WorkspaceTabs({
  roomId,
  userId,
  displayName,
  ydoc,
  provider,
  connected,
  running,
  onRun,
  output,
}: WorkspaceTabsProps) {
  return (
    <div className="min-h-0 flex-1">
      <Allotment
        className="collabcode-splitter h-full w-full"
        defaultSizes={[60, 40]}
        minSize={240}
        proportionalLayout
      >
        <Allotment.Pane minSize={360}>
          <Allotment
            className="collabcode-splitter h-full w-full"
            defaultSizes={[72, 28]}
            minSize={96}
            proportionalLayout
            vertical
          >
            <Allotment.Pane minSize={220}>
              <EditorPanel
                ydoc={ydoc}
                provider={provider}
                connected={connected}
                running={running}
                onRun={onRun}
              />
            </Allotment.Pane>
            <Allotment.Pane minSize={96}>
              <OutputPanel output={output} />
            </Allotment.Pane>
          </Allotment>
        </Allotment.Pane>
        <Allotment.Pane minSize={280}>
          <BoardPanel roomId={roomId} userId={userId} displayName={displayName} />
        </Allotment.Pane>
      </Allotment>
    </div>
  );
}
