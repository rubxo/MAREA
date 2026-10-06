export const colors = {
  ink: '#14293D',
  paper: '#F4F7FA',
  coral: '#CE3653',
  seaGlass: '#73BFAE',
  deepBlue: '#2448A8',
  danger: '#C5362F',
  white: '#FFFFFF',
  mutedInk: '#626865',
  hairline: '#DDE5EC',
  surface: '#FFFFFF',
  success: '#287A61',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  small: 8,
  medium: 12,
  card: 18,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 32, lineHeight: 36, fontWeight: '800' },
  title: { fontSize: 20, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  label: { fontSize: 13, lineHeight: 16, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
} as const;

export const theme = { colors, spacing, radii, typography } as const;
