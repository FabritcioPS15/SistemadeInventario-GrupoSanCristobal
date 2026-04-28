import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Key, Users, FileText, ChevronRight, Zap,
  Wrench, Send, MapPin, Building2,
  Car, ClipboardList, LogOut, Ticket,
  ChevronLeft
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
  hasSubmenu?: boolean;
  submenu?: SubmenuItem[];
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
    if (window.innerWidth >= 1024) {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setMenuTop(rect.top);
      setHoveredItem(itemId);
    }
  };

  const handleMouseLeave = () => {
    if (window.innerWidth >= 1024) {
      closeTimeoutRef.current = setTimeout(() => {
        setHoveredItem(null);
      }, 200);
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
            { id: 'inventory-all', label: 'Ver Todo', path: '/inventory/all' },
            {
              id: 'inventory-computo',
              label: 'Cómputo y TI',
              path: '/inventory/computo-ti',
              hasSubmenu: true,
              submenu: [
                { id: 'sub-cpu', label: 'Computadoras (CPU)', path: '/inventory/computo-ti/cpu' },
                { id: 'sub-monitor', label: 'Monitores', path: '/inventory/computo-ti/monitores' },
                { id: 'sub-laptop', label: 'Laptops', path: '/inventory/computo-ti/laptops' },
                { id: 'sub-perifericos', label: 'Teclados y Mouse', path: '/inventory/computo-ti/perifericos' },
                { id: 'sub-impresora', label: 'Impresoras', path: '/inventory/computo-ti/impresoras' },
                { id: 'sub-redes', label: 'Redes y DVR', path: '/inventory/computo-ti/redes' },
              ]
            },
            {
              id: 'inventory-biometricos',
              label: 'Biométricos',
              path: '/inventory/biometricos-control',
              hasSubmenu: true,
              submenu: [
                { id: 'sub-bio-lector', label: 'Biométricos', path: '/inventory/biometricos-control/lector' },
                { id: 'sub-bio-huella', label: 'Control de Huella', path: '/inventory/biometricos-control/huella' },
              ]
            },
            {
              id: 'inventory-medicos',
              label: 'Equipos Médicos',
              path: '/inventory/equipos-medicos',
              hasSubmenu: true,
              submenu: [
                { id: 'sub-med-diag', label: 'Diagnóstico', path: '/inventory/equipos-medicos/diagnostico' },
                { id: 'sub-med-clinico', label: 'Clínicos', path: '/inventory/equipos-medicos/clinicos' },
                { id: 'sub-med-lab', label: 'Laboratorio', path: '/inventory/equipos-medicos/laboratorio' },
                { id: 'sub-med-eval', label: 'Evaluación Técnica', path: '/inventory/equipos-medicos/evaluacion' },
              ]
            },
            {
              id: 'inventory-mobiliario',
              label: 'Mobiliario',
              path: '/inventory/mobiliario',
              hasSubmenu: true,
              submenu: [
                { id: 'sub-mob-oficina', label: 'Oficina', path: '/inventory/mobiliario/oficina' },
                { id: 'sub-mob-infra', label: 'Infraestructura', path: '/inventory/mobiliario/infraestructura' },
              ]
            },
            {
              id: 'inventory-seguridad',
              label: 'Seguridad',
              path: '/inventory/seguridad',
              hasSubmenu: true,
              submenu: [
                { id: 'sub-seg-extintor', label: 'Extintores', path: '/inventory/seguridad/extintor' },
                { id: 'sub-seg-alarmas', label: 'Alarmas y Sensores', path: '/inventory/seguridad/alarmas' },
              ]
            },
            {
              id: 'inventory-utiles',
              label: 'Útiles de Oficina',
              path: '/inventory/utiles-oficina',
              hasSubmenu: true,
              submenu: [
                { id: 'sub-uti-papel', label: 'Papelería', path: '/inventory/utiles-oficina/papel' },
                { id: 'sub-uti-escritorio', label: 'Escritorio', path: '/inventory/utiles-oficina/escritorio' },
              ]
            },
            { id: 'spare-parts', label: 'Repuestos', path: '/spare-parts' },
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
            { id: 'cameras-disks', label: 'Discos Extraídos', path: '/cameras/disks' },
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
        {
          id: 'sutran',
          label: 'Sutran',
          icon: Building2,
          path: '/sutran',
          hasSubmenu: true,
          submenu: [
            { id: 'sutran-visits', label: 'Visitas SUTRAN', path: '/sutran' },
            { id: 'sutran-future', label: 'Futuras Visitas', path: '/sutran/future-visits' },
          ]
        },
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
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5 shrink-0 overflow-hidden">
          {!collapsed && (
            <div className="flex items-center justify-center transition-opacity duration-300 w-full">
              <img src="/Enblanco.png" alt="Logo" className="h-12 object-contain" />
            </div>
          )}

          <div className={`relative hidden lg:block ${collapsed ? 'mx-auto' : ''}`}>
            <button
              onClick={onToggleCollapse}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-300 text-white/70 hover:text-white group border border-white/20 hover:border-white/30 shadow-lg"
            >
              <div className="relative">
                {collapsed ? (
                  <ChevronRight size={18} className="transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white" />
                ) : (
                  <ChevronLeft size={18} className="transition-transform duration-300 group-hover:-translate-x-1 group-hover:text-white" />
                )}
              </div>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto sidebar-scroll py-6 flex flex-col">
          {sections.map((section, index) => {
            const filteredItems = section.items.filter(item => {
              if (!hasPermission(item.id)) return false;
              if (item.submenu) return item.submenu.some(sub => hasPermission(sub.id));
              return true;
            });

            if (filteredItems.length === 0) return null;

            return (
              <div key={section.title} className="mb-2 last:mb-0">
                {!collapsed && index > 0 && (
                  <div className="my-2 mx-4 border-t border-white/10" />
                )}
                <div className="space-y-1 px-3">
                  {filteredItems.map(item => {
                    const Icon = item.icon;
                    const isActive = isPathActive(item.path);
                    const isHovered = hoveredItem === item.id;

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
                              if (window.innerWidth < 1024) onCloseMobile?.();
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
                                  <ChevronRight
                                    size={14}
                                    className="transition-transform duration-200 opacity-50 group-hover:opacity-100"
                                  />
                                )}
                              </>
                            )}
                          </NavLink>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-black/30 border-t border-white/5 shrink-0 flex flex-col gap-4">
          {!collapsed ? (
            <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-black text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all uppercase tracking-[2px]">
              <LogOut size={14} /> Salir
            </button>
          ) : (
            <button onClick={logout} className="mx-auto p-2 text-white/30 hover:text-rose-400 transition-colors">
              <LogOut size={20} />
            </button>
          )}
          {!collapsed && (
            <div className="mt-1 text-center opacity-40 hover:opacity-100 transition-opacity duration-300">
              <p className="text-[8px] font-bold text-white/20 uppercase tracking-[1px] cursor-default">
                SISTEMA GSC • <span className="text-blue-500/30">FABRPS15</span>
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* FLYOUT SUBMENU / TOOLTIP - Desktop Only */}
      {hoveredItem && window.innerWidth >= 1024 && (
        <div
          ref={subMenuRef}
          className={`fixed z-[120] bg-[#1e293b] border border-blue-500/20 shadow-2xl rounded-2xl transition-all duration-300 animate-in fade-in slide-in-from-left-2 duration-200 ${activeSubmenuItems && activeSubmenuItems.length > 0 ? 'py-2 min-w-[200px]' : 'py-1.5 px-3'
            }`}
          style={{
            top: adjustedTop || menuTop,
            left: collapsed ? '5.5rem' : '18.5rem',
            opacity: 1,
            transform: 'translateX(0) translateY(-50%)'
          }}
          onMouseEnter={() => { if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current); }}
          onMouseLeave={handleMouseLeave}
        >
          {activeSubmenuItems && activeSubmenuItems.length > 0 ? (
            <>
              <div className="px-4 py-1.5 border-b border-white/10 mb-1">
                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[2px] flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
                  {activeItem?.label}
                </h4>
              </div>
              <div className="max-h-[calc(100vh-60px)] overflow-y-auto sidebar-scroll px-1 space-y-0.5">
                {activeSubmenuItems?.filter((sub) => hasPermission(sub.id)).map((sub) => (
                  <div key={sub.id}>
                    <NavLink
                      to={sub.path}
                      className={({ isActive }) => `
                        flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-tight rounded-lg transition-all
                        ${isActive ? 'text-white bg-blue-500 shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}
                      `}
                    >
                      {sub.label}
                    </NavLink>
                    {sub.hasSubmenu && (
                      <div className="ml-4 mt-1 border-l border-white/10 pl-2 space-y-0.5">
                        {sub.submenu?.map(deepSub => (
                          <NavLink
                            key={deepSub.id}
                            to={deepSub.path}
                            className={({ isActive }) => `
                          block px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all
                          ${isActive ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}
                        `}
                          >
                            {deepSub.label}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center">
              <span className="text-[11px] font-black tracking-widest uppercase text-white">{activeItem?.label}</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
