/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        white: '#FFFFFF',
        cream: '#FAFAFA',
        surface: '#F5F5F5',
        'motor-blue': '#3B82F6',
        'motor-yellow': '#F59E0B',
        'motor-orange': '#F97316',
        'motor-text': '#1A1A1A',
        'motor-text-secondary': '#666666',
        'motor-text-disabled': '#999999',
        'motor-border': '#E8E8E8',
        'motor-border-visible': '#CCCCCC',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        'space-mono': ['Space Mono', 'monospace'],
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'elevated': '0 4px 16px rgba(0, 0, 0, 0.12)',
      },
      borderRadius: {
        'card': '16px',
        'button': '12px',
      },
      spacing: {
        '4': '4px',
      },
    },
  },
  plugins: [],
}