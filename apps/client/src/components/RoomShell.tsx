import { useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Code2, Link, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RoomShellProps {
  roomId: string;
  children: ReactNode;
  knockBanner?: ReactNode;
  sidebar: ReactNode;
}

export default function RoomShell({ roomId, children, knockBanner, sidebar }: RoomShellProps) {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    void navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <main className="flex h-full flex-col bg-background">
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
        <RouterLink to="/" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <Code2 size={16} className="text-primary-foreground" />
          </div>
          <span className="text-base font-bold tracking-tight">
            Collab<span className="text-primary">Code</span>
          </span>
        </RouterLink>

        <span className="select-none text-muted-foreground/30">/</span>
        <span className="font-mono text-sm text-muted-foreground">{roomId}</span>

        <Button
          variant="ghost"
          size="sm"
          onClick={copyLink}
          className="ml-1 gap-1.5 text-xs text-muted-foreground"
        >
          {copied ? <Check size={13} className="text-success" /> : <Link size={13} />}
          {copied ? 'Copied!' : 'Share'}
        </Button>
      </div>

      {knockBanner}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
        {sidebar}
      </div>
    </main>
  );
}
