import { extendTheme, type ThemeConfig } from '@chakra-ui/react';
import { mode } from '@chakra-ui/theme-tools';

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
};

// GitHub Primer Design System Colors
const colors = {
  // GitHub Canvas backgrounds
  canvas: {
    default: '#0d1117',
    subtle: '#161b22',
    inset: '#010409',
  },
  // Light mode canvas
  canvasLight: {
    default: '#ffffff',
    subtle: '#f6f8fa',
    inset: '#eff2f5',
  },
  // GitHub border colors
  border: {
    default: '#30363d',
    muted: '#21262d',
    subtle: '#6e768166',
  },
  borderLight: {
    default: '#d0d7de',
    muted: '#d8dee4',
    subtle: '#afb8c133',
  },
  // GitHub foreground/text colors
  fg: {
    default: '#e6edf3',
    muted: '#8b949e',
    subtle: '#6e7681',
    onEmphasis: '#ffffff',
  },
  fgLight: {
    default: '#1f2328',
    muted: '#656d76',
    subtle: '#6e7681',
    onEmphasis: '#ffffff',
  },
  // GitHub accent colors
  accent: {
    fg: '#58a6ff',
    emphasis: '#1f6feb',
    muted: '#388bfd66',
    subtle: '#388bfd26',
  },
  // GitHub success colors
  success: {
    fg: '#3fb950',
    emphasis: '#238636',
    muted: '#2ea04366',
    subtle: '#2ea04326',
  },
  // GitHub danger colors
  danger: {
    fg: '#f85149',
    emphasis: '#da3633',
    muted: '#f8514966',
    subtle: '#f8514926',
  },
  // GitHub warning colors
  attention: {
    fg: '#d29922',
    emphasis: '#9e6a03',
    muted: '#d2992266',
    subtle: '#d2992226',
  },
  // GitHub done/purple colors
  done: {
    fg: '#a371f7',
    emphasis: '#8957e5',
    muted: '#8957e566',
    subtle: '#8957e526',
  },
  // Ink colors (keep for printer functionality)
  ink: {
    cyan: '#00b4d8',
    magenta: '#e91e8c',
    yellow: '#ffc107',
    black: '#424242',
  },
};

