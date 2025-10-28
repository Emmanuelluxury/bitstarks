// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#7c3aed',
        'primary-dark': '#6d28d9',
        'primary-light': 'rgba(124, 58, 237, 0.15)',
        secondary: '#10b981',
        'secondary-dark': '#059669',
        dark: '#0f172a',
        darker: '#0a0f1c',
        light: '#f9fafb',
        lighter: '#ffffff',
        gray: '#94a3b8',
        'gray-light': 'rgba(148, 163, 184, 0.2)',
        danger: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6',
        'bitcoin-orange': '#f7931a',
        'starknet-purple': '#8a2be2',
      },
      borderRadius: {
        'DEFAULT': '12px',
      },
      boxShadow: {
        'card': '0 10px 25px rgba(0, 0, 0, 0.2)',
      },
      animation: {
        'pulse-slow': 'pulse 3s infinite',
      }
    },
  },
  plugins: [],
}