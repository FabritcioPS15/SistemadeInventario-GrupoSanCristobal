import { useEffect, useState } from 'react';
import { Car, ChevronRight, Building2, Stethoscope, GraduationCap, FileText, Clock, ExternalLink, Edit, LayoutGrid, List, Star, X } from 'lucide-react';
import { supabase, Location } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LocationForm from '../components/forms/LocationForm';

export default function Checklist({ type }: { type?: string }) {
    const navigate = useNavigate();
    const { canEdit, user } = useAuth();
    const [locations, setLocations] = useState<Location[]>([]);
    const [searchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showForm, setShowForm] = useState(false);
    const [editingLocation, setEditingLocation] = useState<Location | undefined>();

    const driveLinks: Record<string, string> = {
        escon: 'https://drive.google.com/drive/folders/170_fX-XqA6K8F8-R7Nn-T5R_N4L5lX_h?usp=drive_link',
        ecsal: 'https://drive.google.com/drive/folders/1F-vTj-YV-R9Y8L8X8K7Nn-T5R_N4L5lX_h?usp=drive_link',
        citv: 'https://drive.google.com/drive/folders/11Q8PLtXgaL6T42LkcAb1y3MZjyIKOpUi?usp=drive_link'
    };

    const fetchLocations = async () => {
        try {
            const { data: locationsData, error: locationsError } = await supabase
                .from('locations')
                .select('*')
                .order('name');

            if (locationsError) throw locationsError;

            let filteredResults = locationsData as Location[];

            const privilegedRoles = ['systems', 'management', 'supervisor'];
            const isPrivileged = user && privilegedRoles.includes(user.role);

            if (!isPrivileged && user?.location_id) {
                filteredResults = filteredResults.filter(loc => loc.id === user.location_id);
            }

            setLocations(filteredResults);
        } catch (err) {
            console.error('Error fetching locations:', err);
        }
    };

    useEffect(() => {
        fetchLocations();
    }, [user?.location_id, user?.role]);

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
        let filtered = locations;

        if (type) {
            filtered = filtered.filter(loc => {
                if (type === 'escon') return loc.type === 'escuela_conductores';
                if (type === 'ecsal') return loc.type === 'policlinico';
                if (type === 'citv') return loc.type === 'revision';
                return false;
            });
        }

        return filtered.filter(loc => loc.name.toLowerCase().includes(searchTerm.toLowerCase()));
    };

    const canSeeSection = (sectionType: string) => {
        const privilegedRoles = ['systems', 'management', 'supervisor'];
        if (user && privilegedRoles.includes(user.role)) return true;

        if (user?.location_id) {
            const userLoc = locations.find(l => l.id === user.location_id);
            if (!userLoc) return true;

            if (sectionType === 'escon') return userLoc.type === 'escuela_conductores';
            if (sectionType === 'ecsal') return userLoc.type === 'policlinico';
            if (sectionType === 'citv') return userLoc.type === 'revision';
        }

        return true;
    };

    const renderGeneralView = () => (
        <div className="animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {canSeeSection('escon') && (
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
                )}

                {canSeeSection('ecsal') && (
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
                )}

                {canSeeSection('citv') && (
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
                )}
            </div>

            <div className="mt-16 text-center">
                <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl p-8 border border-slate-200">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Clock size={20} className="text-slate-600" />
                        <h3 className="text-lg font-bold text-slate-900">Actualización en Tiempo Real</h3>
                    </div>
                    <p className="text-slate-600 text-sm max-w-2xl mx-auto">
                        Todos los checklists se actualizan automáticamente en tiempo real.
                    </p>
                </div>
            </div>
        </div>
    );

    const renderSpecificView = (unitType: string, unitColor: string, icon: any) => {
        const filteredLocations = getFilteredLocations();

        return (
            <div className="animate-in fade-in duration-500">
                {viewMode === 'grid' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredLocations.map((location) => (
                            <div key={location.id} className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-200 transition-all duration-300 overflow-hidden">
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`p-3 rounded-2xl bg-${unitColor}-50 text-${unitColor}-600 group-hover:bg-${unitColor}-600 group-hover:text-white transition-all duration-300`}>
                                            {icon}
                                        </div>
                                        {canEdit() && (
                                            <button
                                                onClick={() => handleEditLinks(location)}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                title="Editar enlaces"
                                            >
                                                <Edit size={18} />
                                            </button>
                                        )}
                                    </div>

                                    <h3 className="text-lg font-bold text-gray-900 uppercase tracking-tight mb-1">{location.name}</h3>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 italic">{location.address || 'Sin dirección registrada'}</p>

                                    <div className="space-y-3">
                                        <a
                                            href={(location as any)[`${unitType}_general`]}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100 group/link hover:bg-${unitColor}-50 hover:border-${unitColor}-200 transition-all`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-white shadow-sm">
                                                    <FileText size={16} className={`text-${unitColor}-500`} />
                                                </div>
                                                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Checklist General</span>
                                            </div>
                                            <ChevronRight size={18} className="text-gray-300 group-hover/link:translate-x-1 transition-all" />
                                        </a>

                                        <a
                                            href={(location as any)[`${unitType}_individual`]}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100 group/link hover:bg-${unitColor}-50 hover:border-${unitColor}-200 transition-all`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-white shadow-sm">
                                                    <ExternalLink size={16} className={`text-${unitColor}-500`} />
                                                </div>
                                                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Carpeta Evidencias</span>
                                            </div>
                                            <ChevronRight size={18} className="text-gray-300 group-hover/link:translate-x-1 transition-all" />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {viewMode === 'list' && (
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Sede</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Documentación</th>
                                    {canEdit() && <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Acciones</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredLocations.map((location) => (
                                    <tr key={location.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-xl bg-${unitColor}-50 text-${unitColor}-600`}>
                                                    {icon}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 uppercase tracking-tight">{location.name}</p>
                                                    <p className="text-[9px] text-gray-400 uppercase font-black">{location.address || 'S/D'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-4">
                                                <a
                                                    href={(location as any)[`${unitType}_general`]}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-blue-600"
                                                >
                                                    <FileText size={14} /> General
                                                </a>
                                                <a
                                                    href={(location as any)[`${unitType}_individual`]}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-blue-600"
                                                >
                                                    <ExternalLink size={14} /> Evidencias
                                                </a>
                                            </div>
                                        </td>
                                        {canEdit() && (
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleEditLinks(location)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all"
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
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-[#f8f9fc]">
            <div className="p-8 flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    {/* Fila de Acciones Superior */}
                    {type && (
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm mb-8">
                            <div className="flex items-center gap-3">
                                <div className="bg-slate-50 p-3 rounded-2xl text-[#002855]">
                                    {type === 'escon' ? <GraduationCap size={20} /> :
                                        type === 'ecsal' ? <Stethoscope size={20} /> :
                                            type === 'citv' ? <Car size={20} /> :
                                                <FileText size={20} />}
                                </div>
                                <h2 className="text-[13px] font-black text-[#002855] uppercase tracking-wider">
                                    {`GESTIÓN ${type.toUpperCase()}`}
                                </h2>
                            </div>

                            <div className="flex items-center gap-2">
                                {driveLinks[type] && (
                                    <a
                                        href={driveLinks[type]}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all font-black text-[10px] uppercase tracking-widest mr-2 border border-blue-100"
                                    >
                                        <ExternalLink size={14} />
                                        Abrir Drive
                                    </a>
                                )}

                                <div className="flex items-center gap-1 border-r border-gray-200 pr-3 mr-1">
                                    <div className="flex bg-slate-50 p-1 rounded-xl">
                                        <button
                                            onClick={() => setViewMode('grid')}
                                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                                        >
                                            <LayoutGrid size={18} />
                                        </button>
                                        <button
                                            onClick={() => setViewMode('list')}
                                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
                                        >
                                            <List size={18} />
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={() => navigate('/checklist')}
                                    className="px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-all font-black text-[10px] uppercase tracking-widest shadow-md"
                                >
                                    Volver
                                </button>
                            </div>
                        </div>
                    )}

                    {!type && renderGeneralView()}
                    {type === 'escon' && renderSpecificView('escon', 'blue', <GraduationCap size={24} />)}
                    {type === 'ecsal' && renderSpecificView('ecsal', 'emerald', <Stethoscope size={24} />)}
                    {type === 'citv' && renderSpecificView('citv', 'orange', <Car size={24} />)}
                </div>

                {showForm && editingLocation && (
                    <LocationForm
                        editLocation={editingLocation}
                        onClose={() => {
                            setShowForm(false);
                            setEditingLocation(undefined);
                        }}
                        onSave={handleSaveLinks}
                    />
                )}
            </div>
        </div>
    );
}
