/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        purple: {
          DEFAULT: '#6734ff',
          2: '#5d22f5',
        },
        ink: '#111827',
        muted: '#667085',
        line: '#e5e7eb',
        soft: '#fafafa',
        lav: '#f3edff',
        danger: '#ff3b30',
        meta: '#475467',
        meta2: '#4b5563',
        subtle: '#596579',
        subtle2: '#526071',
        subtle3: '#445064',
        subtle4: '#697386',
        border: '#dfe3ea',
        border2: '#edf0f3',
        border3: '#e1d8ff',
        border4: '#e7e9ef',
        border5: '#e0e3e9',
        border6: '#e2e5ea',
        border7: '#d0d5dd',
        border8: '#e8e9ee',
      },
      fontFamily: {
        cairo: ['Cairo', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        '9': '9px',
        '10': '10px',
        '11': '11px',
        '13': '13px',
        '14': '14px',
        '20': '20px',
      },
      boxShadow: {
        'stat': '0 2px 8px rgba(16,24,40,.07)',
        'product': '0 1px 4px rgba(16,24,40,.03)',
        'bottom': '0 -2px 12px rgba(16,24,40,.04)',
      },
      maxWidth: {
        'app': '430px',
      },
      minHeight: {
        'stat': '121px',
        'nav-btn': '61px',
      },
    },
  },
  plugins: [],
}
