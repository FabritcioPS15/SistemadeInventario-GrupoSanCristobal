import { useEffect, useState } from 'react';
import { Car, ChevronRight, Building2, Stethoscope, GraduationCap, Users, FileText, TrendingUp, Clock, ExternalLink, Edit, LayoutGrid, List, Search, X } from 'lucide-react';
import { supabase, Location } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LocationForm from '../components/forms/LocationForm';

export default function Checklist({ type }: { type?: string }) {
    const navigate = useNavigate();
    const { canEdit } = useAuth();
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showForm, setShowForm] = useState(false);
    const [editingLocation, setEditingLocation] = useState<Location | undefined>();

    const driveLinks: Record<string, string> = {
        escon: 'https://drive.google.com/drive/folders/1L1QjeqULRD6g-ii0bRbAr1h4Z5IJqQdQ',
        ecsal: 'https://drive.google.com/drive/folders/1cotQVjOIzK6BQkbe_fFXa1nQveCXglZ8?usp=drive_link',
        citv: 'https://drive.google.com/drive/folders/11Q8PLtXgaL6T42LkcAb1y3MZjyIKOpUi?usp=drive_link'
    };

    const fetchLocations = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('locations')
                .select('*')
                .order('name');

            if (error) {
                throw error;
            }
            
            setLocations(data as Location[]);
        } catch (err) {
            console.error('Error fetching locations:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLocations();
    }, []);

    const handleEditLinks = (location: Location) => {
        setEditingLocation(location);
        setShowForm(true);
    };

    const handleSaveLinks = async () => {
        setShowForm(false);
        setEditingLocation(undefined);
        await fetchLocations();
    };

    const getFilteredLocations = () => {
        if (!type) return locations;
        
        return locations.filter(loc => {
            if (type === 'escon') return loc.type === 'escuela_conductores';
            if (type === 'ecsal') return loc.type === 'policlinico';
            if (type === 'citv') return loc.type === 'revision';
            return false;
        }).filter(loc => loc.name.toLowerCase().includes(searchTerm.toLowerCase()));
    };

    const renderGeneralView = () => (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {/* ESCON Card */}
                <button
                    type="button"
                    onClick={() => navigate('/checklist/escon')}
                    className="group bg-white rounded-2xl border border-gray-200 shadow-lg p-8 text-left hover:border-blue-400 hover:shadow-2xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                                <GraduationCap size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors">ESCON</h3>
                                <p className="text-sm text-gray-500 font-medium tracking-tight">Escuelas de Conductores</p>
                            </div>
                        </div>
                        <ChevronRight className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" size={24} />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                            <div className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-widest">
                                <Building2 size={16} className="text-blue-400" />
                                <span>{locations.filter(l => l.type === 'escuela_conductores').length} sedes activas</span>
                            </div>
                            <span className="text-xs font-black text-blue-600 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Ir al panel</span>
                        </div>
                    </div>
                </button>

                {/* ECSAL Card */}
                <button
                    type="button"
                    onClick={() => navigate('/checklist/ecsal')}
                    className="group bg-white rounded-2xl border border-gray-200 shadow-lg p-8 text-left hover:border-emerald-400 hover:shadow-2xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                                <Stethoscope size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">ECSAL</h3>
                                <p className="text-sm text-gray-500 font-medium tracking-tight">Salud y Policlínicos</p>
                            </div>
                        </div>
                        <ChevronRight className="text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" size={24} />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                            <div className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-widest">
                                <Building2 size={16} className="text-emerald-400" />
                                <span>{locations.filter(l => l.type === 'policlinico').length} sedes activas</span>
                            </div>
                            <span className="text-xs font-black text-emerald-600 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Ir al panel</span>
                        </div>
                    </div>
                </button>

                {/* CITV Card */}
                <button
                    type="button"
                    onClick={() => navigate('/checklist/citv')}
                    className="group bg-white rounded-2xl border border-gray-200 shadow-lg p-8 text-left hover:border-orange-400 hover:shadow-2xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all duration-300">
                                <Car size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-orange-700 transition-colors">CITV</h3>
                                <p className="text-sm text-gray-500 font-medium tracking-tight">Inspección Técnica Vehicular</p>
                            </div>
                        </div>
                        <ChevronRight className="text-gray-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" size={24} />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                            <div className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-widest">
                                <Building2 size={16} className="text-orange-400" />
                                <span>{locations.filter(l => l.type === 'revision').length} sedes activas</span>
                            </div>
                            <span className="text-xs font-black text-orange-600 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Ir al panel</span>
                        </div>
                    </div>
                </button>
            </div>

            {/* Footer Info */}
            <div className="mt-16 text-center">
                <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl p-8 border border-slate-200">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Clock size={20} className="text-slate-600" />
                        <h3 className="text-lg font-bold text-slate-900">Actualización en Tiempo Real</h3>
                    </div>
                    <p className="text-slate-600 text-sm max-w-2xl mx-auto">
                        Todos los checklists se actualizan automáticamente en tiempo real. 
                        Los datos se sincronizan instantáneamente entre todas las sedes y el panel central.
                    </p>
                </div>
            </div>
        </div>
    );

    const renderSpecificView = (unitType: string, unitName: string, unitColor: string, icon: any) => {
        const filteredLocations = getFilteredLocations();

        return (
            <div>
                {/* Barra de búsqueda */}
                <div className="bg-white shadow-sm rounded-xl border border-gray-200 mb-6">
                    <div className="px-6 py-4">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder={`Buscar por sede ${unitName.toLowerCase()}...`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Vista Grid */}
                {viewMode === 'grid' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredLocations.map((location) => (
                            <div key={location.id} className="group relative bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-2xl hover:border-blue-300 transition-all duration-500 text-left overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/30 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-all duration-700" />

                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="bg-gray-50 w-14 h-14 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white shadow-sm transition-all duration-300">
                                            {icon}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <h3 className="text-lg font-black text-gray-900 group-hover:text-blue-700 transition-colors uppercase tracking-tight line-clamp-1">{location.name}</h3>
                                                {canEdit() && (
                                                    <button
                                                        onClick={() => handleEditLinks(location)}
                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                        title="Editar links"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Sede Activa</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <a
                                            href={location.checklist_url || '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`w-full inline-flex items-center justify-between px-4 py-3 text-[11px] font-bold text-white rounded-xl transition-all shadow-md group/btn ${!location.checklist_url 
                                                ? 'bg-gray-300 cursor-not-allowed opacity-50' 
                                                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
                                                }`}
                                        >
                                            <span className="flex items-center gap-2">
                                                <FileText size={16} />
                                                {location.checklist_url ? 'INICIAR CHECKLIST' : 'NO DISPONIBLE'}
                                            </span>
                                            {location.checklist_url && <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />}
                                        </a>
                                        <a
                                            href={location.history_url || '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`w-full inline-flex items-center justify-between px-4 py-3 text-[11px] font-bold rounded-xl transition-all shadow-sm group/btn ${!location.history_url 
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50' 
                                                : 'text-blue-600 bg-white border border-blue-100 hover:bg-blue-50 hover:border-blue-300 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'
                                                }`}
                                        >
                                            <span className="flex items-center gap-2">
                                                <ExternalLink size={16} />
                                                {location.history_url ? 'HISTORIAL' : 'NO DISPONIBLE'}
                                            </span>
                                            {location.history_url && <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />}
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Vista Lista */}
                {viewMode === 'list' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Sede / Planta</th>
                                        <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Estado</th>
                                        <th className="px-6 py-4 text-center text-xs font-black text-gray-400 uppercase tracking-widest">Checklist</th>
                                        <th className="px-6 py-4 text-center text-xs font-black text-gray-400 uppercase tracking-widest">Historial</th>
                                        {canEdit() && <th className="px-6 py-4 text-center text-xs font-black text-gray-400 uppercase tracking-widest">Acciones</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredLocations.map((location) => (
                                        <tr key={location.id} className="hover:bg-blue-50/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${unitType === 'escuela_conductores' ? 'bg-blue-50 text-blue-600' :
                                                        unitType === 'policlinico' ? 'bg-emerald-50 text-emerald-600' :
                                                            'bg-orange-50 text-orange-600'
                                                        }`}>
                                                        {icon}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900">{location.name}</p>
                                                        <p className="text-[10px] text-gray-400 uppercase tracking-tighter">{location.address || 'Sin dirección registrada'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                    <span className="text-xs font-bold text-gray-600">Activo</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <a
                                                    href={location.checklist_url || '#'}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${location.checklist_url
                                                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none'
                                                        }`}
                                                >
                                                    <FileText size={14} />
                                                    Iniciar
                                                </a>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <a
                                                    href={location.history_url || '#'}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${location.history_url
                                                        ? 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-600 shadow-sm'
                                                        : 'bg-gray-50 text-gray-300 cursor-not-allowed pointer-events-none'
                                                        }`}
                                                >
                                                    <ExternalLink size={14} />
                                                    Ver
                                                </a>
                                            </td>
                                            {canEdit() && (
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => handleEditLinks(location)}
                                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {filteredLocations.length === 0 && (
                    <div className="text-center py-12">
                        <div className="bg-gray-50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                            <Search size={32} className="text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-700 mb-2">No se encontraron sedes</h3>
                        <p className="text-gray-500">No hay sedes {unitName.toLowerCase()} que coincidan con tu búsqueda.</p>
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="w-full px-4 py-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 pb-6 border-b border-gray-200">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-1 uppercase">
                        Sistema de Checklists{type ? ` - ${type.toUpperCase()}` : ''}
                    </h2>
                    <p className="text-slate-500 text-sm font-medium">
                        {type ? `Gestión de checklists ${type.toUpperCase()}` : 'Gestión operativa de checklists por unidad de negocio'}
                    </p>
                </div>
                
                {type && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                        {driveLinks[type] && (
                            <a
                                href={driveLinks[type]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-all font-bold text-[10px] uppercase tracking-widest shadow-sm"
                            >
                                <ExternalLink size={14} />
                                Carpeta Drive {type.toUpperCase()}
                            </a>
                        )}
                        
                        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`flex-1 sm:flex-none p-2 rounded-md transition-all flex items-center justify-center ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                title="Vista Cuadrícula"
                            >
                                <LayoutGrid size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`flex-1 sm:flex-none p-2 rounded-md transition-all flex items-center justify-center ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                title="Vista Listado"
                            >
                                <List size={16} />
                            </button>
                        </div>
                        
                        <button
                            onClick={() => navigate('/checklist')}
                            className="px-6 py-3 sm:py-2 bg-slate-800 text-white rounded-md hover:bg-slate-900 transition-all font-bold text-[10px] uppercase tracking-widest shadow-sm"
                        >
                            Volver al menú
                        </button>
                    </div>
                )}
            </div>

            <div className="max-w-7xl mx-auto">
                {!type && renderGeneralView()}
                {type === 'escon' && renderSpecificView('escuela_conductores', 'ESCON', 'bg-blue-500', <GraduationCap size={16} />)}
                {type === 'ecsal' && renderSpecificView('policlinico', 'ECSAL', 'bg-emerald-500', <Stethoscope size={16} />)}
                {type === 'citv' && renderSpecificView('revision', 'CITV', 'bg-orange-500', <Car size={16} />)}
            </div>

            {showForm && (
                <LocationForm
                    editLocation={editingLocation}
                    onClose={() => { setShowForm(false); setEditingLocation(undefined); }}
                    onSave={handleSaveLinks}
                />
            )}
        </div>
    );
}
