import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import HomePage from '../pages/HomePage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const server = setupServer(
  http.post('/rooms', () =>
    HttpResponse.json({ roomId: 'testroom01', hostSecret: 'secret123456789012345' }),
  ),
  http.get('/rooms/:id', ({ params }) =>
    params.id === 'existingroom'
      ? HttpResponse.json({ roomId: 'existingroom', participantCount: 1 })
      : new HttpResponse(null, { status: 404 }),
  ),
  http.post('/rooms/:id/join', () =>
    HttpResponse.json({ status: 'admitted', userId: 'user123' }),
  ),
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  mockNavigate.mockReset();
  sessionStorage.clear();
});
afterAll(() => server.close());

describe('HomePage', () => {
  it('renders hero and create form by default', () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /code together/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create room/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/room id/i)).not.toBeInTheDocument();
  });

  it('creates a room and navigates to it', async () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Sam' } });
    fireEvent.click(screen.getByRole('button', { name: /create room/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/room/testroom01'));
    expect(sessionStorage.getItem('hostSecret')).toBe('secret123456789012345');
    expect(sessionStorage.getItem('displayName')).toBe('Sam');
  });

  it('reveals join form when clicking join link', () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /join an existing room/i }));
    expect(screen.getByLabelText(/room id/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join room/i })).toBeInTheDocument();
  });

  it('joins an existing room by ID', async () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /join an existing room/i }));
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Alex' } });
    fireEvent.change(screen.getByLabelText(/room id/i), { target: { value: 'existingroom' } });
    fireEvent.click(screen.getByRole('button', { name: /join room/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/room/existingroom'));
    expect(sessionStorage.getItem('displayName')).toBe('Alex');
  });

  it('shows error for unknown room', async () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /join an existing room/i }));
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Alex' } });
    fireEvent.change(screen.getByLabelText(/room id/i), { target: { value: 'nope' } });
    fireEvent.click(screen.getByRole('button', { name: /join room/i }));
    await waitFor(() => expect(screen.getByText(/room not found/i)).toBeInTheDocument());
  });
});
