import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import LobbyView from '../components/LobbyView';

describe('LobbyView', () => {
  it('shows waiting message', () => {
    render(<LobbyView displayName="Alex" onRetry={vi.fn()} denied={false} />);
    expect(screen.getByText(/waiting for the host/i)).toBeInTheDocument();
    expect(screen.getByText(/Alex/)).toBeInTheDocument();
  });

  it('shows denied message when denied=true', () => {
    render(<LobbyView displayName="Alex" onRetry={vi.fn()} denied={true} />);
    expect(screen.getByText(/did not let you in/i)).toBeInTheDocument();
  });

  it('calls onRetry when Try Again is clicked', () => {
    const onRetry = vi.fn();
    render(<LobbyView displayName="Alex" onRetry={onRetry} denied={true} />);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalled();
  });
});
