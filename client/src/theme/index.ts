import { createTheme, ThemeOptions } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Theme {
    custom: {
      dataGrid: {
        headerBackgroundColor: string;
        borderColor: string;
      };
      queryBuilder: {
        editorBorderColor: string;
        editorFocusColor: string;
        editorErrorColor: string;
      };
    };
  }

  interface ThemeOptions {
    custom?: {
      dataGrid?: {
        headerBackgroundColor?: string;
        borderColor?: string;
      };
      queryBuilder?: {
        editorBorderColor?: string;
        editorFocusColor?: string;
        editorErrorColor?: string;
      };
    };
  }
}

const baseThemeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#9c27b0',
      light: '#ba68c8',
      dark: '#7b1fa2',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    success: {
      main: '#2e7d32',
      light: '#4caf50',
      dark: '#1b5e20',
    },
    warning: {
      main: '#ed6c02',
      light: '#ff9800',
      dark: '#e65100',
    },
    error: {
      main: '#d32f2f',
      light: '#f44336',
      dark: '#c62828',
    },
    info: {
      main: '#0288d1',
      light: '#03a9f4',
      dark: '#01579b',
    },
    grey: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 300,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 400,
      lineHeight: 1.2,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 400,
      lineHeight: 1.2,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      lineHeight: 1.2,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      lineHeight: 1.2,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.2,
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.75,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.57,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.43,
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.75,
      textTransform: 'none' as const,
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 1.66,
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 2.66,
      textTransform: 'uppercase' as const,
    },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
};

const lightThemeOptions: ThemeOptions = {
  ...baseThemeOptions,
  palette: {
    ...baseThemeOptions.palette,
    mode: 'light',
  },
  custom: {
    dataGrid: {
      headerBackgroundColor: '#fafafa',
      borderColor: 'rgba(224, 224, 224, 1)',
    },
    queryBuilder: {
      editorBorderColor: 'rgba(0, 0, 0, 0.23)',
      editorFocusColor: '#1976d2',
      editorErrorColor: '#d32f2f',
    },
  },
};

const darkThemeOptions: ThemeOptions = {
  ...baseThemeOptions,
  palette: {
    ...baseThemeOptions.palette,
    mode: 'dark',
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: 'rgba(255, 255, 255, 0.87)',
      secondary: 'rgba(255, 255, 255, 0.6)',
    },
  },
  custom: {
    dataGrid: {
      headerBackgroundColor: '#2c2c2c',
      borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    queryBuilder: {
      editorBorderColor: 'rgba(255, 255, 255, 0.23)',
      editorFocusColor: '#90caf9',
      editorErrorColor: '#f44336',
    },
  },
};

// Create themes
export const lightTheme = createTheme({
  ...lightThemeOptions,
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
          '& .MuiDataGrid-cell': {
            borderBottom: `1px solid ${lightThemeOptions.custom?.dataGrid?.borderColor}`,
          },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: lightThemeOptions.custom?.dataGrid?.headerBackgroundColor,
            borderBottom: `1px solid ${lightThemeOptions.custom?.dataGrid?.borderColor}`,
          },
        },
      },
    },
  },
});

export const darkTheme = createTheme({
  ...darkThemeOptions,
  components: {
    ...lightTheme.components,
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
          '& .MuiDataGrid-cell': {
            borderBottom: `1px solid ${darkThemeOptions.custom?.dataGrid?.borderColor}`,
          },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: darkThemeOptions.custom?.dataGrid?.headerBackgroundColor,
            borderBottom: `1px solid ${darkThemeOptions.custom?.dataGrid?.borderColor}`,
          },
        },
      },
    },
  },
});

// Default theme (light)
export const theme = lightTheme;