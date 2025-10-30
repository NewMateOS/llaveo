/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          500: '#E2905C',
          600: '#D67F49',
          700: '#C76E3A'
        },
        primary: {
          50: '#FFF3EB',
          100: '#FFE4D3',
          200: '#F9C8A8',
          300: '#F2B085',
          400: '#EC9A6B',
          500: '#E2905C', // base
          600: '#D67F49',
          700: '#C76E3A',
          800: '#A9572A',
          900: '#7D3F1F'
        },
        ink: '#000000'
      }
    }
  },
  plugins: []
};

