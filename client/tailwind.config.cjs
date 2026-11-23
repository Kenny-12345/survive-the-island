const path = require('path');
module.exports = {
  content: [path.join(__dirname, 'index.html'), path.join(__dirname, 'src/**/*.{ts,tsx}')],
  theme: {
    extend: {
      colors: {
        abyss: '#06152b', navy: '#0b2545', deep: '#13315c', lagoon: '#1e88a8', foam: '#e0f7fa',
        sand: '#f4d9a6', sandDark: '#d9b26f', palm: '#2f9e44', jungle: '#1b5e20', coral: '#ff6b5b', sun: '#ffc93c',
      },
      fontFamily: { display: ['"Lilita One"', 'system-ui', 'sans-serif'], body: ['Nunito', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
