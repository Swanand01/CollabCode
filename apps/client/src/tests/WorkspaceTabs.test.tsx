import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type React from 'react';
import WorkspaceTabs from '../components/WorkspaceTabs';

vi.mock('../components/editor-panel', () => ({
  default: () => <div data-testid="editor-panel" />,
}));

vi.mock('../components/BoardPanel', () => ({
  default: () => <div data-testid="board-panel" />,
}));

vi.mock('../components/OutputPanel', () => ({
  default: () => <div data-testid="output-panel" />,
}));

vi.mock('allotment', () => {
  function Allotment({
    children,
    defaultSizes,
    vertical,
  }: {
    children: React.ReactNode;
    defaultSizes?: number[];
    vertical?: boolean;
  }) {
    return (
      <div
        data-default-sizes={JSON.stringify(defaultSizes ?? null)}
        data-orientation={vertical ? 'vertical' : 'horizontal'}
        data-testid="allotment"
      >
        {children}
      </div>
    );
  }

  Allotment.Pane = ({ children, minSize }: { children: React.ReactNode; minSize?: number }) => (
    <div data-min-size={minSize} data-testid="allotment-pane">
      {children}
    </div>
  );

  return { Allotment };
});

function renderWorkspaceTabs() {
  render(
    <WorkspaceTabs
      roomId="room1"
      userId="u1"
      displayName="Alex"
      ydoc={{} as never}
      provider={null}
      connected={true}
      output={{
        status: 'idle',
        stdout: '',
        stderr: '',
        exitCode: null,
      }}
    />,
  );
}

describe('WorkspaceTabs', () => {
  it('renders editor, board, and output panels', () => {
    renderWorkspaceTabs();

    expect(screen.getByTestId('editor-panel')).toBeInTheDocument();
    expect(screen.getByTestId('board-panel')).toBeInTheDocument();
    expect(screen.getByTestId('output-panel')).toBeInTheDocument();
  });

  it('uses a resizable 60/40 editor-board split', () => {
    renderWorkspaceTabs();

    const [workspaceSplit] = screen.getAllByTestId('allotment');
    expect(workspaceSplit).toHaveAttribute('data-orientation', 'horizontal');
    expect(workspaceSplit).toHaveAttribute('data-default-sizes', JSON.stringify([60, 40]));
  });

  it('keeps output resizable below only the editor', () => {
    renderWorkspaceTabs();

    const [, editorSplit] = screen.getAllByTestId('allotment');
    expect(editorSplit).toHaveAttribute('data-orientation', 'vertical');
    expect(editorSplit).toHaveAttribute('data-default-sizes', JSON.stringify([72, 28]));
  });
});
