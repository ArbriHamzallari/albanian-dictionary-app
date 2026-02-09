/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Fjalingo Brand
        'fjalingo-green': '#58CC02',
        'fjalingo-green-dark': '#4CAF02',
        'fjalingo-blue': '#1CB0F6',
        'fjalingo-yellow': '#FFC800',
        'fjalingo-red': '#FF4B4B',
        'fjalingo-purple': '#CE82FF',
        'fjalingo-orange': '#FF9600',
        // Neutrals
        background: '#FFFFFF',
        card: '#F7F7F7',
        heading: '#3C3C3C',
        body: '#4A4A4A',
        muted: '#777777',
        border: '#E5E5E5',
        // Dark mode
        dark: {
          bg: '#1A1A1A',
          card: '#2D2D2D',
          border: '#404040',
          text: '#F5F5F5',
          muted: '#A0A0A0',
        },
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
        pill: '9999px',
      },
      boxShadow: {
        button: '0 4px 0 rgba(0,0,0,0.15)',
        'button-hover': '0 6px 0 rgba(0,0,0,0.15)',
        card: '0 2px 8px rgba(0,0,0,0.08)',
        'card-hover': '0 8px 16px rgba(0,0,0,0.12)',
      },
      minHeight: {
        button: '48px',
      },
      animation: {
        'flame-flicker': 'flicker 1.5s ease-in-out infinite alternate',
        'float-up': 'floatUp 0.6s ease-out forwards',
        'shake': 'shake 0.5s ease-in-out',
        'bounce-in': 'bounceIn 0.5s ease-out',
        'fall': 'fall linear infinite',
        'fly': 'fly 15s ease-in-out',
      },
      keyframes: {
        flicker: {
          '0%': { transform: 'scale(1) rotate(-3deg)', opacity: '1' },
          '50%': { transform: 'scale(1.1) rotate(3deg)', opacity: '0.85' },
          '100%': { transform: 'scale(1) rotate(-3deg)', opacity: '1' },
        },
        floatUp: {
          '0%': { opacity: '0', transform: 'translateY(20px) scale(0.8)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '60%': { transform: 'scale(1.15)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
        fall: {
          '0%': { transform: 'translateY(-100px) rotate(0deg)', opacity: '0' },
          '10%': { opacity: '0.15' },
          '90%': { opacity: '0.15' },
          '100%': { transform: 'translateY(110vh) rotate(360deg)', opacity: '0' },
        },
        fly: {
          '0%': { transform: 'translateX(-120px) translateY(0px)' },
          '25%': { transform: 'translateX(25vw) translateY(-30px)' },
          '50%': { transform: 'translateX(50vw) translateY(10px)' },
          '75%': { transform: 'translateX(75vw) translateY(-20px)' },
          '100%': { transform: 'translateX(110vw) translateY(0px)' },
        },
      },
    },
  },
  plugins: [],
};
