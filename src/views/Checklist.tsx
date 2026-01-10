import { useEffect, useState } from 'react';
import { Car, ClipboardCheck, ChevronRight, Building2, Stethoscope, GraduationCap, Search, ExternalLink, X, Edit, LayoutGrid, List } from 'lucide-react';
import { supabase, Location } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import LocationForm from '../components/forms/LocationForm';


import { useNavigate } from 'react-router-dom';

export default function Checklist({ type }: { type?: string }) {
    const navigate = useNavigate();
    const { canEdit } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [locations, setLocations] = useState<Location[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingLocation, setEditingLocation] = useState<Location | undefined>();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const getSubtitle = (t?: string) => {
        if (!t) return '';
        return t.toUpperCase();
    };

    const driveLinks: Record<string, string> = {
        escon: 'https://drive.google.com/drive/folders/1L1QjeqULRD6g-ii0bRbAr1h4Z5IJqQdQ',
        ecsal: 'https://drive.google.com/drive/folders/1cotQVjOIzK6BQkbe_fFXa1nQveCXglZ8?usp=drive_link',
        citv: 'https://drive.google.com/drive/folders/11Q8PLtXgaL6T42LkcAb1y3MZjyIKOpUi?usp=drive_link'
    };

    const fetchLocations = async () => {
        const { data, error } = await supabase
            .from('locations')
            .select('*')
            .order('name');

        if (!error && data) {
            setLocations(data as Location[]);
        } else {
            console.error('Error fetching locations for checklists:', error);
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
        console.log('handleSaveLinks called after successful save');
        setShowForm(false);
        setEditingLocation(undefined);
        await fetchLocations();
    };

    const mockChecklists = [
        {
            id: 1,
            type: 'ESCON',
            site: 'ESCON SAN CRISTOBAL',
            status: 'Completado',
            date: '2024-12-01',
            responsible: 'Juan Pérez',
        },
        {
            id: 2,
            type: 'ECSAL',
            site: 'ECSAL LIMA NORTE',
            status: 'Pendiente',
            date: '2024-12-03',
            responsible: 'María López',
        },
        {
            id: 3,
            type: 'CITV',
            site: 'RTP ANDAHUAYLAS',
            status: 'En progreso',
            date: '2024-12-05',
            responsible: 'Carlos García',
        },
        {
            id: 4,
            type: 'CITV',
            site: 'RTV ICA',
            status: 'Completado',
            date: '2024-12-06',
            responsible: 'Ana Torres',
        },
    ];

    const filteredChecklists = mockChecklists.filter((item) => {
        const matchesSearch =
            item.site.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = !filterType || item.type === filterType;
        const matchesStatus = !filterStatus || item.status === filterStatus;

        return matchesSearch && matchesType && matchesStatus;
    });

    const totalChecklists = mockChecklists.length;
    const esconCount = mockChecklists.filter((item) => item.type === 'ESCON').length;
    const ecsalCount = mockChecklists.filter((item) => item.type === 'ECSAL').length;
    const citvCount = mockChecklists.filter((item) => item.type === 'CITV').length;

    const renderGeneralView = () => (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Top Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* ESCON Card */}
                <button
                    type="button"
                    onClick={() => navigate('/checklist/escon')}
                    className="group bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-left hover:border-blue-400 hover:shadow-lg transition-all duration-300"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                                <GraduationCap size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-700 transition-colors">ESCON</h3>
                                <p className="text-xs text-gray-500 font-medium tracking-tight">Escuelas de Conductores</p>
                            </div>
                        </div>
                        <ChevronRight className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" size={20} />
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                            <Building2 size={14} className="text-blue-400" />
                            <span>3 sedes activas</span>
                        </div>
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Ver registro diario</span>
                    </div>
                </button>

                {/* ECSAL Card */}
                <button
                    type="button"
                    onClick={() => navigate('/checklist/ecsal')}
                    className="group bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-left hover:border-emerald-400 hover:shadow-lg transition-all duration-300"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                                <Stethoscope size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">ECSAL</h3>
                                <p className="text-xs text-gray-500 font-medium tracking-tight">Salud y Policlínicos</p>
                            </div>
                        </div>
                        <ChevronRight className="text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" size={20} />
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                            <Building2 size={14} className="text-emerald-400" />
                            <span>3 sedes activas</span>
                        </div>
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Ver registro diario</span>
                    </div>
                </button>

                {/* CITV Card */}
                <button
                    type="button"
                    onClick={() => navigate('/checklist/citv')}
                    className="group bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-left hover:border-orange-400 hover:shadow-lg transition-all duration-300"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all duration-300">
                                <Car size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-700 transition-colors">CITV</h3>
                                <p className="text-xs text-gray-500 font-medium tracking-tight">Inspección Técnica Vehicular</p>
                            </div>
                        </div>
                        <ChevronRight className="text-gray-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" size={20} />
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                            <Building2 size={14} className="text-orange-400" />
                            <span>7 sedes activas</span>
                        </div>
                        <span className="text-[10px] font-black text-orange-600 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Ver registro diario</span>
                    </div>
                </button>
            </div>

            {/* Statistics Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col justify-between">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Total Checklists</div>
                    <div className="flex items-end justify-between">
                        <div className="text-2xl font-bold text-gray-900">{totalChecklists}</div>
                        <ClipboardCheck size={20} className="text-gray-400" />
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col justify-between">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">ESCON</div>
                    <div className="flex items-end justify-between">
                        <div className="text-2xl font-bold text-blue-600">{esconCount}</div>
                        <GraduationCap size={20} className="text-blue-500/20" />
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col justify-between">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">ECSAL</div>
                    <div className="flex items-end justify-between">
                        <div className="text-2xl font-bold text-emerald-600">{ecsalCount}</div>
                        <Stethoscope size={20} className="text-emerald-500/20" />
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col justify-between">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">CITV</div>
                    <div className="flex items-end justify-between">
                        <div className="text-2xl font-bold text-orange-500">{citvCount}</div>
                        <Car size={20} className="text-orange-500/20" />
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white shadow-sm rounded-xl border border-gray-200">
                <div className="px-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                placeholder="Buscar por sede..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div>
                            <select
                                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                            >
                                <option value="">Todos los Tipos</option>
                                <option value="ESCON">ESCON</option>
                                <option value="ECSAL">ECSAL</option>
                                <option value="CITV">CITV</option>
                            </select>
                        </div>

                        <div>
                            <select
                                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="">Todos los Estados</option>
                                <option value="Pendiente">Pendiente</option>
                                <option value="En progreso">En progreso</option>
                                <option value="Completado">Completado</option>
                            </select>
                        </div>
                    </div>

                    {(searchTerm || filterType || filterStatus) && (
                        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                            <div className="flex flex-wrap gap-2">
                                {searchTerm && (
                                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100">"{searchTerm}"</span>
                                )}
                                {filterType && (
                                    <span className="px-3 py-1 bg-gray-50 text-gray-700 rounded-lg text-xs font-bold border border-gray-100">{filterType}</span>
                                )}
                                {filterStatus && (
                                    <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-100">{filterStatus}</span>
                                )}
                            </div>
                            <button
                                onClick={() => { setSearchTerm(''); setFilterType(''); setFilterStatus(''); }}
                                className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-gray-400 hover:text-rose-600 transition-colors"
                            >
                                <X size={14} /> Limpiar filtros
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Checklists Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Tipo</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Sede</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Estado</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Responsable</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Fecha</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredChecklists.length > 0 ? (
                                filteredChecklists.map((item) => (
                                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">{item.type}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">{item.site}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${item.status === 'Completado' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                item.status === 'En progreso' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                    'bg-amber-50 text-amber-700 border-amber-100'
                                                }`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.responsible}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-400">{item.date}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400 font-medium italic">
                                        No se encontraron registros que coincidan con los filtros.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderListView = (filteredLocations: Location[]) => (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                                        <div className={`p-2 rounded-lg ${location.type === 'escuela_conductores' ? 'bg-blue-50 text-blue-600' :
                                            location.type === 'policlinico' ? 'bg-emerald-50 text-emerald-600' :
                                                'bg-orange-50 text-orange-600'
                                            }`}>
                                            {location.type === 'escuela_conductores' ? <GraduationCap size={16} /> :
                                                location.type === 'policlinico' ? <Stethoscope size={16} /> :
                                                    <Car size={16} />}
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
                                        <ClipboardCheck size={14} />
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
    );

    const renderContent = () => {
        if (!type) {
            return (
                <div className="mb-12">
                    {renderGeneralView()}
                </div>
            );
        }

        const filteredLocations = locations.filter(loc => {
            if (type === 'escon') return loc.type === 'escuela_conductores';
            if (type === 'ecsal') return loc.type === 'policlinico';
            if (type === 'citv') return loc.type === 'revision';
            return false;
        }).filter(loc => loc.name.toLowerCase().includes(searchTerm.toLowerCase()));

        if (viewMode === 'list') {
            return renderListView(filteredLocations);
        }

        if (type === 'citv') return renderCITVView();
        if (type === 'escon') return renderESCONView();
        if (type === 'ecsal') return renderECSALView();
        return null;
    };

    const renderESCONView = () => (
        <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-8 bg-blue-500 rounded-full" />
                    <h2 className="text-2xl font-bold text-gray-900">Escuelas de Conductores</h2>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {locations
                    .filter((location) => location.type === 'escuela_conductores')
                    .map((location: Location) => (
                        <div key={location.id} className="group relative bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-2xl hover:border-blue-300 transition-all duration-500 text-left overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/30 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-all duration-700" />

                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="bg-gray-50 w-14 h-14 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white shadow-sm transition-all duration-300">
                                        <Building2 size={24} className="text-gray-400 group-hover:text-white" />
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
                                        className={`w-full inline-flex items-center justify-between px-4 py-3 text-[11px] font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-md group/btn ${!location.checklist_url ? 'opacity-50 cursor-not-allowed grayscale pointer-events-none' : ''}`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <ClipboardCheck size={16} />
                                            INICIAR CHECKLIST
                                        </span>
                                        <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                    </a>
                                    <a
                                        href={location.history_url || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`w-full inline-flex items-center justify-between px-4 py-3 text-[11px] font-bold text-blue-600 bg-white border border-blue-100 rounded-xl hover:bg-blue-50 transition-all shadow-sm group/btn ${!location.history_url ? 'opacity-50 cursor-not-allowed grayscale pointer-events-none' : ''}`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <ExternalLink size={16} />
                                            HISTORIAL
                                        </span>
                                        <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );

    const renderECSALView = () => (
        <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-8 bg-emerald-500 rounded-full" />
                <h2 className="text-2xl font-bold text-gray-900">Servicios de Salud</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {locations
                    .filter((location) => location.type === 'policlinico')
                    .map((location: Location) => (
                        <div key={location.id} className="group relative bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-2xl hover:border-emerald-300 transition-all duration-500 text-left overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/30 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-all duration-700" />

                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="bg-gray-50 w-14 h-14 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white shadow-sm transition-all duration-300">
                                        <Stethoscope size={24} className="text-gray-400 group-hover:text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className="text-lg font-black text-gray-900 group-hover:text-emerald-700 transition-colors uppercase tracking-tight line-clamp-1">{location.name}</h3>
                                            {canEdit() && (
                                                <button
                                                    onClick={() => handleEditLinks(location)}
                                                    className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                                    title="Editar links"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Centro Autorizado MTC</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <a
                                        href={location.checklist_url || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`w-full inline-flex items-center justify-between px-4 py-3 text-[11px] font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-all shadow-md group/btn ${!location.checklist_url ? 'opacity-50 cursor-not-allowed grayscale pointer-events-none' : ''}`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <ClipboardCheck size={16} />
                                            INICIAR CHECKLIST
                                        </span>
                                        <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                    </a>
                                    <a
                                        href={location.history_url || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`w-full inline-flex items-center justify-between px-4 py-3 text-[11px] font-bold text-emerald-600 bg-white border border-emerald-100 rounded-xl hover:bg-emerald-50 transition-all shadow-sm group/btn ${!location.history_url ? 'opacity-50 cursor-not-allowed grayscale pointer-events-none' : ''}`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <ExternalLink size={16} />
                                            HISTORIAL
                                        </span>
                                        <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );

    const renderCITVView = () => (
        <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-8 bg-orange-500 rounded-full" />
                <h2 className="text-2xl font-bold text-gray-900">Plantas de Revisión Técnica</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {locations
                    .filter((location) => location.type === 'revision')
                    .filter((location) => location.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((location: Location) => (
                        <div key={location.id} className="group relative bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-2xl hover:border-orange-300 transition-all duration-500 text-left overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50/30 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-all duration-700" />

                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="bg-gray-50 w-14 h-14 rounded-xl flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white shadow-sm transition-all duration-300">
                                        <Car size={24} className="text-gray-400 group-hover:text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className="text-lg font-black text-gray-900 group-hover:text-orange-700 transition-colors uppercase tracking-tight line-clamp-1">{location.name}</h3>
                                            {canEdit() && (
                                                <button
                                                    onClick={() => handleEditLinks(location)}
                                                    className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                                                    title="Editar links"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Sede Operativa</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <a
                                        href={location.checklist_url || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`w-full inline-flex items-center justify-between px-4 py-3 text-[11px] font-bold text-white bg-orange-600 rounded-xl hover:bg-orange-700 transition-all shadow-md group/btn ${!location.checklist_url ? 'opacity-50 cursor-not-allowed grayscale pointer-events-none' : ''}`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <ClipboardCheck size={16} />
                                            INICIAR CHECKLIST
                                        </span>
                                        <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                    </a>
                                    <a
                                        href={location.history_url || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`w-full inline-flex items-center justify-between px-4 py-3 text-[11px] font-bold text-orange-600 bg-white border border-orange-100 rounded-xl hover:bg-orange-50 transition-all shadow-sm group/btn ${!location.history_url ? 'opacity-50 cursor-not-allowed grayscale pointer-events-none' : ''}`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <ExternalLink size={16} />
                                            HISTORIAL
                                        </span>
                                        <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );

    return (
        <div className="p-8">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Checklists{type ? ` - ${getSubtitle(type)}` : ''}
                    </h2>
                    <p className="text-gray-600">
                        {type ? 'Gestión de checklists por unidad de negocio' : 'Panel general de seguimiento de checklists operativos'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {type && driveLinks[type] && (
                        <a
                            href={driveLinks[type]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-all text-sm font-medium shadow-sm active:transform active:scale-95 ${type === 'escon' ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100' :
                                type === 'ecsal' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' :
                                    'bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100'
                                }`}
                        >
                            <ExternalLink size={16} />
                            Carpeta Drive {type.toUpperCase()}
                        </a>
                    )}
                    {type && (
                        <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 mr-2">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                title="Vista Cuadrícula"
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                title="Vista Listado"
                            >
                                <List size={18} />
                            </button>
                        </div>
                    )}
                    {type && (
                        <button
                            onClick={() => navigate('/checklist')}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium shadow-sm active:transform active:scale-95"
                        >
                            Volver al menú
                        </button>
                    )}
                </div>
            </div>

            {renderContent()}

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
