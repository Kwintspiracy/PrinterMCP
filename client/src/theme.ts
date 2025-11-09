import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  colors: {
    brand: {
      50: '#f0e7ff',
      100: '#d1b3ff',
      200: '#b380ff',
      300: '#944dff',
      400: '#764ba2',
      500: '#667eea',
      600: '#5568d3',
      700: '#4552bc',
      800: '#343da5',
      900: '#24278e',
    },
  },
  styles: {
    global: {
      body: {
        bg: 'gray.50',
      },
    },
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'brand',
      },
    },
  },
});

export default theme;
