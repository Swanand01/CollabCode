import { useEffect, useMemo, useState } from 'react';
import * as Y from 'yjs';
import type { ExecutionOutput } from '../types';

const OUTPUT_KEY = 'current';

export const EMPTY_EXECUTION_OUTPUT: ExecutionOutput = {
  status: 'idle',
  stdout: '',
  stderr: '',
  exitCode: null,
};

function isExecutionOutput(value: unknown): value is ExecutionOutput {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ExecutionOutput>;
  return (
    candidate.status === 'idle' ||
    candidate.status === 'running' ||
    candidate.status === 'success' ||
    candidate.status === 'error'
  );
}

export function useExecutionOutput(ydoc: Y.Doc) {
  const outputMap = useMemo(() => ydoc.getMap<unknown>('executionOutput'), [ydoc]);
  const [output, setOutputState] = useState<ExecutionOutput>(() => {
    const stored = outputMap.get(OUTPUT_KEY);
    return isExecutionOutput(stored) ? stored : EMPTY_EXECUTION_OUTPUT;
  });

  useEffect(() => {
    const handleChange = () => {
      const stored = outputMap.get(OUTPUT_KEY);
      setOutputState(isExecutionOutput(stored) ? stored : EMPTY_EXECUTION_OUTPUT);
    };

    outputMap.observe(handleChange);
    handleChange();
    return () => outputMap.unobserve(handleChange);
  }, [outputMap]);

  function setOutput(nextOutput: ExecutionOutput) {
    outputMap.set(OUTPUT_KEY, nextOutput);
  }

  return { output, setOutput };
}
