// Design Tokens - Typography
// Extraídos de la auditoría de módulos

export const typography = {
  // Font sizes
  fontSize: {
    xs: '8px',
    sm: '9px',
    base: '10px',
    md: '11px',
    lg: '12px',
    xl: '13px',
    '2xl': '14px',
  },
  
  // Font weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    black: '900',
  },
  
  // Letter spacing
  letterSpacing: {
    tighter: 'tracking-tighter',
    tight: 'tracking-tight',
    normal: 'tracking-normal',
    wide: 'tracking-wide',
    wider: 'tracking-wider',
    widest: 'tracking-widest',
    custom: 'tracking-[0.1em]',
    customWide: 'tracking-[0.15em]',
  },
  
  // Text transforms
  textTransform: {
    none: 'normal-case',
    uppercase: 'uppercase',
    lowercase: 'lowercase',
    capitalize: 'capitalize',
  },
  
  // Common text classes
  classes: {
    // Badge text
    badge: 'text-[9px] font-black uppercase tracking-widest',
    
    // Label text
    label: 'text-[10px] font-black uppercase tracking-widest',
    
    // Search input
    search: 'text-[11px] font-black uppercase tracking-[0.1em]',
    
    // Table header
    tableHeader: 'text-[11px] font-black uppercase tracking-[0.15em]',
    
    // Table cell
    tableCell: 'text-[12px] font-bold uppercase',
    
    // Card title
    cardTitle: 'text-[13px] font-black uppercase',
    
    // Card subtitle
    cardSubtitle: 'text-[10px] font-semibold uppercase tracking-wider',
    
    // Count badge
    countBadge: 'text-[10px] font-black uppercase tracking-tight',
  },
} as const;

export type FontSize = keyof typeof typography.fontSize;
export type FontWeight = keyof typeof typography.fontWeight;
export type LetterSpacing = keyof typeof typography.letterSpacing;
