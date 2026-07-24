import { createContext, useContext, ReactNode } from 'react';

type LayoutContextValue = {
  sidebarCollapsed: boolean;
};

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function LayoutProvider({
  children,
  sidebarCollapsed,
}: {
  children: ReactNode;
  sidebarCollapsed: boolean;
}) {
  return (
    <LayoutContext.Provider value={{ sidebarCollapsed }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  return useContext(LayoutContext);
}

/** Clases del overlay: área de contenido bajo el header, desplazada según el sidebar en lg+ */
export function useLayoutInset(): string {
  const layout = useLayout();
  const base =
    'fixed top-0 bottom-0 left-0 right-0 z-[200] transition-all duration-300 ease-in-out';
  if (!layout) {
    return base;
  }
  return `${base} ${layout.sidebarCollapsed ? 'lg:left-20' : 'lg:left-72'}`;
}
