export const colors = {
  primary: '#006634',
  primaryDark: '#004d27',
  primaryLight: '#E6F4ED',
  primaryLighter: '#F2F9F5',
  secondary: '#FCE642',
  secondaryDark: '#E6D03B',
  secondaryLight: '#FEF5B5',
  accent: '#FFB800',
  background: '#FFFFFF',
  backgroundSecondary: '#F9FAFB',
  surface: '#F5F5F5',
  surfaceElevated: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  textLight: '#999999',
  textOnPrimary: '#FFFFFF',
  textOnSecondary: '#1A1A1A',
  border: '#E0E0E0',
  borderLight: '#F0F0F0',
  borderDark: '#CCCCCC',
  error: '#DC2626',
  errorLight: '#FEE2E2',
  errorDark: '#B91C1C',
  success: '#10B981',
  successLight: '#D1FAE5',
  successDark: '#059669',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningDark: '#D97706',
  info: '#3B82F6',
  infoLight: '#DBEAFE',
  infoDark: '#2563EB',
  white: '#FFFFFF',
  black: '#000000',
  dark: '#1A1A1A',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  overlayDark: 'rgba(0, 0, 0, 0.7)',
  shimmer: 'rgba(255, 255, 255, 0.3)',
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const animation = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
  easing: {
    easeInOut: 'ease-in-out',
    easeOut: 'ease-out',
    easeIn: 'ease-in',
    spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
};

export const layout = {
  maxWidth: 1200,
  containerPadding: 16,
  headerHeight: 60,
  tabBarHeight: 56,
  cardSpacing: 12,
};

export const theme = {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  shadows,
  animation,
  layout,
};
