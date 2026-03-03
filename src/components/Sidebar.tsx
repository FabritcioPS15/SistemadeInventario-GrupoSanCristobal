import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Key, Users, FileText, ChevronRight, Zap,
  Wrench, Send, MapPin, Building2,
  Car, ClipboardList, LogOut, Ticket,
  Settings, Menu
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
  const [menuTop, setMenuTop] = useState<number>(0);
  const [adjustedTop, setAdjustedTop] = useState(0);
  const subMenuRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = (itemId: string, e: React.MouseEvent) => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuTop(rect.top);
    setHoveredItem(itemId);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredItem(null);
    }, 200);
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden" onClick={onCloseMobile} />
      )}

      <aside
        className={`
          ${collapsed ? 'w-20' : 'w-72'} 
          bg-[#001529] text-[#a6adb4] h-screen transition-all duration-300 ease-in-out fixed left-0 top-0 z-[70] flex flex-col shadow-2xl overflow-hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Toggle & Logo Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5 shrink-0 overflow-hidden">
          <div className={`flex items-center gap-3 transition-opacity duration-300 ${collapsed ? 'w-8' : 'w-auto'}`}>
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
              <Settings size={18} className={!collapsed ? "animate-spin-slow" : ""} />
            </div>
            {!collapsed && (
              <span className="font-black text-white text-[13px] tracking-widest uppercase truncate animate-in fade-in duration-500">Sistema GSC</span>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-white"
          >
            {collapsed ? <ChevronRight size={18} /> : <Menu size={18} />}
          </button>
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
              <div key={section.title} className="mb-6 last:mb-0">
                {!collapsed && (
                  <h3 className="px-6 mb-3 text-[10px] font-black uppercase tracking-[2.5px] text-white/20">
                    {section.title}
                  </h3>
                )}
                <div className="space-y-1.5 px-3">
                  {filteredItems.map(item => {
                    const Icon = item.icon;
                    const isActive = isPathActive(item.path);
                    const isHovered = hoveredItem === item.id;

                    return (
                      <div
                        key={item.id}
                        className="relative group"
                        onMouseEnter={(e) => handleMouseEnter(item.id, e)}
                        onMouseLeave={handleMouseLeave}
                      >
                        <NavLink
                          to={item.path}
                          onClick={() => window.innerWidth < 1024 && onCloseMobile?.()}
                          className={`
                            flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                            ${isActive || isHovered ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-[#a6adb4] hover:text-white hover:bg-white/5'}
                            ${collapsed ? 'justify-center px-0' : ''}
                          `}
                        >
                          <Icon size={18} className={(isActive || isHovered) ? 'text-white' : 'group-hover:text-white'} />
                          {!collapsed && (
                            <>
                              <span className="text-[13px] font-bold tracking-tight flex-1 truncate uppercase">{item.label}</span>
                              {item.hasSubmenu && <ChevronRight size={14} className="opacity-40" />}
                            </>
                          )}
                        </NavLink>
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xs font-black ring-1 ring-white/20">GSC</div>
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

      {/* FLYOUT SUBMENU / TOOLTIP */}
      {hoveredItem && (
        <div
          ref={subMenuRef}
          className={`
            fixed z-[100] transition-all duration-200
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
