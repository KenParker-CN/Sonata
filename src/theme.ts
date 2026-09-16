import {createTheme, type PaletteMode} from '@mui/material/styles'

const lightPalette = {
  primary: {
    main: '#6d28d9',
    light: '#8b5cf6',
    dark: '#5b21b6',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#db3461',
    contrastText: '#ffffff',
  },
  background: {
    default: '#ffffff',
    paper: '#ffffff',
  },
}

const darkPalette = {
  primary: {
    main: '#a78bfa',
    light: '#c4b5fd',
    dark: '#8b5cf6',
    contrastText: '#211047',
  },
  secondary: {
    main: '#f38ba8',
    contrastText: '#3b1020',
  },
  background: {
    default: '#121216',
    paper: '#1a1a20',
  },
}

export function createAppTheme(mode: PaletteMode) {
  const dark = mode === 'dark'

  return createTheme({
    palette: {
      mode,
      ...(dark ? darkPalette : lightPalette),
    },
    typography: {
      fontFamily: '"Google Sans", ui-sans-serif, system-ui, sans-serif',
      h1: {fontWeight: 700, letterSpacing: '-0.035em'},
      h2: {fontWeight: 700, letterSpacing: '-0.03em'},
      h3: {fontWeight: 650, letterSpacing: '-0.025em'},
      button: {fontWeight: 600, textTransform: 'none'},
    },
    shape: {
      borderRadius: 10,
    },
    spacing: 8,
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            border: `1px solid ${dark ? 'rgba(255,255,255,0.10)' : 'rgba(30,24,50,0.10)'}`,
            boxShadow: 'none',
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
      },
    },
  })
}
