/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['system-ui', 'sans-serif'],
      },
      animation: {
        'fadeIn': 'fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        'slideIn': 'slideIn 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        'scaleIn': 'scaleIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce': 'bounce 1s infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
        'morphing-gradient': 'morphing-gradient 8s ease-in-out infinite',
        'particle-float': 'particle-float 20s linear infinite',
        'text-glow': 'text-glow 4s ease-in-out infinite',
        'glow-border': 'glow-border 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%': { transform: 'translateY(-10px) rotate(1deg)' },
          '66%': { transform: 'translateY(-5px) rotate(-1deg)' },
        },
        'pulse-glow': {
          '0%, 100%': { 
            boxShadow: '0 0 20px hsla(142, 76%, 36%, 0.3), 0 0 40px hsla(142, 76%, 36%, 0.15)'
          },
          '50%': { 
            boxShadow: '0 0 30px hsla(142, 76%, 36%, 0.5), 0 0 60px hsla(142, 76%, 36%, 0.25)'
          },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'morphing-gradient': {
          '0%, 100%': { 
            backgroundPosition: '0% 50%',
            filter: 'hue-rotate(0deg)',
          },
          '25%': { 
            backgroundPosition: '100% 50%',
            filter: 'hue-rotate(90deg)',
          },
          '50%': { 
            backgroundPosition: '100% 100%',
            filter: 'hue-rotate(180deg)',
          },
          '75%': { 
            backgroundPosition: '0% 100%',
            filter: 'hue-rotate(270deg)',
          },
        },
        'particle-float': {
          '0%, 100%': { 
            transform: 'translate(0, 0) scale(1)',
            opacity: '0.7',
          },
          '25%': { 
            transform: 'translate(10px, -15px) scale(1.1)',
            opacity: '1',
          },
          '50%': { 
            transform: 'translate(-5px, -25px) scale(0.9)',
            opacity: '0.8',
          },
          '75%': { 
            transform: 'translate(-15px, -10px) scale(1.05)',
            opacity: '0.9',
          },
        },
        'text-glow': {
          '0%, 100%': {
            textShadow: '0 0 10px hsla(142, 76%, 36%, 0.5), 0 0 20px hsla(142, 76%, 36%, 0.3)',
          },
          '50%': {
            textShadow: '0 0 20px hsla(142, 76%, 36%, 0.8), 0 0 30px hsla(142, 76%, 36%, 0.5), 0 0 40px hsla(142, 76%, 36%, 0.2)',
          },
        },
        'glow-border': {
          '0%, 100%': {
            borderColor: 'rgb(52, 211, 153)',
            boxShadow: '0 0 15px rgba(52, 211, 153, 0.3), 0 0 25px rgba(52, 211, 153, 0.15)',
          },
          '50%': {
            borderColor: 'rgb(16, 185, 129)',
            boxShadow: '0 0 25px rgba(16, 185, 129, 0.5), 0 0 40px rgba(16, 185, 129, 0.25), 0 0 60px rgba(16, 185, 129, 0.1)',
          },
        },
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(34, 197, 94, 0.3)',
        'glow-lg': '0 0 40px rgba(34, 197, 94, 0.4)',
        'neon': '0 0 5px theme(colors.emerald.400), 0 0 20px theme(colors.emerald.400), 0 0 35px theme(colors.emerald.400)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}