import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const routeConfig: Record<string, string> = {
    'inventory': 'Inventario',
    'camara': 'Cámaras',
    'cameras': 'Cámaras',
    'maintenance': 'Mantenimiento',
    'sent': 'Enviados',
    'sutran': 'Sutran',
    'locations': 'Sedes',
    'mtc': 'MTC Accesos',
    'users': 'Usuarios',
    'audit': 'Auditoría',
    'integrity': 'Integridad',
    'diagnostic': 'Diagnóstico',
    'connection-test': 'Prueba de Conexión',
    'quick-diagnostic': 'Diagnóstico Rápido',
    'tickets': 'Mesa de Ayuda',
    'checklist': 'Checklist',
    'vacations': 'Vacaciones',
    'servers': 'Servidores',
    'flota-vehicular': 'Flota Vehicular',
    'spare-parts': 'Repuestos',
    'all': 'Ver Todo'
};

export default function Breadcrumbs() {
    const location = useLocation();
    const pathnames = location.pathname.split('/').filter((x) => x);

    if (location.pathname === '/' || location.pathname === '/login') return null;

    return (
        <nav className="flex px-8 py-3 bg-white/50 backdrop-blur-sm border-b border-slate-100 items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
            <Link
                to="/"
                className="flex items-center gap-1.5 text-slate-400 hover:text-blue-600 transition-colors shrink-0"
            >
                <Home size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Inicio</span>
            </Link>

            {pathnames.length > 0 && <ChevronRight size={12} className="text-slate-300 shrink-0" />}

            {pathnames.map((value, index) => {
                const last = index === pathnames.length - 1;
                const to = `/${pathnames.slice(0, index + 1).join('/')}`;
                const label = routeConfig[value.toLowerCase()] || value.replace(/-/g, ' ');

                return (
                    <div key={to} className="flex items-center gap-2 shrink-0">
                        {last ? (
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                                {label}
                            </span>
                        ) : (
                            <Link
                                to={to}
                                className="text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest transition-colors"
                            >
                                {label}
                            </Link>
                        )}
                        {!last && <ChevronRight size={12} className="text-slate-300" />}
                    </div>
                );
            })}
        </nav>
    );
}
