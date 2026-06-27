import { Button } from '@/components/ui/button';
import type { PendingKnock } from '../types';

interface KnockBannerProps {
  knocks: PendingKnock[];
  onAdmit: (requestId: string) => void;
  onDeny: (requestId: string) => void;
}

export default function KnockBanner({ knocks, onAdmit, onDeny }: KnockBannerProps) {
  if (knocks.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[350] flex w-72 flex-col gap-2">
      {knocks.map((knock) => (
        <div
          key={knock.requestId}
          className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-background p-4 shadow-lg ring-1 ring-primary/10"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
              {knock.displayName[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{knock.displayName}</p>
              <p className="text-xs text-muted-foreground">wants to join</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => onDeny(knock.requestId)}>
              Deny
            </Button>
            <Button size="sm" onClick={() => onAdmit(knock.requestId)}>
              Admit
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
