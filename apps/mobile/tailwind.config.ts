import type { Config } from 'tailwindcss';

export default {
  content: ['./App.tsx', './index.ts', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0D0D0D',
        'bg-surface': '#1E1A15',
        'accent-primary': '#FF6B00',
        'accent-warm': '#FF8C00',
        'accent-reject': '#8B3A3A',
        'accent-sold': '#6B4E00',
        'text-primary': '#F5F0E8',
        'text-muted': '#9E9080',
        border: '#2E2820',
      },
      borderRadius: {
        card: '24px',
        btn: '12px',
      },
    },
  },
} satisfies Config;
