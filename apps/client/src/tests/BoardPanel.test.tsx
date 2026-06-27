import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BoardPanel from '../components/BoardPanel';
import { useBoardSync } from '../hooks/useBoardSync';

vi.mock('../hooks/useBoardSync', () => ({
  useBoardSync: vi.fn(),
}));

vi.mock('tldraw', async () => {
  const actual = await vi.importActual<typeof import('tldraw')>('tldraw');
  return {
    ...actual,
    Tldraw: () => <div data-testid="tldraw-board" />,
  };
});

const mockedUseBoardSync = vi.mocked(useBoardSync);

describe('BoardPanel', () => {
  it('renders loading state', () => {
    mockedUseBoardSync.mockReturnValue({ status: 'loading' } as ReturnType<typeof useBoardSync>);

    render(<BoardPanel roomId="room1" userId="u1" displayName="Alex" />);

    expect(screen.getByText(/loading board/i)).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockedUseBoardSync.mockReturnValue({
      status: 'error',
      error: new Error('failed'),
    } as ReturnType<typeof useBoardSync>);

    render(<BoardPanel roomId="room1" userId="u1" displayName="Alex" />);

    expect(screen.getByText(/could not load board/i)).toBeInTheDocument();
  });

  it('renders tldraw when synced', () => {
    mockedUseBoardSync.mockReturnValue({
      status: 'synced-remote',
      connectionStatus: 'online',
      store: {},
    } as ReturnType<typeof useBoardSync>);

    render(<BoardPanel roomId="room1" userId="u1" displayName="Alex" />);

    expect(screen.getByTestId('tldraw-board')).toBeInTheDocument();
  });
});
