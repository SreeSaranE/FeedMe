import { useColorScheme, Platform } from 'react-native';

// Minimal system: neutral surfaces, one accent, hairline separators, no cards.
const palettes = {
  light: {
    background: '#FFFFFF',
    surface: '#F4F4F5', // inputs, chips
    grouped: '#F4F4F5', // background of grouped (card) pages such as Settings
    card: '#FFFFFF', // card surface on grouped pages
    text: '#111113',
    textSecondary: '#6B6B73',
    textTertiary: '#9A9AA2',
    separator: '#E4E4E7',
    accent: '#2563EB',
    onAccent: '#FFFFFF',
    danger: '#DC2626',
  },
  dark: {
    background: '#0B0C10', // obsidian
    surface: '#18181B',
    grouped: '#0B0C10',
    card: '#18181B',
    text: '#F4F4F5',
    textSecondary: '#A1A1AA',
    textTertiary: '#71717A',
    separator: '#27272A',
    accent: '#60A5FA',
    onAccent: '#0B0C10',
    danger: '#F87171',
  },
} as const;

export type Colors = { [K in keyof (typeof palettes)['light']]: string };

export function useTheme(): { colors: Colors; scheme: 'light' | 'dark' } {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { colors: palettes[scheme], scheme };
}

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

export const radius = { sm: 8, md: 12, full: 9999 } as const;

// Poppins custom font definitions with platform-safe fallbacks
export const fonts = {
  regular: Platform.select({
    web: "Poppins_400Regular, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    default: 'Poppins_400Regular',
  }),
  medium: Platform.select({
    web: "Poppins_500Medium, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    default: 'Poppins_500Medium',
  }),
  semiBold: Platform.select({
    web: "Poppins_600SemiBold, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    default: 'Poppins_600SemiBold',
  }),
  bold: Platform.select({
    web: "Poppins_700Bold, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    default: 'Poppins_700Bold',
  }),
};

export const type = {
  title: {
    fontFamily: fonts.bold,
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  headline: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  rowTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 15,
    fontWeight: '500' as const,
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: 13,
    fontWeight: '400' as const,
  },
};
