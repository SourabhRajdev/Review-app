import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm cafe palette — cream backgrounds, espresso text, amber accents.
        ink: {
          DEFAULT: '#3C2415',   // espresso brown
          soft: '#5C3D2E',
          muted: '#8B7355',
          quiet: '#B8A590',
          ghost: '#D4C4B0'
        },
        surface: {
          DEFAULT: '#FFFBF5',   // warm cream
          raised: '#FFF8EF',
          sunken: '#F5EDE3',
          card: '#FFFFFF'
        },
        brand: {
          DEFAULT: '#C67C4E',   // warm amber/coffee
          light: '#E8A87C',
          dark: '#92400E',
          warm: '#F59E0B',
          good: '#4CAF50',
          bad: '#E53935',
          cream: '#FEF3C7'
        },
        accent: {
          amber: '#F59E0B',
          rose: '#F472B6',
          teal: '#2DD4BF',
          violet: '#A78BFA'
        }
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        body: [
          'Karla',
          '-apple-system',
          'BlinkMacSystemFont',
          'Inter',
          'system-ui',
          'sans-serif'
        ]
      },
      letterSpacing: {
        tightest: '-0.035em',
        tighter: '-0.022em',
        tight: '-0.014em'
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '24px',
        '4xl': '32px'
      },
      boxShadow: {
        card: '0 1px 3px rgba(60,36,21,0.04), 0 8px 24px -8px rgba(60,36,21,0.08)',
        'card-lg':
          '0 2px 4px rgba(60,36,21,0.04), 0 16px 40px -12px rgba(60,36,21,0.12)',
        'card-warm':
          '0 2px 8px rgba(198,124,78,0.12), 0 16px 40px -12px rgba(198,124,78,0.16)',
        glass:
          '0 1px 2px rgba(60,36,21,0.04), 0 24px 48px -16px rgba(60,36,21,0.10), inset 0 1px 0 rgba(255,255,255,0.6)',
        glow: '0 0 20px rgba(198,124,78,0.25), 0 0 60px rgba(198,124,78,0.10)',
        'chip': '0 1px 3px rgba(60,36,21,0.06), 0 1px 2px rgba(60,36,21,0.04)',
        'chip-active': '0 2px 8px rgba(198,124,78,0.20), 0 1px 2px rgba(198,124,78,0.08)'
      },
      backgroundImage: {
        'gradient-warm': 'linear-gradient(135deg, #FFFBF5 0%, #FEF3C7 50%, #FFF8EF 100%)',
        'gradient-hero': 'linear-gradient(180deg, #FEF3C7 0%, #FFFBF5 60%, #FFFFFF 100%)',
        'gradient-card': 'linear-gradient(135deg, #FFFFFF 0%, #FFF8EF 100%)',
        'gradient-brand': 'linear-gradient(135deg, #C67C4E 0%, #E8A87C 100%)',
        'gradient-amber': 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
        'shimmer': 'linear-gradient(110deg, transparent 33%, rgba(255,255,255,0.6) 50%, transparent 67%)'
      },
      animation: {
        'shimmer': 'shimmer 2s infinite linear',
        'pulse-warm': 'pulse-warm 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'write': 'write 1.5s steps(30) forwards'
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' }
        },
        'pulse-warm': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' }
        },
        write: {
          '0%': { width: '0' },
          '100%': { width: '100%' }
        }
      }
    }
  },
  plugins: []
} satisfies Config;
