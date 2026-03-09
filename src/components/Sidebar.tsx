import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Key, Users, FileText, ChevronRight, Zap,
  Wrench, Send, MapPin, Building2,
  Car, ClipboardList, LogOut, Ticket,
  Settings, ChevronLeft
} from 'lucide-react';
import { GiCctvCamera } from 'react-icons/gi';
import { GrServerCluster } from 'react-icons/gr';
import { useAuth } from '../contexts/AuthContext';

type SidebarProps = {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
};

interface SubmenuItem {
  id: string;
  label: string;
  path: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  path: string;
  hasSubmenu?: boolean;
  submenu?: SubmenuItem[];
}

interface Section {
  title: string;
  items: MenuItem[];
}

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: SidebarProps) {
  const { hasPermission, logout } = useAuth();
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [menuTop, setMenuTop] = useState<number>(0);
  const [adjustedTop, setAdjustedTop] = useState(0);
  const subMenuRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = (itemId: string, e: React.MouseEvent) => {
    // Solo en desktop, no en móvil
    if (window.innerWidth >= 1024) {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setMenuTop(rect.top);
      setHoveredItem(itemId);
    }
  };

  const handleMouseLeave = () => {
    // Solo en desktop, no en móvil
    if (window.innerWidth >= 1024) {
      closeTimeoutRef.current = setTimeout(() => {
        setHoveredItem(null);
      }, 200);
    }
  };

  const handleItemClick = (itemId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // En móvil: toggle del submenu
    if (window.innerWidth < 1024) {
      setExpandedItems(prev => 
        prev.includes(itemId) 
          ? prev.filter(id => id !== itemId)
          : [...prev, itemId]
      );
    }
  };

  useEffect(() => {
    if (hoveredItem && subMenuRef.current) {
      const rect = subMenuRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      let top = menuTop;
      if (top + rect.height > viewportHeight) {
        top = viewportHeight - rect.height - 10;
      }
      if (top < 10) top = 10;
      setAdjustedTop(top);
    }
  }, [hoveredItem, menuTop]);

  useEffect(() => {
    if (!mobileOpen) {
      setHoveredItem(null);
    }
  }, [mobileOpen]);

  const sections: Section[] = [
    {
      title: 'Principal',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
        {
          id: 'tickets',
          label: 'Mesa de Ayuda',
          icon: Ticket,
          path: '/tickets',
          hasSubmenu: true,
          submenu: [
            { id: 'tickets-dashboard', label: 'Dashboard General', path: '/tickets/dashboard' },
            { id: 'tickets-mine', label: 'Mis tickets', path: '/tickets/mine' },
            { id: 'tickets-reports', label: 'Reportes', path: '/tickets/reports' },
            { id: 'tickets-history', label: 'Historial de Tickets', path: '/tickets/history' },
          ]
        },
        {
          id: 'checklist',
          label: 'Checklist',
          icon: ClipboardList,
          path: '/checklist',
          hasSubmenu: true,
          submenu: [
            { id: 'checklist-escon', label: 'ESCON', path: '/checklist/escon' },
            { id: 'checklist-ecsal', label: 'ECSAL', path: '/checklist/ecsal' },
            { id: 'checklist-citv', label: 'CITV', path: '/checklist/citv' },
            { id: 'checklist-interactive', label: 'Checklist Interactivo', path: '/checklist-interactive' },
          ]
        },
      ]
    },
    {
      title: 'Operativo',
      items: [
        {
          id: 'inventory',
          label: 'Inventario',
          icon: Package,
          path: '/inventory',
          hasSubmenu: true,
          submenu: [
            { id: 'spare-parts', label: 'Repuestos', path: '/spare-parts' },
            { id: 'inventory-pc', label: 'PCs', path: '/inventory/pc' },
            { id: 'inventory-celular', label: 'Celulares', path: '/inventory/celular' },
            { id: 'inventory-dvr', label: 'DVRs', path: '/inventory/dvr' },
            { id: 'inventory-impresora', label: 'Impresoras', path: '/inventory/impresora' },
            { id: 'inventory-escaner', label: 'Escáneres', path: '/inventory/escaner' },
            { id: 'inventory-monitor', label: 'Monitores', path: '/inventory/monitor' },
            { id: 'inventory-laptop', label: 'Laptops', path: '/inventory/laptop' },
            { id: 'inventory-proyector', label: 'Proyectores', path: '/inventory/proyector' },
            { id: 'inventory-switch', label: 'Switch', path: '/inventory/switch' },
            { id: 'inventory-chip', label: 'Chips de Celular', path: '/inventory/chip' },
            { id: 'inventory-tinte', label: 'Tintes', path: '/inventory/tinte' },
            { id: 'inventory-fuente', label: 'Fuentes de Poder', path: '/inventory/fuente' },
            { id: 'inventory-ram', label: 'Memorias RAM', path: '/inventory/ram' },
            { id: 'inventory-disco', label: 'Discos', path: '/inventory/disco' },
            { id: 'inventory-disco-extraido', label: 'Discos Extraídos', path: '/inventory/disco-extraido' },
            { id: 'inventory-maquinaria', label: 'Maquinarias', path: '/inventory/maquinaria' },
          ]
        },
        {
          id: 'cameras',
          label: 'Cámaras',
          icon: GiCctvCamera,
          path: '/cameras',
          hasSubmenu: true,
          submenu: [
            { id: 'cameras-revision', label: 'Revisión', path: '/cameras/revision' },
            { id: 'cameras-escuela', label: 'Escuela', path: '/cameras/escuela' },
            { id: 'cameras-policlinico', label: 'Policlínico', path: '/cameras/policlinico' },
            { id: 'cameras-circuito', label: 'Circuito', path: '/cameras/circuito' },
          ]
        },
        {
          id: 'maintenance',
          label: 'Mantenimiento',
          icon: Wrench,
          path: '/maintenance',
          hasSubmenu: true,
          submenu: [
            { id: 'maintenance-pending', label: 'Pendientes', path: '/maintenance/pending' },
            { id: 'maintenance-in-progress', label: 'En Progreso', path: '/maintenance/in-progress' },
            { id: 'maintenance-completed', label: 'Completados', path: '/maintenance/completed' },
          ]
        },
        { id: 'flota-vehicular', label: 'Flota Vehicular', icon: Car, path: '/flota-vehicular' },
      ]
    },
    {
      title: 'Administrativo',
      items: [
        { id: 'users', label: 'Usuarios', icon: Users, path: '/users' },
        { id: 'locations', label: 'Sedes', icon: MapPin, path: '/locations' },
        { id: 'sutran', label: 'Sutran', icon: Building2, path: '/sutran' },
        { id: 'mtc', label: 'MTC Accesos', icon: Key, path: '/mtc' },
        { id: 'servers', label: 'Servidores', icon: GrServerCluster, path: '/servers' },
        { id: 'painpoint', label: 'Painpoints', icon: Zap, path: '/painpoint' },
        {
          id: 'sent',
          label: 'Enviados',
          icon: Send,
          path: '/sent',
          hasSubmenu: true,
          submenu: [
            { id: 'sent-lima', label: 'Lima', path: '/sent/lima' },
            { id: 'sent-provincias', label: 'Provincias', path: '/sent/provincias' },
          ]
        },
      ]
    },
    {
      title: 'Sistema',
      items: [
        { id: 'audit', label: 'Auditoría', icon: FileText, path: '/audit' },
      ]
    }
  ];

  const isPathActive = (path: string) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(path);
  };

  const activeItem = sections.flatMap(s => s.items).find(i => i.id === hoveredItem);
  const activeSubmenuItems = activeItem?.submenu;

  return (
    <>
      <style>
        {`
          .sidebar-scroll::-webkit-scrollbar { width: 4px; }
          .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
          .sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }
          @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          .animate-spin-slow { animation: spin-slow 12s linear infinite; }
        `}
      </style>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] lg:hidden" onClick={onCloseMobile} />
      )}

      <aside
        className={`
          ${collapsed ? 'w-20' : 'w-72'} 
          bg-[#001529] text-[#a6adb4] h-screen transition-all duration-300 ease-in-out fixed left-0 top-0 z-[110] flex flex-col shadow-2xl overflow-hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Toggle & Logo Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5 shrink-0 overflow-hidden">
          {!collapsed && (
            <div className="flex items-center gap-3 transition-opacity duration-300">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
                <Settings size={18} className="animate-spin-slow" />
              </div>
              <span className="font-black text-white text-[15px] tracking-widest uppercase truncate animate-in fade-in duration-500">Sistema GSC</span>
            </div>
          )}

          {/* Botón de Colapsar Mejorado - Desktop Only */}
          <div className={`relative hidden lg:block ${collapsed ? 'mx-auto' : ''}`}>
            <button
              onClick={onToggleCollapse}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-300 text-white/70 hover:text-white group border border-white/20 hover:border-white/30 shadow-lg"
            >
              <div className="relative">
                {/* Flecha principal - más grande y visible */}
                {collapsed ? (
                  <ChevronRight size={18} className="transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white" />
                ) : (
                  <ChevronLeft size={18} className="transition-transform duration-300 group-hover:-translate-x-1 group-hover:text-white" />
                )}
              </div>
            </button>
            
            {/* Tooltip mejorado */}
            <div className={`absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 pointer-events-none transition-opacity duration-300 shadow-xl whitespace-nowrap ${collapsed ? 'group-hover:opacity-100' : ''}`}>
              <div className="font-semibold">{collapsed ? 'Expandir menú' : 'Colapsar menú'}</div>
              <div className="text-gray-300 text-[10px] mt-0.5">Click para {collapsed ? 'mostrar' : 'ocultar'}</div>
              {/* Flechita del tooltip */}
              <div className="absolute left-full top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-900 rotate-45" />
            </div>
          </div>
        </div>

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto sidebar-scroll py-6 flex flex-col">
          {sections.map((section) => {
            const filteredItems = section.items.filter(item => {
              if (!hasPermission(item.id)) return false;
              if (item.submenu) return item.submenu.some(sub => hasPermission(sub.id));
              return true;
            });

            if (filteredItems.length === 0) return null;

            return (
              <div key={section.title} className="mb-4 last:mb-0">
                {!collapsed && (
                  <h3 className="px-6 mb-2 text-[10px] font-black uppercase tracking-[2.5px] text-white/40">
                    {section.title}
                  </h3>
                )}
                {collapsed && section.title !== 'Principal' && (
                  <div className="px-3 mb-2">
                    <div className="h-px bg-white/10"></div>
                  </div>
                )}
                <div className="space-y-1.5 px-3">
                  {filteredItems.map(item => {
                    const Icon = item.icon;
                    const isActive = isPathActive(item.path);
                    const isHovered = hoveredItem === item.id;
                    const isExpanded = expandedItems.includes(item.id);
                    const isMobile = window.innerWidth < 1024;

                    return (
                      <div key={item.id}>
                        <div
                          className="relative group"
                          onMouseEnter={(e) => handleMouseEnter(item.id, e)}
                          onMouseLeave={handleMouseLeave}
                        >
                          <NavLink
                            to={item.path}
                            onClick={() => {
                              window.innerWidth < 1024 && onCloseMobile?.();
                              setHoveredItem(null);
                            }}
                            className={`
                              flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                              ${isActive || isHovered ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-[#a6adb4] hover:text-white hover:bg-white/5'}
                              ${collapsed ? 'justify-center px-3' : ''}
                            `}
                          >
                            <Icon size={collapsed ? 20 : 18} className={(isActive || isHovered) ? 'text-white' : 'group-hover:text-white'} />
                            {!collapsed && (
                              <>
                                <span className="text-[13px] font-bold tracking-tight flex-1 truncate uppercase">{item.label}</span>
                                {item.hasSubmenu && (
                                  <button
                                    onClick={(e) => handleItemClick(item.id, e)}
                                    className={`p-1 rounded transition-all duration-200 ${
                                      isMobile ? 'hover:bg-white/10' : 'opacity-40'
                                    }`}
                                  >
                                    <ChevronRight 
                                      size={14} 
                                      className={`transition-transform duration-200 ${
                                        isMobile && isExpanded ? 'rotate-90' : ''
                                      }`}
                                    />
                                  </button>
                                )}
                              </>
                            )}
                          </NavLink>
                        </div>

                        {/* Submenú inline en móvil */}
                        {isMobile && item.hasSubmenu && isExpanded && (
                          <div className="ml-4 mt-1 space-y-1 pb-2">
                            {item.submenu?.filter((sub: any) => hasPermission(sub.id)).map((sub: any) => {
                              const isSubActive = location.pathname === sub.path;
                              return (
                                <NavLink
                                  key={sub.id}
                                  to={sub.path}
                                  onClick={() => {
                                    onCloseMobile?.();
                                    setExpandedItems(prev => prev.filter(id => id !== item.id));
                                  }}
                                  className={`
                                    flex items-center gap-3 px-3 py-2 text-[12px] font-bold uppercase tracking-tight rounded-xl transition-all
                                    ${isSubActive 
                                      ? 'text-white bg-blue-500 shadow-lg shadow-blue-500/20' 
                                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }
                                  `}
                                >
                                  {sub.label}
                                </NavLink>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/30 border-t border-white/5 flex flex-col gap-4">
          {!collapsed ? (
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
              <div className="flex-1 min-w-0">
                <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-black text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all uppercase tracking-[2px]">
                  <LogOut size={14} /> Salir
                </button>
              </div>
            </div>
          ) : (
            <button onClick={logout} className="mx-auto p-2 text-white/30 hover:text-rose-400 transition-colors">
              <LogOut size={20} />
            </button>
          )}
        </div>
      </aside>

      {/* FLYOUT SUBMENU / TOOLTIP - Desktop Only */}
      {hoveredItem && window.innerWidth >= 1024 && (
        <div
          ref={subMenuRef}
          className={`
            fixed z-[120] transition-all duration-200
            ${activeSubmenuItems && activeSubmenuItems.length > 0
              ? 'bg-[#1e293b] border border-blue-500/20 shadow-2xl rounded-2xl py-3 min-w-[240px]'
              : 'bg-blue-600 text-white px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest shadow-xl border border-white/10'}
          `}
          style={{
            top: adjustedTop || menuTop,
            left: collapsed ? '5.5rem' : '18.5rem',
            opacity: hoveredItem ? 1 : 0,
            transform: `translateX(${hoveredItem ? '0' : '-10px'})`
          }}
          onMouseEnter={() => { if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current); }}
          onMouseLeave={handleMouseLeave}
        >
          {activeSubmenuItems && activeSubmenuItems.length > 0 ? (
            <>
              <div className="px-5 py-2 border-b border-white/10 mb-2">
                <h4 className="text-[11px] font-black text-blue-400 uppercase tracking-[2.5px] flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                  {activeItem?.label}
                </h4>
              </div>
              <div className="max-h-[calc(100vh-60px)] overflow-y-auto sidebar-scroll px-2 space-y-0.5">
                {activeSubmenuItems.filter((sub: any) => hasPermission(sub.id)).map((sub: any) => {
                  const isSubActive = location.pathname === sub.path;
                  return (
                    <NavLink
                      key={sub.id}
                      to={sub.path}
                      onClick={() => {
                        window.innerWidth < 1024 && onCloseMobile?.();
                        setHoveredItem(null);
                      }}
                      className={`
                        flex items-center gap-3 px-4 py-2.5 text-[12px] font-bold uppercase tracking-tight rounded-xl transition-all
                        ${isSubActive ? 'text-white bg-blue-500 shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}
                      `}
                    >
                      {sub.label}
                    </NavLink>
                  );
                })}
              </div>
            </>
          ) : (
            <span>{activeItem?.label}</span>
          )}
        </div>
      )}
    </>
  );
}
