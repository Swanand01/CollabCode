type UserColorClasses = {
  bg: string;
  text: string;
  border: string;
  ring: string;
};

const HEX_PALETTE: Array<{ color: string; light: string }> = [
  { color: '#e03131', light: '#e0313133' },
  { color: '#2f9e44', light: '#2f9e4433' },
  { color: '#1971c2', light: '#1971c233' },
  { color: '#f08c00', light: '#f08c0033' },
  { color: '#0c8599', light: '#0c859933' },
  { color: '#7048e8', light: '#7048e833' },
  { color: '#d6336c', light: '#d6336c33' },
  { color: '#5c7cfa', light: '#5c7cfa33' },
  { color: '#37b24d', light: '#37b24d33' },
  { color: '#f76707', light: '#f7670733' },
  { color: '#1098ad', light: '#1098ad33' },
  { color: '#9c36b5', light: '#9c36b533' },
  { color: '#4263eb', light: '#4263eb33' },
  { color: '#e8590c', light: '#e8590c33' },
  { color: '#087f5b', light: '#087f5b33' },
  { color: '#c2255c', light: '#c2255c33' },
];

const CLASS_PALETTE: UserColorClasses[] = [
  { bg: 'bg-user-red', text: 'text-user-red', border: 'border-user-red', ring: 'ring-user-red' },
  {
    bg: 'bg-user-emerald',
    text: 'text-user-emerald',
    border: 'border-user-emerald',
    ring: 'ring-user-emerald',
  },
  {
    bg: 'bg-user-blue',
    text: 'text-user-blue',
    border: 'border-user-blue',
    ring: 'ring-user-blue',
  },
  {
    bg: 'bg-user-amber',
    text: 'text-user-amber',
    border: 'border-user-amber',
    ring: 'ring-user-amber',
  },
  {
    bg: 'bg-user-cyan',
    text: 'text-user-cyan',
    border: 'border-user-cyan',
    ring: 'ring-user-cyan',
  },
  {
    bg: 'bg-user-violet',
    text: 'text-user-violet',
    border: 'border-user-violet',
    ring: 'ring-user-violet',
  },
  {
    bg: 'bg-user-pink',
    text: 'text-user-pink',
    border: 'border-user-pink',
    ring: 'ring-user-pink',
  },
  {
    bg: 'bg-user-indigo',
    text: 'text-user-indigo',
    border: 'border-user-indigo',
    ring: 'ring-user-indigo',
  },
  {
    bg: 'bg-user-green',
    text: 'text-user-green',
    border: 'border-user-green',
    ring: 'ring-user-green',
  },
  {
    bg: 'bg-user-orange',
    text: 'text-user-orange',
    border: 'border-user-orange',
    ring: 'ring-user-orange',
  },
  {
    bg: 'bg-user-teal',
    text: 'text-user-teal',
    border: 'border-user-teal',
    ring: 'ring-user-teal',
  },
  {
    bg: 'bg-user-purple',
    text: 'text-user-purple',
    border: 'border-user-purple',
    ring: 'ring-user-purple',
  },
  {
    bg: 'bg-user-cobalt',
    text: 'text-user-cobalt',
    border: 'border-user-cobalt',
    ring: 'ring-user-cobalt',
  },
  {
    bg: 'bg-user-tangerine',
    text: 'text-user-tangerine',
    border: 'border-user-tangerine',
    ring: 'ring-user-tangerine',
  },
  {
    bg: 'bg-user-forest',
    text: 'text-user-forest',
    border: 'border-user-forest',
    ring: 'ring-user-forest',
  },
  {
    bg: 'bg-user-rose',
    text: 'text-user-rose',
    border: 'border-user-rose',
    ring: 'ring-user-rose',
  },
];

function paletteIndex(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return hash % HEX_PALETTE.length;
}

// Kept for use by useAwareness.ts (yCollab cursor) and BoardPanel.tsx (tldraw user color)
export function colorForUserId(userId: string): string {
  return HEX_PALETTE[paletteIndex(userId)].color;
}

export function colorLightForUserId(userId: string): string {
  return HEX_PALETTE[paletteIndex(userId)].light;
}

// Use this in React components — returns Tailwind class names, no inline styles needed
export function classesForUserId(userId: string): UserColorClasses {
  return CLASS_PALETTE[paletteIndex(userId)];
}
