// Design Tokens - Spacing
// Extraídos de la auditoría de módulos

export const spacing = {
  // Padding
  p: {
    0: 'p-0',
    1: 'p-1',
    2: 'p-2',
    3: 'p-3',
    4: 'p-4',
    6: 'p-6',
    8: 'p-8',
  },
  
  px: {
    0: 'px-0',
    1: 'px-1',
    2: 'px-2',
    3: 'px-3',
    4: 'px-4',
    6: 'px-6',
    8: 'px-8',
    12: 'px-12',
  },
  
  py: {
    0: 'py-0',
    1: 'py-1',
    2: 'py-2',
    3: 'py-3',
    4: 'py-4',
  },
  
  // Margin
  m: {
    0: 'm-0',
    1: 'm-1',
    2: 'm-2',
    3: 'm-3',
    4: 'm-4',
  },
  
  mx: {
    auto: 'mx-auto',
  },
  
  my: {
    0: 'my-0',
    1: 'my-1',
    2: 'my-2',
    4: 'my-4',
  },
  
  // Gap
  gap: {
    0: 'gap-0',
    1: 'gap-1',
    2: 'gap-2',
    3: 'gap-3',
    4: 'gap-4',
    6: 'gap-6',
  },
  
  // Space between children
  space: {
    y: {
      2: 'space-y-2',
      4: 'space-y-4',
      6: 'space-y-6',
      8: 'space-y-8',
    },
    x: {
      2: 'space-x-2',
      4: 'space-x-4',
    },
  },
  
  // Common spacing classes
  classes: {
    // Action bar
    actionBar: 'p-4 flex flex-col md:flex-row items-stretch md:items-center gap-4',
    
    // Container
    container: 'p-6 space-y-6 flex-1 overflow-y-auto',
    containerResponsive: 'w-full px-4 md:px-8 xl:px-12 py-8 space-y-4',
    
    // Input
    input: 'px-4 py-3',
    
    // Button
    button: 'px-4 py-3',
    
    // Card
    card: 'p-4',
    
    // Badge
    badge: 'px-2 py-1',
  },
} as const;

export type Padding = keyof typeof spacing.p;
export type Gap = keyof typeof spacing.gap;
