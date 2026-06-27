import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import KnockBanner from '../components/KnockBanner';
import type { PendingKnock } from '../types';

const knocks: PendingKnock[] = [
  { requestId: 'req1', displayName: 'Alex' },
  { requestId: 'req2', displayName: 'Maya' },
];

describe('KnockBanner', () => {
  it('shows all pending joiner names', () => {
    render(<KnockBanner knocks={knocks} onAdmit={vi.fn()} onDeny={vi.fn()} />);
    expect(screen.getByText('Alex')).toBeInTheDocument();
    expect(screen.getByText('Maya')).toBeInTheDocument();
  });

  it('calls onAdmit with requestId when Admit is clicked', () => {
    const onAdmit = vi.fn();
    render(<KnockBanner knocks={knocks} onAdmit={onAdmit} onDeny={vi.fn()} />);
    fireEvent.click(screen.getAllByRole('button', { name: /admit/i })[0]);
    expect(onAdmit).toHaveBeenCalledWith('req1');
  });

  it('calls onDeny with requestId when Deny is clicked', () => {
    const onDeny = vi.fn();
    render(<KnockBanner knocks={knocks} onAdmit={vi.fn()} onDeny={onDeny} />);
    fireEvent.click(screen.getAllByRole('button', { name: /deny/i })[1]);
    expect(onDeny).toHaveBeenCalledWith('req2');
  });
});
