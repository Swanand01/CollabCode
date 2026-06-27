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
          <button
            onClick={onRetry}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Try Again
          </button>
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
