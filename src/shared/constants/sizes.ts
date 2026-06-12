// Design Tokens - Sizes
// Extraídos de la auditoría de módulos

export const sizes = {
  // Icon sizes
  icon: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
  },
  
  // Border radius
  borderRadius: {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
  },
  
  // Width
  w: {
    auto: 'w-auto',
    full: 'w-full',
    fit: 'w-fit',
    min: 'w-min',
    max: 'w-max',
    4: 'w-4',
    10: 'w-10',
    12: 'w-12',
  },
  
  // Height
  h: {
    auto: 'h-auto',
    full: 'h-full',
    fit: 'h-fit',
    min: 'h-min',
    max: 'h-max',
    4: 'h-4',
    10: 'h-10',
    12: 'h-12',
    screen: 'h-screen',
  },
  
  // Min width
  minWidth: {
    150: 'min-w-[150px]',
    200: 'min-w-[200px]',
    220: 'min-w-[220px]',
    260: 'min-w-[260px]',
  },
  
  // Max height
  maxHeight: {
    60: 'max-h-60',
    300: 'max-h-[300px]',
  },
  
  // Common size classes
  classes: {
    // Checkbox
    checkbox: 'w-4 h-4',
    
    // Icon button
    iconButton: 'w-10 h-10',
    
    // Small icon
    iconSmall: 'w-3.5 h-3.5',
    
    // Loading spinner
    spinner: 'h-12 w-12',
  },
} as const;

export type IconSize = keyof typeof sizes.icon;
export type BorderRadius = keyof typeof sizes.borderRadius;
