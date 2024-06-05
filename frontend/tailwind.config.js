/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/components/**/*.{js,jsx,mdx}",
    "./src/app/**/*.{js,jsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    fontFamily: {
      'sans': ['var(--font-open-sans)'],
    },
    extend: {
      colors: {
        'primary-blue': 'rgb(178, 217, 231)',
        'primary-orange': 'rgb(243, 195, 177)',
        'main-text': 'rgb(107, 107, 107)',
        'light-gray': 'rgb(244, 244, 244)',
      },
    },
  },
  plugins: [],
};
