export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        typo1: ['"Typo 1"', 'system-ui', 'sans-serif'],
        typo2: ['"Typo 2"', 'system-ui', 'sans-serif'],
        typo3: ['"Typo 3"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
