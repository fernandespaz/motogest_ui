/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          // rgb(var(--brand-XXX-channel) / <alpha-value>), not var(--brand-XXX)
          // directly — this form is what lets Tailwind apply opacity modifiers
          // (bg-brand-900/40) to a CSS-variable-based color. See index.css.
          50: 'rgb(var(--brand-50-channel) / <alpha-value>)',
          100: 'rgb(var(--brand-100-channel) / <alpha-value>)',
          200: 'rgb(var(--brand-200-channel) / <alpha-value>)',
          300: 'rgb(var(--brand-300-channel) / <alpha-value>)',
          400: 'rgb(var(--brand-400-channel) / <alpha-value>)',
          500: 'rgb(var(--brand-500-channel) / <alpha-value>)',
          600: 'rgb(var(--brand-600-channel) / <alpha-value>)',
          700: 'rgb(var(--brand-700-channel) / <alpha-value>)',
          800: 'rgb(var(--brand-800-channel) / <alpha-value>)',
          900: 'rgb(var(--brand-900-channel) / <alpha-value>)',
        },
        surface: 'var(--surface)',
        'surface-alt': 'var(--surface-alt)',
        border: 'var(--border)',
        ink: 'var(--ink)',
        'ink-muted': 'var(--ink-muted)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        graphite: {
          DEFAULT: 'var(--graphite)',
          2: 'var(--graphite-2)',
          3: 'var(--graphite-3)',
        },
        'line-dark': 'var(--line-dark)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Archivo', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 6px -1px rgb(0 0 0 / 0.06)',
      },
    },
  },
  plugins: [],
};
