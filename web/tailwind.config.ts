import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { '2xl': '1280px' },
    },
    extend: {
      fontFamily: {
        vazir: ['Vazirmatn', 'tahoma', 'sans-serif'],
        sans: ['Vazirmatn', 'tahoma', 'sans-serif'],
        display: ['Vazirmatn', 'tahoma', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          hover: 'hsl(var(--primary-hover))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
          bg: 'hsl(var(--destructive-bg))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
          bg: 'hsl(var(--success-bg))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
          bg: 'hsl(var(--warning-bg))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
          bg: 'hsl(var(--info-bg))',
        },
        money: {
          DEFAULT: 'hsl(var(--money))',
          foreground: 'hsl(var(--money-foreground))',
          bg: 'hsl(var(--money-bg))',
          muted: 'hsl(var(--money-muted))',
        },
        status: {
          pending: 'hsl(var(--status-pending))',
          'pending-bg': 'hsl(var(--status-pending-bg))',
          approved: 'hsl(var(--status-approved))',
          'approved-bg': 'hsl(var(--status-approved-bg))',
          rejected: 'hsl(var(--status-rejected))',
          'rejected-bg': 'hsl(var(--status-rejected-bg))',
          suspended: 'hsl(var(--status-suspended))',
          'suspended-bg': 'hsl(var(--status-suspended-bg))',
        },
        sand: 'hsl(var(--sand, 36 35% 94%))',
        cream: 'hsl(var(--cream, 40 40% 98%))',
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 6px)',
        xl: 'calc(var(--radius) + 6px)',
        '2xl': 'calc(var(--radius) + 14px)',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(20 28 30 / 0.04)',
        soft: '0 1px 3px 0 rgb(20 28 30 / 0.06), 0 1px 2px -1px rgb(20 28 30 / 0.06)',
        card: '0 2px 8px -2px rgb(20 28 30 / 0.08), 0 1px 2px -1px rgb(20 28 30 / 0.04)',
        raised: '0 8px 24px -6px rgb(20 28 30 / 0.14), 0 2px 6px -2px rgb(20 28 30 / 0.06)',
        popover: '0 12px 32px -8px rgb(20 28 30 / 0.22)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-up': {
          from: { opacity: '0', transform: 'translateY(100%)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(-12px) scale(0.95)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'cart-bounce': {
          '0%, 100%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.18)' },
          '70%': { transform: 'scale(0.94)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease-out both',
        'fade-up': 'fade-up 0.45s cubic-bezier(0.16,1,0.3,1) both',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.16,1,0.3,1) both',
        'slide-in-up': 'slide-in-up 0.3s cubic-bezier(0.16,1,0.3,1) both',
        'toast-in': 'toast-in 0.25s cubic-bezier(0.16,1,0.3,1) both',
        'cart-bounce': 'cart-bounce 0.45s cubic-bezier(0.16,1,0.3,1)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
