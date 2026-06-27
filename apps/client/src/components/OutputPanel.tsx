import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ExecutionOutput } from '../types';

interface OutputPanelProps {
  output: ExecutionOutput;
}

export default function OutputPanel({ output }: OutputPanelProps) {
  const hasStdout = output.stdout.length > 0;
  const hasStderr = output.stderr.length > 0;
  const statusBadge =
    output.status === 'success'
      ? {
          label: `Exit ${output.exitCode ?? 0}`,
          className: 'border-success bg-success/10 text-success',
        }
      : output.status === 'error'
        ? {
            label: 'Error',
            className: 'border-destructive bg-destructive/10 text-destructive',
          }
        : null;
  const statusLabel =
    output.status === 'idle'
      ? 'Ready'
      : output.status === 'running'
        ? 'Running...'
        : output.status === 'success'
          ? `Exit ${output.exitCode ?? 0}`
          : 'Error';

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-7 shrink-0 items-center border-b border-border bg-background px-3">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          Output
          {output.ranBy ? (
            <span className="text-muted-foreground/60">ran by {output.ranBy}</span>
          ) : null}
        </span>
        {statusBadge ? (
          <Badge variant="outline" className={`ml-auto text-xs ${statusBadge.className}`}>
            {statusBadge.label}
          </Badge>
        ) : (
          <span className="ml-auto text-sm text-muted-foreground">{statusLabel}</span>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div
          role="log"
          aria-live="polite"
          className="px-3 py-2 font-mono text-sm text-output-stdout"
        >
          {output.status === 'idle' ? (
            <span className="text-muted-foreground">Run code to see output.</span>
          ) : null}
          {output.status === 'running' ? (
            <span className="text-muted-foreground">Executing...</span>
          ) : null}
          {output.error ? (
            <pre className="whitespace-pre-wrap text-output-stderr">{output.error}</pre>
          ) : null}
          {hasStdout ? <pre className="whitespace-pre-wrap">{output.stdout}</pre> : null}
          {hasStderr ? (
            <pre className="whitespace-pre-wrap text-output-stderr">{output.stderr}</pre>
          ) : null}
          {output.status === 'success' && !hasStdout && !hasStderr ? (
            <span className="text-muted-foreground">Process finished with no output.</span>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}
