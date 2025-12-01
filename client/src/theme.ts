import { extendTheme, type ThemeConfig } from '@chakra-ui/react';
import { mode } from '@chakra-ui/theme-tools';

const config: ThemeConfig = {
  initialColorMode: 'system',
  useSystemColorMode: true,
};

const theme = extendTheme({
  config,
  fonts: {
    heading: `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif`,
    body: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif`,
    mono: `"SF Mono", "Monaco", "Inconsolata", "Fira Mono", "Droid Sans Mono", "Source Code Pro", monospace`,
  },
  colors: {
    apple: {
      50: '#f5f5f7',
      100: '#e5e5e7',
      200: '#d2d2d7',
      300: '#aeaeb2',
      400: '#86868b',
      500: '#6e6e73',
      600: '#1d1d1f',
      900: '#000000',
      blue: '#0071e3',
      blueDark: '#2997ff',
    },
    // Semantic colors
    bg: {
      light: '#fbfbfd',
      dark: '#000000',
    },
    card: {
      light: 'rgba(255, 255, 255, 0.8)',
      dark: 'rgba(28, 28, 30, 0.6)',
    }
  },
  styles: {
    global: (props: any) => ({
      body: {
        bg: mode('#f5f5f7', '#000000')(props),
        color: mode('#1d1d1f', '#f5f5f7')(props),
        fontFamily: 'body',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      },
      '*::placeholder': {
        color: mode('gray.400', 'gray.500')(props),
      },
    }),
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: '500',
        borderRadius: 'full',
        transition: 'all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1)',
      },
      variants: {
        solid: (props: any) => ({
          bg: mode('#0071e3', '#2997ff')(props),
          color: 'white',
          _hover: {
            bg: mode('#0077ED', '#006edb')(props),
            transform: 'scale(1.02)',
            boxShadow: '0 4px 12px rgba(0, 113, 227, 0.3)',
          },
          _active: {
            transform: 'scale(0.98)',
          },
        }),
        ghost: (props: any) => ({
          color: mode('#0071e3', '#2997ff')(props),
          bg: 'transparent',
          _hover: {
            bg: mode('rgba(0, 113, 227, 0.1)', 'rgba(41, 151, 255, 0.1)')(props),
          },
        }),
        outline: (props: any) => ({
          borderColor: mode('#d2d2d7', '#424245')(props),
          color: mode('#1d1d1f', '#f5f5f7')(props),
          _hover: {
            bg: mode('rgba(0,0,0,0.05)', 'rgba(255,255,255,0.1)')(props),
          },
        }),
      },
    },
    Card: {
      baseStyle: (props: any) => ({
        container: {
          bg: mode('rgba(255, 255, 255, 0.7)', 'rgba(28, 28, 30, 0.6)')(props),
          backdropFilter: 'blur(20px)',
          borderRadius: '2xl',
          border: '1px solid',
          borderColor: mode('rgba(0,0,0,0.05)', 'rgba(255,255,255,0.1)')(props),
          boxShadow: mode(
            '0 4px 24px rgba(0,0,0,0.04)',
            '0 4px 24px rgba(0,0,0,0.2)'
          )(props),
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          _hover: {
            transform: 'translateY(-4px)',
            boxShadow: mode(
              '0 12px 32px rgba(0,0,0,0.08)',
              '0 12px 32px rgba(0,0,0,0.3)'
            )(props),
          },
        },
      }),
    },
    Badge: {
      baseStyle: {
        borderRadius: 'full',
        px: 3,
        py: 1,
        fontWeight: '500',
        textTransform: 'none',
        fontSize: 'xs',
      },
      variants: {
        subtle: (props: any) => ({
          bg: mode(`${props.colorScheme}.100`, `${props.colorScheme}.900`)(props),
          color: mode(`${props.colorScheme}.700`, `${props.colorScheme}.200`)(props),
        }),
      },
    },
    Progress: {
      baseStyle: {
        track: {
          borderRadius: 'full',
          bg: mode('gray.100', 'gray.700'),
        },
        filledTrack: {
          borderRadius: 'full',
        },
      },
    },
    Input: {
      variants: {
        filled: (props: any) => ({
          field: {
            bg: mode('rgba(0,0,0,0.05)', 'rgba(255,255,255,0.1)')(props),
            borderRadius: 'xl',
            border: '1px solid',
            borderColor: 'transparent',
            _hover: {
              bg: mode('rgba(0,0,0,0.08)', 'rgba(255,255,255,0.15)')(props),
            },
            _focus: {
              bg: mode('white', 'black')(props),
              borderColor: mode('#0071e3', '#2997ff')(props),
              boxShadow: `0 0 0 1px ${mode('#0071e3', '#2997ff')(props)}`,
            },
          },
        }),
      },
      defaultProps: {
        variant: 'filled',
      },
    },
  },
});

export default theme;
