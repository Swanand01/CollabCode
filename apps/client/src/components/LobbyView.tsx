import { Button } from '@/components/ui/button';

interface LobbyViewProps {
  displayName: string;
  onRetry: () => void;
  denied: boolean;
}

export default function LobbyView({ displayName, onRetry, denied }: LobbyViewProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      {denied ? (
        <>
          <h2 className="text-lg font-semibold">Access Denied</h2>
          <p className="text-sm text-muted-foreground">The host did not let you in.</p>
          <Button onClick={onRetry}>Try Again</Button>
        </>
      ) : (
        <>
          <h2 className="text-lg font-semibold">Waiting for Host</h2>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">{displayName}</span> is waiting for the host to admit you.
          </p>
        </>
      )}
    </div>
  );
}
