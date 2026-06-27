import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  safelist: [
    {
      pattern: /^(bg|text|border|ring)-user-(red|emerald|blue|amber|cyan|violet|pink|indigo|green|orange|teal|purple|cobalt|tangerine|forest|rose)$/,
    },
  ],
  theme: {
    extend: {
      colors: {
        border: 'rgb(var(--border))',
        background: 'rgb(var(--background))',
        foreground: 'rgb(var(--foreground))',
        primary: {
          DEFAULT: 'rgb(var(--primary))',
          foreground: 'rgb(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'rgb(var(--secondary))',
          foreground: 'rgb(var(--secondary-foreground))',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent))',
          foreground: 'rgb(var(--accent-foreground))',
        },
        muted: {
          DEFAULT: 'rgb(var(--muted))',
          foreground: 'rgb(var(--muted-foreground))',
        },
        destructive: {
          DEFAULT: 'rgb(var(--destructive))',
          foreground: 'rgb(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'rgb(var(--card))',
          foreground: 'rgb(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'rgb(var(--popover))',
          foreground: 'rgb(var(--popover-foreground))',
        },
        input: 'rgb(var(--input))',
        ring: 'rgb(var(--ring))',
        success: 'rgb(var(--success) / <alpha-value>)',
        'output-stdout': 'rgb(var(--output-stdout) / <alpha-value>)',
        'output-stderr': 'rgb(var(--output-stderr) / <alpha-value>)',
        'video-overlay': 'rgb(var(--video-overlay) / <alpha-value>)',
        user: {
          red:       '#e03131',
          emerald:   '#2f9e44',
          blue:      '#1971c2',
          amber:     '#f08c00',
          cyan:      '#0c8599',
          violet:    '#7048e8',
          pink:      '#d6336c',
          indigo:    '#5c7cfa',
          green:     '#37b24d',
          orange:    '#f76707',
          teal:      '#1098ad',
          purple:    '#9c36b5',
          cobalt:    '#4263eb',
          tangerine: '#e8590c',
          forest:    '#087f5b',
          rose:      '#c2255c',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
} satisfies Config;
