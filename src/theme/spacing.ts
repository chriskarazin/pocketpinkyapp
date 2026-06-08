import { moderateScale } from './responsive';

/**
 * Spacing & radii from design brief (8-12px buttons, 16px cards)
 */
export const spacing = {
  xs: moderateScale(4),
  sm: moderateScale(8),
  md: moderateScale(12),
  lg: moderateScale(16),
  xl: moderateScale(24),
  xxl: moderateScale(32),
} as const;

export const radii = {
  button: moderateScale(12),
  card: moderateScale(16),
  input: moderateScale(10),
} as const;

export const theme = {
  spacing,
  radii,
} as const;
