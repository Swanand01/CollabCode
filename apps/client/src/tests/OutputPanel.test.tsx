import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import OutputPanel from '../components/OutputPanel';

describe('OutputPanel', () => {
  it('shows idle state', () => {
    render(
      <OutputPanel
        output={{
          status: 'idle',
          stdout: '',
          stderr: '',
          exitCode: null,
        }}
      />,
    );

    expect(screen.getByText(/run code to see output/i)).toBeInTheDocument();
  });

  it('shows stdout and exit code', () => {
    render(
      <OutputPanel
        output={{
          status: 'success',
          stdout: 'hello\n',
          stderr: '',
          exitCode: 0,
          ranBy: 'Alex',
        }}
      />,
    );

    expect(screen.getByText(/exit 0/i)).toBeInTheDocument();
    expect(screen.getByText(/by alex/i)).toBeInTheDocument();
    expect(screen.getByText('hello')).toBeInTheDocument();
  });
});
