import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import VideoSidebar from '../components/video-sidebar';
import type { AwarenessUser, AgoraState } from '../types';

const users: AwarenessUser[] = [
  { userId: 'u1', name: 'Swan', displayName: 'Swan', color: '#1971c2', colorLight: '#1971c233' },
  { userId: 'u2', name: 'Test', displayName: 'Test', color: '#2f9e44', colorLight: '#2f9e4433' },
];

const agora: AgoraState = {
  localVideoTrack: null,
  localAudioTrack: null,
  remoteUsers: [],
  cameraOn: false,
  micOn: true,
  toggleCamera: vi.fn(),
  toggleMic: vi.fn(),
};

describe('VideoSidebar', () => {
  it('renders participant tiles with names', () => {
    render(<VideoSidebar users={users} localUserId="u1" agora={agora} />);

    expect(screen.getByLabelText('Participants')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
