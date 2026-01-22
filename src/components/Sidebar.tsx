import { useState, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Key, Users, FileText, ChevronRight, Monitor, Smartphone, HardDrive, Printer, Scan, Laptop, Projector, Network, CreditCard, Droplets, Zap, MemoryStick, Database, HardDriveIcon, Wrench, AlertTriangle, Clock, CheckCircle, Send, MapPin, Building2, Menu, X, Shield, Car, ClipboardList, Calendar, LogOut, Info, Ticket } from 'lucide-react';
import { GiCctvCamera } from 'react-icons/gi';
import { GrServerCluster } from 'react-icons/gr';
import { useAuth } from '../contexts/AuthContext';

type SidebarProps = {
  collapsed: boolean;
  onToggleCollapse: () => void;
};

export default function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [menuTop, setMenuTop] = useState<number>(0);
  const { user, hasPermission, logout } = useAuth();
  const location = useLocation();
  const closeTimeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = (itemId: string, e: React.MouseEvent) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }

    const item = menuItems.find((i) => i.id === itemId);

    // Calculate position
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuTop(rect.top);
    setHoveredItem(itemId);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredItem(null);
    }, 300);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    {
      id: 'inventory',
      label: 'Inventario',
      icon: Package,
      path: '/inventory',
      hasSubmenu: true,
      submenu: [
        { id: 'assets', label: 'Activos', icon: HardDrive, path: '/inventory' },
        { id: 'asset-types', label: 'Tipos de Activos', icon: MemoryStick, path: '/inventory/types' },
        { id: 'spare-parts', label: 'Repuestos', icon: Package, path: '/spare-parts' },
        { id: 'inventory-pc', label: 'PCs', icon: Monitor, path: '/inventory/pc' },
        { id: 'inventory-celular', label: 'Celulares', icon: Smartphone, path: '/inventory/celular' },
        { id: 'inventory-dvr', label: 'DVRs', icon: HardDrive, path: '/inventory/dvr' },
        { id: 'inventory-impresora', label: 'Impresoras', icon: Printer, path: '/inventory/impresora' },
        { id: 'inventory-escaner', label: 'Escáneres', icon: Scan, path: '/inventory/escaner' },
        { id: 'inventory-monitor', label: 'Monitores', icon: Monitor, path: '/inventory/monitor' },
        { id: 'inventory-laptop', label: 'Laptops', icon: Laptop, path: '/inventory/laptop' },
        { id: 'inventory-proyector', label: 'Proyectores', icon: Projector, path: '/inventory/proyector' },
        { id: 'inventory-switch', label: 'Switch', icon: Network, path: '/inventory/switch' },
        { id: 'inventory-chip', label: 'Chips de Celular', icon: CreditCard, path: '/inventory/chip' },
        { id: 'inventory-tinte', label: 'Tintes', icon: Droplets, path: '/inventory/tinte' },
        { id: 'inventory-fuente', label: 'Fuentes de Poder', icon: Zap, path: '/inventory/fuente' },
        { id: 'inventory-ram', label: 'Memorias RAM', icon: MemoryStick, path: '/inventory/ram' },
        { id: 'inventory-disco', label: 'Discos de Almacenamiento', icon: Database, path: '/inventory/disco' },
        { id: 'inventory-disco-extraido', label: 'Discos Extraídos', icon: HardDriveIcon, path: '/inventory/disco-extraido' },
        { id: 'inventory-otros', label: 'Otros', icon: Package, path: '/inventory/otros' },
        { id: 'inventory-maquinaria', label: 'Maquinarias', icon: HardDrive, path: '/inventory/maquinaria' },
      ]
    },
    {
      id: 'cameras',
      label: 'Vista Cámaras',
      icon: GiCctvCamera,
      path: '/cameras',
      hasSubmenu: true,
      submenu: [
        { id: 'cameras-revision', label: 'Cámaras de Revisión', icon: GiCctvCamera, path: '/cameras/revision' },
        { id: 'cameras-escuela', label: 'Cámaras de Escuela', icon: GiCctvCamera, path: '/cameras/escuela' },
        { id: 'cameras-policlinico', label: 'Cámaras de Policlínico', icon: GiCctvCamera, path: '/cameras/policlinico' },
        { id: 'cameras-circuito', label: 'Cámaras de Circuito', icon: GiCctvCamera, path: '/cameras/circuito' },
      ]
    },
    {
      id: 'maintenance',
      label: 'Mantenimiento',
      icon: Wrench,
      path: '/maintenance',
      hasSubmenu: true,
      submenu: [
        { id: 'maintenance-pending', label: 'Pendientes', icon: Clock, path: '/maintenance/pending' },
        { id: 'maintenance-in-progress', label: 'En Progreso', icon: AlertTriangle, path: '/maintenance/in-progress' },
        { id: 'maintenance-completed', label: 'Completados', icon: CheckCircle, path: '/maintenance/completed' },
        { id: 'maintenance-preventive', label: 'Preventivo', icon: Wrench, path: '/maintenance/preventive' },
        { id: 'maintenance-corrective', label: 'Correctivo', icon: AlertTriangle, path: '/maintenance/corrective' },
      ]
    },
    {
      id: 'sent',
      label: 'Enviados',
      icon: Send,
      path: '/sent',
      hasSubmenu: true,
      submenu: [
        { id: 'sent-lima', label: 'Lima', icon: Send, path: '/sent/lima' },
        { id: 'sent-provincias', label: 'Provincias', icon: Send, path: '/sent/provincias' },
      ]
    },
    { id: 'sutran', label: 'Sutran', icon: Building2, path: '/sutran' },
    { id: 'tickets', label: 'Mesa de Ayuda', icon: Ticket, path: '/tickets' },
    {
      id: 'checklist',
      label: 'Checklist',
      icon: ClipboardList,
      path: '/checklist',
      hasSubmenu: true,
      submenu: [
        { id: 'checklist-escon', label: 'ESCON', icon: ClipboardList, path: '/checklist/escon' },
        { id: 'checklist-ecsal', label: 'ECSAL', icon: ClipboardList, path: '/checklist/ecsal' },
        { id: 'checklist-citv', label: 'CITV', icon: ClipboardList, path: '/checklist/citv' },
      ]
    },
    { id: 'locations', label: 'Sedes', icon: MapPin, path: '/locations' },
    { id: 'mtc', label: 'MTC Accesos', icon: Key, path: '/mtc' },
    { id: 'servers', label: 'Servidores', icon: GrServerCluster, path: '/servers' },
    { id: 'flota-vehicular', label: 'Flota Vehicular', icon: Car, path: '/flota-vehicular' },
    { id: 'users', label: 'Usuarios', icon: Users, path: '/users' },
    { id: 'vacations', label: 'Vacaciones', icon: Calendar, path: '/vacations' },
    { id: 'audit', label: 'Auditoría', icon: FileText, path: '/audit' },
    { id: 'integrity', label: 'Integridad del Sistema', icon: Shield, path: '/integrity' },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (!hasPermission(item.id)) return false;

    if (item.hasSubmenu && item.submenu) {
      const filteredSubmenu = item.submenu.filter(subItem => hasPermission(subItem.id));
      if (filteredSubmenu.length === 0) return false;
      item.submenu = filteredSubmenu;
    }

    return true;
  });

  const isPathActive = (path: string, exact = false) => {
    if (exact) return location.pathname === path;
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(path);
  };

  const activeSubmenuItems = hoveredItem ? filteredMenuItems.find(i => i.id === hoveredItem)?.submenu : null;

  return (
    <>
      <style>
        {`
          .sidebar-scroll::-webkit-scrollbar {
            width: 4px;
          }
          .sidebar-scroll::-webkit-scrollbar-track {
            background: #f4f7fa;
          }
          .sidebar-scroll::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
          }
          .sidebar-scroll::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}
      </style>
      <aside
        className={`${collapsed ? 'w-16' : 'w-72'} bg-[#f4f7fa] border-r border-[#e2e8f0] h-screen transition-all duration-300 ease-in-out fixed left-0 top-0 z-30 flex flex-col overflow-y-auto sidebar-scroll`}
      >
        {/* Logo Section */}
        <div className={`h-14 bg-[#002855] text-white flex items-center ${collapsed ? 'justify-center px-0' : 'justify-between px-4'} sticky top-0 z-40`}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="bg-white p-1 rounded-md">
                <LayoutDashboard size={18} className="text-[#002855]" />
              </div>
              <span className="font-black tracking-tighter text-lg uppercase">Sistema G.S.C.</span>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
          >
            {collapsed ? <Menu size={18} /> : <X size={20} />}
          </button>
        </div>

        {/* User Profile Section (Executive Look) */}
        {!collapsed && user && (
          <div className="p-6 pb-2 text-center border-b border-[#e2e8f0] mb-2">
            <div className="relative mx-auto w-20 h-20 mb-4 group">
              <div className="w-full h-full rounded-2xl bg-white shadow-md border border-[#e2e8f0] flex items-center justify-center overflow-hidden">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#002855] to-[#004e92] flex items-center justify-center text-white text-2xl font-black">
                  {user.full_name?.charAt(0)}
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-2 border-[#f4f7fa] rounded-full shadow-sm" />
            </div>
            <h3 className="text-[#002855] font-black text-sm uppercase tracking-tight">{user.full_name}</h3>
            <p className="text-[#64748b] text-[10px] font-bold uppercase tracking-[0.15em] mt-0.5">Grupo San Cristobal</p>
          </div>
        )}

        <nav className={`${collapsed ? 'p-2' : 'p-3'} flex-1 space-y-0.5`}>
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = isPathActive(item.path || '');
            const isHovered = hoveredItem === item.id;

            return (
              <div key={item.id}
                onMouseEnter={(e) => handleMouseEnter(item.id, e)}
                onMouseLeave={handleMouseLeave}
              >
                <div className={`group relative flex items-center rounded-md transition-all duration-200 ${isActive || isHovered
                  ? 'bg-white shadow-sm ring-1 ring-[#e2e8f0]'
                  : 'hover:bg-[#e2e8f2]'
                  }`}>

                  {(isActive || isHovered) && (
                    <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#002855] rounded-r-full" />
                  )}

                  <NavLink
                    to={item.path || '#'}
                    className={`
                      flex items-center gap-3 px-3.5 py-2.5 flex-1 text-left h-11
                      ${isActive || isHovered ? 'text-[#002855] font-black' : 'text-[#4e5d78] font-bold'}
                    `}
                  >
                    <Icon size={20} strokeWidth={isActive || isHovered ? 2.5 : 2} className={isActive || isHovered ? 'text-[#002855]' : 'text-[#64748b] group-hover:text-[#4e5d78]'} />
                    {!collapsed && <span className="text-[13px] uppercase tracking-tight truncate">{item.label}</span>}

                    {item.hasSubmenu && !collapsed && (
                      <div className="ml-auto">
                        <ChevronRight size={14} className={`text-[#64748b] transition-transform duration-200 ${isHovered ? 'rotate-0' : ''}`} />
                      </div>
                    )}
                  </NavLink>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 bg-white/50 border-t border-[#e2e8f0]">
          <div className="space-y-1">
            <button className="w-full flex items-center gap-3 px-3.5 py-2 text-[#64748b] hover:text-[#002855] hover:bg-[#e2e8f2] rounded-md transition-all text-sm font-bold uppercase tracking-tight">
              <Info size={18} />
              {!collapsed && <span>Ayuda</span>}
            </button>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3.5 py-2 text-rose-600 hover:bg-rose-50 rounded-md transition-all text-sm font-bold uppercase tracking-tight"
            >
              <LogOut size={18} />
              {!collapsed && <span>Cerrar Sesión</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Flyout Submenu (for items WITH submenu) */}
      {hoveredItem && activeSubmenuItems && activeSubmenuItems.length > 0 && (
        <div
          className="fixed z-50 bg-white border border-[#e2e8f0] shadow-xl rounded-md py-1 min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
          style={{
            top: menuTop,
            left: collapsed ? '4.5rem' : '18.5rem',
          }}
          onMouseEnter={() => {
            if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
          }}
          onMouseLeave={handleMouseLeave}
        >
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/50">
            <h4 className="text-xs font-black text-[#002855] uppercase tracking-wider">
              {filteredMenuItems.find(i => i.id === hoveredItem)?.label}
            </h4>
          </div>
          <div className="py-1 max-h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar">
            {activeSubmenuItems.map((subItem) => {
              const SubIcon = subItem.icon;
              const isSubActive = isPathActive(subItem.path || '', true);

              return (
                <NavLink
                  key={subItem.id}
                  to={subItem.path || '#'}
                  className={`
                        flex items-center gap-3 px-4 py-2.5 text-[12px] font-bold uppercase tracking-tight transition-colors
                        ${isSubActive
                      ? 'text-[#002855] bg-blue-50 border-l-2 border-[#002855]'
                      : 'text-[#64748b] hover:text-[#002855] hover:bg-gray-50'
                    }
                        `}
                >
                  <SubIcon size={16} className={isSubActive ? 'text-[#002855]' : 'text-[#94a3b8]'} />
                  <span className="truncate">{subItem.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom Tooltip (for items WITHOUT submenu when collapsed) */}
      {collapsed && hoveredItem && (!activeSubmenuItems || activeSubmenuItems.length === 0) && (
        <div
          className="fixed z-50 bg-white border border-[#e2e8f0] shadow-xl rounded-md py-2 px-4 min-w-[120px] animate-in fade-in zoom-in-95 duration-100 pointer-events-none"
          style={{
            top: menuTop + 6, // Slight offset to align with link center
            left: '4.5rem',
          }}
        >
          <span className="text-xs font-black text-[#002855] uppercase tracking-wider">
            {filteredMenuItems.find(i => i.id === hoveredItem)?.label}
          </span>
        </div>
      )}
    </>
  );
}