const theme = extendTheme({
  config,
  colors,
  fonts: {
    heading: `-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif`,
    body: `-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif`,
    mono: `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace`,
  },
  fontSizes: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '20px',
    xl: '24px',
    '2xl': '32px',
  },
  fontWeights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  radii: {
    none: '0',
    sm: '3px',
    md: '6px',
    lg: '6px',
    xl: '12px',
    full: '9999px',
  },
  space: {
    px: '1px',
    0.5: '2px',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
  },
  styles: {
    global: (props: any) => ({
      body: {
        bg: mode('canvasLight.default', 'canvas.default')(props),
        color: mode('fgLight.default', 'fg.default')(props),
        fontFamily: 'body',
        fontSize: 'sm',
        lineHeight: 1.5,
      },
      '*::placeholder': {
        color: mode('fgLight.subtle', 'fg.subtle')(props),
      },
      '*:focus': {
        outline: 'none',
      },
      '*:focus-visible': {
        boxShadow: mode(
          '0 0 0 3px rgba(9, 105, 218, 0.3)',
          '0 0 0 3px rgba(56, 139, 253, 0.4)'
        )(props),
        borderColor: mode('accent.emphasis', 'accent.fg')(props),
      },
    }),
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'medium',
        borderRadius: 'md',
        lineHeight: 1.25,
        transition: 'all 0.1s ease',
      },
      sizes: {
        sm: {
          h: '28px',
          minW: '28px',
          fontSize: 'xs',
          px: 3,
        },
        md: {
          h: '32px',
          minW: '32px',
          fontSize: 'sm',
          px: 4,
        },
        lg: {
          h: '40px',
          minW: '40px',
          fontSize: 'sm',
          px: 4,
        },
      },
      variants: {
        solid: (props: any) => ({
          bg: mode('success.emphasis', 'success.emphasis')(props),
          color: 'white',
          border: '1px solid',
          borderColor: 'transparent',
          _hover: {
            bg: mode('#2ea043', '#2ea043')(props),
            _disabled: {
              bg: mode('success.emphasis', 'success.emphasis')(props),
            },
          },
          _active: {
            bg: mode('#238636', '#238636')(props),
          },
        }),
        primary: (props: any) => ({
          bg: mode('success.emphasis', 'success.emphasis')(props),
          color: 'white',
          border: '1px solid',
          borderColor: 'transparent',
          _hover: {
            bg: '#2ea043',
          },
          _active: {
            bg: '#238636',
          },
        }),
        secondary: (props: any) => ({
          bg: mode('canvasLight.subtle', 'canvas.subtle')(props),
          color: mode('fgLight.default', 'fg.default')(props),
          border: '1px solid',
          borderColor: mode('borderLight.default', 'border.default')(props),
          _hover: {
            bg: mode('#f3f4f6', '#30363d')(props),
            borderColor: mode('fgLight.muted', 'fg.muted')(props),
          },
          _active: {
            bg: mode('#ebecf0', '#282e33')(props),
          },
        }),
        outline: (props: any) => ({
          bg: 'transparent',
          color: mode('fgLight.default', 'fg.default')(props),
          border: '1px solid',
          borderColor: mode('borderLight.default', 'border.default')(props),
          _hover: {
            bg: mode('canvasLight.subtle', 'canvas.subtle')(props),
          },
        }),
        danger: (props: any) => ({
          bg: 'transparent',
          color: mode('danger.fg', 'danger.fg')(props),
          border: '1px solid',
          borderColor: mode('borderLight.default', 'border.default')(props),
          _hover: {
            bg: mode('danger.emphasis', 'danger.emphasis')(props),
            color: 'white',
            borderColor: 'transparent',
          },
        }),
        ghost: (props: any) => ({
          bg: 'transparent',
          color: mode('fgLight.muted', 'fg.muted')(props),
          _hover: {
            bg: mode('canvasLight.subtle', 'canvas.subtle')(props),
            color: mode('fgLight.default', 'fg.default')(props),
          },
        }),
        link: (props: any) => ({
          bg: 'transparent',
          color: mode('accent.emphasis', 'accent.fg')(props),
          _hover: {
            textDecoration: 'underline',
          },
        }),
      },
      defaultProps: {
        variant: 'secondary',
        size: 'md',
      },
    },
    Card: {
      baseStyle: (props: any) => ({
        container: {
          bg: mode('canvasLight.default', 'canvas.subtle')(props),
          borderRadius: 'md',
          border: '1px solid',
          borderColor: mode('borderLight.default', 'border.default')(props),
          overflow: 'hidden',
          boxShadow: 'none',
        },
        header: {
          bg: mode('canvasLight.subtle', 'canvas.default')(props),
          borderBottom: '1px solid',
          borderColor: mode('borderLight.default', 'border.default')(props),
          px: 4,
          py: 3,
        },
        body: {
          p: 4,
        },
      }),
    },
    Badge: {
      baseStyle: {
        borderRadius: 'full',
        px: 2,
        py: 0.5,
        fontWeight: 'medium',
        fontSize: 'xs',
        textTransform: 'none',
        lineHeight: 1.5,
      },
      variants: {
        subtle: (props: any) => ({
          bg: mode(`${props.colorScheme}.subtle`, `${props.colorScheme}.subtle`)(props),
          color: mode(`${props.colorScheme}.fg`, `${props.colorScheme}.fg`)(props),
        }),
        solid: (props: any) => ({
          bg: mode(`${props.colorScheme}.emphasis`, `${props.colorScheme}.emphasis`)(props),
          color: 'white',
        }),
        outline: (props: any) => ({
          bg: 'transparent',
          color: mode(`${props.colorScheme}.fg`, `${props.colorScheme}.fg`)(props),
          border: '1px solid',
          borderColor: mode(`${props.colorScheme}.muted`, `${props.colorScheme}.muted`)(props),
        }),
      },
      defaultProps: {
        variant: 'subtle',
        colorScheme: 'accent',
      },
    },
    Input: {
      variants: {
        outline: (props: any) => ({
          field: {
            bg: mode('canvasLight.default', 'canvas.default')(props),
            border: '1px solid',
            borderColor: mode('borderLight.default', 'border.default')(props),
            borderRadius: 'md',
            color: mode('fgLight.default', 'fg.default')(props),
            _hover: {
              borderColor: mode('fgLight.muted', 'fg.muted')(props),
            },
            _focus: {
              borderColor: mode('accent.emphasis', 'accent.fg')(props),
              boxShadow: mode(
                '0 0 0 3px rgba(9, 105, 218, 0.3)',
                '0 0 0 3px rgba(56, 139, 253, 0.4)'
              )(props),
            },
            _placeholder: {
              color: mode('fgLight.subtle', 'fg.subtle')(props),
            },
          },
        }),
      },
      sizes: {
        md: {
          field: {
            h: '32px',
            fontSize: 'sm',
            px: 3,
          },
        },
        lg: {
          field: {
            h: '40px',
            fontSize: 'sm',
            px: 4,
          },
        },
      },
      defaultProps: {
        variant: 'outline',
        size: 'md',
      },
    },
    Select: {
      variants: {
        outline: (props: any) => ({
          field: {
            bg: mode('canvasLight.default', 'canvas.default')(props),
            border: '1px solid',
            borderColor: mode('borderLight.default', 'border.default')(props),
            borderRadius: 'md',
            color: mode('fgLight.default', 'fg.default')(props),
            _hover: {
              borderColor: mode('fgLight.muted', 'fg.muted')(props),
            },
            _focus: {
              borderColor: mode('accent.emphasis', 'accent.fg')(props),
              boxShadow: mode(
                '0 0 0 3px rgba(9, 105, 218, 0.3)',
                '0 0 0 3px rgba(56, 139, 253, 0.4)'
              )(props),
            },
          },
        }),
      },
      sizes: {
        md: {
          field: {
            h: '32px',
            fontSize: 'sm',
            px: 3,
          },
        },
      },
      defaultProps: {
        variant: 'outline',
        size: 'md',
      },
    },
    NumberInput: {
      variants: {
        outline: (props: any) => ({
          field: {
            bg: mode('canvasLight.default', 'canvas.default')(props),
            border: '1px solid',
            borderColor: mode('borderLight.default', 'border.default')(props),
            borderRadius: 'md',
            color: mode('fgLight.default', 'fg.default')(props),
            _hover: {
              borderColor: mode('fgLight.muted', 'fg.muted')(props),
            },
            _focus: {
              borderColor: mode('accent.emphasis', 'accent.fg')(props),
              boxShadow: mode(
                '0 0 0 3px rgba(9, 105, 218, 0.3)',
                '0 0 0 3px rgba(56, 139, 253, 0.4)'
              )(props),
            },
          },
        }),
      },
      defaultProps: {
        variant: 'outline',
        size: 'md',
      },
    },
    Checkbox: {
      baseStyle: (props: any) => ({
        control: {
          borderRadius: 'sm',
          borderColor: mode('borderLight.default', 'border.default')(props),
          _checked: {
            bg: mode('accent.emphasis', 'accent.fg')(props),
            borderColor: mode('accent.emphasis', 'accent.fg')(props),
            _hover: {
              bg: mode('accent.emphasis', 'accent.fg')(props),
              borderColor: mode('accent.emphasis', 'accent.fg')(props),
            },
          },
          _focus: {
            boxShadow: mode(
              '0 0 0 3px rgba(9, 105, 218, 0.3)',
              '0 0 0 3px rgba(56, 139, 253, 0.4)'
            )(props),
          },
        },
        label: {
          fontSize: 'sm',
          color: mode('fgLight.default', 'fg.default')(props),
        },
      }),
    },
    Progress: {
      baseStyle: (props: any) => ({
        track: {
          bg: mode('canvasLight.inset', 'canvas.inset')(props),
          borderRadius: 'full',
        },
        filledTrack: {
          borderRadius: 'full',
          transition: 'width 0.3s ease',
        },
      }),
      variants: {
        success: {
          filledTrack: {
            bg: 'success.emphasis',
          },
        },
        danger: {
          filledTrack: {
            bg: 'danger.emphasis',
          },
        },
        attention: {
          filledTrack: {
            bg: 'attention.emphasis',
          },
        },
      },
      sizes: {
        sm: {
          track: { h: '4px' },
        },
        md: {
          track: { h: '8px' },
        },
        lg: {
          track: { h: '12px' },
        },
      },
      defaultProps: {
        size: 'sm',
        colorScheme: 'green',
      },
    },
    Alert: {
      baseStyle: {
        container: {
          borderRadius: 'md',
          px: 4,
          py: 3,
        },
      },
      variants: {
        subtle: (props: any) => {
          const { status } = props;
          const statusColorMap: Record<string, string> = {
            success: 'success',
            error: 'danger',
            warning: 'attention',
            info: 'accent',
          };
          const colorKey = statusColorMap[status] || 'accent';
          return {
            container: {
              bg: mode(`${colorKey}.subtle`, `${colorKey}.subtle`)(props),
              border: '1px solid',
              borderColor: mode(`${colorKey}.muted`, `${colorKey}.muted`)(props),
            },
            icon: {
              color: mode(`${colorKey}.fg`, `${colorKey}.fg`)(props),
            },
            title: {
              color: mode('fgLight.default', 'fg.default')(props),
            },
            description: {
              color: mode('fgLight.muted', 'fg.muted')(props),
            },
          };
        },
      },
      defaultProps: {
        variant: 'subtle',
      },
    },
    Menu: {
      baseStyle: (props: any) => ({
        list: {
          bg: mode('canvasLight.default', 'canvas.subtle')(props),
          border: '1px solid',
          borderColor: mode('borderLight.default', 'border.default')(props),
          borderRadius: 'md',
          boxShadow: mode(
            '0 8px 24px rgba(140, 149, 159, 0.2)',
            '0 8px 24px rgba(1, 4, 9, 0.75)'
          )(props),
          py: 1,
        },
        item: {
          bg: 'transparent',
          color: mode('fgLight.default', 'fg.default')(props),
          fontSize: 'sm',
          px: 4,
          py: 2,
          _hover: {
            bg: mode('accent.subtle', 'accent.subtle')(props),
          },
          _focus: {
            bg: mode('accent.subtle', 'accent.subtle')(props),
          },
        },
        divider: {
          borderColor: mode('borderLight.default', 'border.default')(props),
          my: 1,
        },
      }),
    },
    Tooltip: {
      baseStyle: (props: any) => ({
        bg: mode('#24292f', '#6e7681')(props),
        color: 'white',
        fontSize: 'xs',
        fontWeight: 'normal',
        px: 2,
        py: 1,
        borderRadius: 'md',
        boxShadow: 'lg',
      }),
    },
    Divider: {
      baseStyle: (props: any) => ({
        borderColor: mode('borderLight.default', 'border.default')(props),
      }),
    },
    Heading: {
      baseStyle: {
        fontWeight: 'semibold',
        lineHeight: 1.25,
      },
      sizes: {
        xs: { fontSize: 'sm' },
        sm: { fontSize: 'md' },
        md: { fontSize: 'lg' },
        lg: { fontSize: 'xl' },
        xl: { fontSize: '2xl' },
      },
    },
    Text: {
      baseStyle: (props: any) => ({
        color: mode('fgLight.default', 'fg.default')(props),
      }),
    },
    FormLabel: {
      baseStyle: (props: any) => ({
        fontSize: 'sm',
        fontWeight: 'medium',
        color: mode('fgLight.default', 'fg.default')(props),
        mb: 1,
      }),
    },
    Tabs: {
      variants: {
        line: (props: any) => ({
          tablist: {
            borderBottom: '1px solid',
            borderColor: mode('borderLight.default', 'border.default')(props),
          },
          tab: {
            color: mode('fgLight.muted', 'fg.muted')(props),
            fontWeight: 'medium',
            fontSize: 'sm',
            px: 4,
            py: 2,
            mb: '-1px',
            borderBottom: '2px solid transparent',
            _selected: {
              color: mode('fgLight.default', 'fg.default')(props),
              borderColor: '#f78166',
            },
            _hover: {
              color: mode('fgLight.default', 'fg.default')(props),
            },
          },
        }),
        enclosed: (props: any) => ({
          tablist: {
            borderBottom: '1px solid',
            borderColor: mode('borderLight.default', 'border.default')(props),
          },
          tab: {
            color: mode('fgLight.muted', 'fg.muted')(props),
            bg: mode('canvasLight.subtle', 'canvas.default')(props),
            border: '1px solid',
            borderColor: 'transparent',
            borderBottom: 'none',
            borderRadius: 'md md 0 0',
            mb: '-1px',
            _selected: {
              color: mode('fgLight.default', 'fg.default')(props),
              bg: mode('canvasLight.default', 'canvas.subtle')(props),
              borderColor: mode('borderLight.default', 'border.default')(props),
              borderBottom: '1px solid',
              borderBottomColor: mode('canvasLight.default', 'canvas.subtle')(props),
            },
          },
        }),
      },
      defaultProps: {
        variant: 'line',
      },
    },
  },
});

export default theme;
