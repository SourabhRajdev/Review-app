import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#FAF9F7',
        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#FBF7F4',
          sunken: '#F5EFE8',
        },
        primary: {
          DEFAULT: '#C67C4E',
          light: '#E8B896',
          hover: '#A85E38',
          deep: '#8B4513',
          muted: 'rgba(198,124,78,0.1)',
          glow: 'rgba(198,124,78,0.35)',
        },
        ink: {
          DEFAULT: '#1A0E08',
          secondary: '#7A5C4A',
          tertiary: '#B09080',
          ghost: '#D8C8BB',
        },
        success: {
          DEFAULT: '#0D9E6F',
          muted: 'rgba(13,158,111,0.1)',
        },
        error: {
          DEFAULT: '#E53E3E',
          muted: 'rgba(229,62,62,0.1)',
        },
      },
      fontFamily: {
        sans: ['Outfit', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display': ['2rem',      { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '800' }],
        'heading': ['1.625rem',  { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
        'h2':      ['1.25rem',   { lineHeight: '1.2',  letterSpacing: '-0.015em', fontWeight: '700' }],
        'body':    ['1rem',      { lineHeight: '1.6',  fontWeight: '400' }],
        'body-sm': ['0.875rem',  { lineHeight: '1.5',  fontWeight: '400' }],
        'caption': ['0.75rem',   { lineHeight: '1.4',  fontWeight: '500' }],
        'micro':   ['0.6875rem', { lineHeight: '1.3',  fontWeight: '600' }],
        'button':  ['0.9375rem', { lineHeight: '1',    letterSpacing: '-0.01em', fontWeight: '700' }],
        'label':   ['0.8125rem', { lineHeight: '1.4',  letterSpacing: '0.02em',  fontWeight: '600' }],
      },
      borderRadius: {
        'sm':     '6px',
        'button': '14px',
        'card':   '20px',
        'chip':   '100px',
      },
      boxShadow: {
        'xs':         '0 1px 2px rgba(0,0,0,0.06)',
        'sm':         '0 2px 8px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
        'md':         '0 4px 20px rgba(0,0,0,0.09), 0 2px 6px rgba(0,0,0,0.05)',
        'lg':         '0 8px 40px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.06)',
        'xl':         '0 16px 60px rgba(0,0,0,0.15), 0 8px 16px rgba(0,0,0,0.07)',
        'card':       '0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(0,0,0,0.07)',
        'card-hover': '0 4px 24px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.04)',
        'elevated':   '0 4px 20px rgba(0,0,0,0.09), 0 2px 6px rgba(0,0,0,0.05)',
        'glow':       '0 0 0 3px rgba(198,124,78,0.2), 0 4px 20px rgba(198,124,78,0.2)',
        'glow-lg':    '0 0 0 3px rgba(198,124,78,0.3), 0 8px 32px rgba(198,124,78,0.25)',
        'inner':      'inset 0 2px 4px rgba(0,0,0,0.06)',
        'amber':      '0 4px 20px rgba(198,124,78,0.4), 0 1px 3px rgba(0,0,0,0.1)',
        'amber-lg':   '0 8px 40px rgba(198,124,78,0.5), 0 0 0 1px rgba(232,184,150,0.4)',
      },
      backdropBlur: {
        'glass': '12px',
      },
      animation: {
        'shimmer':   'shimmer 2.5s ease-in-out infinite',
        'float':     'float 3s ease-in-out infinite',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%, 100%': { transform: 'translateX(-100%)' },
          '50%':      { transform: 'translateX(200%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-6px)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%':      { opacity: '1',   transform: 'scale(1.15)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
