export const colors = {
  // Core Palette
  cream: '#FFFCF9',
  creamDark: '#FDF8F3',
  warmWhite: '#FFFFFF',
  blush: '#FFF0F0',
  pinkSoft: '#F5D0D0',
  pinkAccent: '#D4737A',
  pinkDeep: '#B85C6A',
  wine: '#8B3A4C',
  gold: '#C9A55C',
  goldLight: '#E8D5A8',
  goldPale: '#F9F3E3',
  charcoal: '#2D2A27',

  // Text
  textPrimary: '#3D3A37',
  textSecondary: '#6B6560',
  textMuted: '#9B9590',

  // Functional Mappings
  primary: '#D4737A',       // Pink Accent
  primaryLight: '#F5D0D0',  // Pink Soft
  primaryDark: '#B85C6A',   // Pink Deep
  secondary: '#2D2A27',     // Charcoal
  accent: '#8B3A4C',        // Wine
  accentLight: '#FFF0F0',   // Blush

  // UI Elements
  background: '#FFFCF9',    // Cream
  card: '#FFFFFF',          // Warm White
  border: '#EDE8E3',        // Divider

  // Legacy/Dark theme compatibility (mapping to new darker tones)
  dark: '#2D2A27',          // Charcoal
  darkLight: '#3D3A37',     // Text Primary
  light: '#FFFCF9',         // Cream

  textOnDark: '#FFFCF9',    // Cream
  textOnLight: '#2D2A27',   // Charcoal

  shadow: 'rgba(45, 42, 39, 0.15)',
  glass: 'rgba(255, 255, 255, 0.8)',
  glassLight: 'rgba(255, 255, 255, 0.5)',
  glassDark: 'rgba(45, 42, 39, 0.9)',

  // Aliases for backward compatibility
  deepNight: '#2D2A27',     // Charcoal
  cyberPink: '#D4737A',     // Pink Accent
  cyberGold: '#C9A55C',     // Gold

  gradients: {
    primary: ['#D4737A', '#8B3A4C'], // Pink Accent -> Wine
    gold: ['#C9A55C', '#E8D5A8'],    // Gold -> Gold Light
    dark: ['#2D2A27', '#8B3A4C'],    // Charcoal -> Wine
    vibrant: ['#D4737A', '#C9A55C'], // Pink Accent -> Gold
  }
} as const;


