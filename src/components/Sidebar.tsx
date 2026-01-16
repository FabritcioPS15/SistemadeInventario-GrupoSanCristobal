import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Key, Users, FileText, ChevronDown, ChevronUp, Monitor, Smartphone, HardDrive, Printer, Scan, Laptop, Projector, Network, CreditCard, Droplets, Zap, MemoryStick, Database, HardDriveIcon, Wrench, AlertTriangle, Clock, CheckCircle, Send, MapPin, Building2, Menu, X, Shield, Car, ClipboardList, Calendar } from 'lucide-react';
import { GiCctvCamera } from 'react-icons/gi';
import { GrServerCluster } from 'react-icons/gr';
import { useAuth } from '../contexts/AuthContext';

type SidebarProps = {
  collapsed: boolean;
  onToggleCollapse: () => void;
};

export default function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const { user, hasPermission, logout } = useAuth();
  const location = useLocation();

  const toggleMenu = (menuId: string) => {
    const newExpanded = new Set(expandedMenus);
    if (newExpanded.has(menuId)) {
      newExpanded.delete(menuId);
    } else {
      newExpanded.add(menuId);
    }
    setExpandedMenus(newExpanded);
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
    { id: 'sutran', label: 'Visitas de Sutran', icon: Building2, path: '/sutran' },
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

  return (
    <>
      <style>
        {`
          .sidebar-scroll::-webkit-scrollbar {
            width: 8px;
          }
          .sidebar-scroll::-webkit-scrollbar-track {
            background: #1e293b;
          }
          .sidebar-scroll::-webkit-scrollbar-thumb {
            background: #475569;
            border-radius: 4px;
          }
          .sidebar-scroll::-webkit-scrollbar-thumb:hover {
            background: #64748b;
          }
        `}
      </style>
      <aside
        className={`${collapsed ? 'w-16' : 'w-80'} bg-slate-800 border-r border-slate-700 h-screen transition-all duration-300 ease-in-out fixed left-0 top-0 z-10 flex flex-col overflow-y-auto sidebar-scroll`}
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#475569 #1e293b'
        }}
      >
        <div className={`${collapsed ? 'p-3' : 'p-6'} border-b border-slate-700`}>
          <div className="flex items-center justify-center">
            {!collapsed ? (
              <>
                <div className="flex-1">
                  <h1 className="text-xl font-bold text-white">Sistema GSC</h1>
                  <p className="text-sm text-slate-300">Gestión y Control</p>
                </div>
                <button
                  onClick={onToggleCollapse}
                  className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </>
            ) : (
              <button
                onClick={onToggleCollapse}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Menu size={20} />
              </button>
            )}
          </div>
        </div>

        <nav className={`${collapsed ? 'p-2' : 'p-4 pl-4'} flex-1`}>
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = isPathActive(item.path || '');
            const isExpanded = expandedMenus.has(item.id);

            return (
              <div key={item.id} className="mb-1">
                <div className={`${collapsed ? 'flex justify-center' : 'flex items-center'} rounded-lg transition-colors ${isActive
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}>
                  <NavLink
                    to={item.path || '#'}
                    className={({ isActive: linkActive }) => `
                      ${collapsed ? 'p-3 w-full flex justify-center h-12' : 'flex items-center gap-3 px-4 py-3 flex-1 text-left h-12'}
                      ${linkActive || isActive ? 'bg-slate-700 text-white font-medium' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}
                    `}
                    title={collapsed ? item.label : undefined}
                    onClick={() => {
                      if (item.hasSubmenu && !collapsed) {
                        // Opcional: Expandir al hacer clic si colapsado
                      }
                    }}
                  >
                    <Icon size={24} />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                  {item.hasSubmenu && !collapsed && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        toggleMenu(item.id);
                      }}
                      className="px-2 py-3 hover:bg-slate-600 rounded-r-lg transition-colors h-12"
                    >
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  )}
                </div>

                {item.hasSubmenu && isExpanded && !collapsed && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.submenu?.map((subItem) => {
                      const SubIcon = subItem.icon;

                      return (
                        <NavLink
                          key={subItem.id}
                          to={subItem.path || '#'}
                          className={({ isActive: subActive }) => `
                            w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors
                            ${subActive ? 'bg-slate-600 text-white font-medium' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}
                          `}
                        >
                          <SubIcon size={18} />
                          <span>{subItem.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {user && (
          <div className={`${collapsed ? 'p-2' : 'p-4'} border-t border-slate-700`}>
            {!collapsed ? (
              <div className="space-y-3">
                <div className="bg-slate-700 rounded-lg p-3">
                  <div className="text-sm text-slate-300">
                    <div className="font-medium text-white">{user.full_name}</div>
                    <div className="text-xs">{user.email}</div>
                    <div className="text-xs mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${user.role === 'admin' ? 'bg-red-100 text-red-800' :
                        user.role === 'supervisor' ? 'bg-blue-100 text-blue-800' :
                          user.role === 'technician' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                        {user.role === 'admin' ? 'Administrador' :
                          user.role === 'supervisor' ? 'Supervisor' :
                            user.role === 'technician' ? 'Técnico' :
                              'Usuario'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="w-full bg-red-600 text-white py-2 px-3 rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  <X size={16} />
                  Cerrar Sesión
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {user.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                  title="Cerrar Sesión"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
