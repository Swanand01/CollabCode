export default function HomeFooter() {
  return (
    <div className="mt-16 flex items-center gap-3 font-mono text-xs text-muted-foreground/40">
      <span>v2.0.0</span>
      <span>·</span>
      <a
        href="https://swanand01.github.io"
        target="_blank"
        rel="noopener noreferrer"
        className="transition-colors hover:text-muted-foreground"
      >
        built by Swanand
      </a>
      <span>·</span>
      <a
        href="https://github.com/Swanand01/CollabCode"
        target="_blank"
        rel="noopener noreferrer"
        className="transition-colors hover:text-muted-foreground"
      >
        GitHub
      </a>
    </div>
  );
}
