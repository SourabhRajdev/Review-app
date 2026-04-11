import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Strict palette — 6 roles, no ad-hoc hex allowed in components.
        bg: '#FAFAF8',
        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#F5F5F3',
        },
        primary: {
          DEFAULT: '#B8622D',
          light: '#D4884E',
          muted: '#B8622D1A', // 10% opacity
        },
        ink: {
          DEFAULT: '#1C1917',
          secondary: '#57534E',
          tertiary: '#A8A29E',
          ghost: '#D6D3D1',
        },
        success: '#16A34A',
        error: '#DC2626',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'sans-serif',
        ],
      },
      fontSize: {
        // Strict type scale — 7 steps only. No arbitrary text-[Xpx].
        'display': ['1.875rem', { lineHeight: '1.15', letterSpacing: '-0.025em', fontWeight: '600' }],  // 30px
        'heading': ['1.25rem', { lineHeight: '1.3', letterSpacing: '-0.015em', fontWeight: '600' }],     // 20px
        'body': ['1rem', { lineHeight: '1.5', fontWeight: '400' }],            // 16px
        'body-sm': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],     // 14px
        'caption': ['0.75rem', { lineHeight: '1.4', fontWeight: '500' }],      // 12px
        'micro': ['0.6875rem', { lineHeight: '1.3', fontWeight: '500' }],      // 11px
        'button': ['0.9375rem', { lineHeight: '1', letterSpacing: '-0.01em', fontWeight: '600' }], // 15px
      },
      borderRadius: {
        'card': '16px',
        'button': '12px',
        'chip': '100px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
        'elevated': '0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06)',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
