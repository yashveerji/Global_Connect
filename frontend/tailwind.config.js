/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#1A1F71',
          dark: '#23243a',
        },
        accent: {
          DEFAULT: '#0A66C2', // LinkedIn blue
          alt: '#1877F2',     // Facebook blue
          gold: '#FFD700',
        },
        // Dark mode system tokens (reference via CSS variables in index.css)
        gc: {
          dmBg: '#121212',
          dmSurface: '#1E1E1E',
          dmSurfaceAlt: '#23272F',
          dmBorder: '#2C2F36',
          dmText: '#E4E6EB',
          dmMuted: '#B0B3B8',
          dmHeading: '#F5F6F7',
        },
      },
      boxShadow: {
        elevated: '0 10px 30px -12px rgba(0,0,0,0.55), 0 6px 12px -8px rgba(0,0,0,0.35)',
        subtle: '0 8px 20px -14px rgba(0,0,0,0.45)',
      },
      borderRadius: {
        xl: '12px',
        lg: '10px',
      },
      transitionProperty: {
        theme: 'background-color, color, border-color, box-shadow, fill, stroke',
      },
    },
  },
  plugins: [],
}

