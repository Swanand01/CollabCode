import { Monitor } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function MobileBlock() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <Monitor size={40} className="text-muted-foreground" />
      <h1 className="text-lg font-semibold">Desktop only</h1>
      <p className="text-sm text-muted-foreground">
        CollabCode requires a larger screen. Please join from a desktop or laptop.
      </p>
      <Button variant="outline" asChild>
        <Link to="/">Go back home</Link>
      </Button>
    </div>
  );
}
