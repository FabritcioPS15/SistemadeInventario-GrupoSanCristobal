// Design Tokens - Colors
// Extraídos de la auditoría de módulos

export const colors = {
  // Primary brand color
  primary: '#002855',
  
  // Background colors
  background: '#f8fafc',
  backgroundAlt: '#f8f9fc',
  white: '#ffffff',
  
  // Slate scale
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  
  // Status colors
  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
  },
  
  rose: {
    50: '#fff1f2',
    100: '#ffe4e6',
    200: '#fecdd3',
    500: '#f43f5e',
    600: '#e11d48',
    700: '#be123c',
  },
  
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
  },
  
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
  },
  
  orange: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    500: '#f97316',
    600: '#ea580c',
    700: '#c2410c',
  },
  
  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },
  
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },
} as const;

// Status color mappings
export const statusColors = {
  active: 'emerald',
  inactive: 'slate',
  maintenance: 'amber',
  extracted: 'rose',
  pending: 'orange',
  in_progress: 'blue',
  resolved: 'emerald',
  closed: 'slate',
  open: 'orange',
} as const;

export type StatusColor = keyof typeof statusColors;
