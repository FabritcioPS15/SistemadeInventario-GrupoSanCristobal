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

            const privilegedRoles = ['super_admin', 'sistemas', 'gerencia', 'supervisores'];
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
        const privilegedRoles = ['super_admin', 'sistemas', 'gerencia', 'supervisores'];
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
            {/* ESGON Section */}
            {canSeeSection('escon') && (
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-2 h-6 bg-blue-500 rounded-full" />
                        <h2 className="text-sm font-black text-[#002855] uppercase tracking-[0.2em]">ESCON</h2>
                        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black">{locations.filter(l => l.type === 'escuela_conductores').length} sedes</span>
                    </div>
                    <div className="bg-white rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-slate-50 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/60">
                                    <th className="px-7 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Sede</th>
                                    <th className="px-5 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Dirección</th>
                                    <th className="px-5 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Documentos</th>
                                    <th className="px-5 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {locations.filter(l => l.type === 'escuela_conductores').map(location => (
                                    <tr key={location.id} className="hover:bg-blue-50/10 cursor-pointer transition-all group">
                                        <td className="px-7 py-5">
                                            <span className="text-[11px] font-black text-[#002855]">{location.name}</span>
                                        </td>
                                        <td className="px-5 py-5">
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{location.address || 'Sin dirección'}</p>
                                        </td>
                                        <td className="px-5 py-5 text-center">
                                            <span className="text-[9px] font-black text-blue-600">2 documentos</span>
                                        </td>
                                        <td className="px-5 py-5">
                                            <button 
                                                onClick={() => navigate('/checklist/escon')}
                                                className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase"
                                            >
                                                Ver checklist →
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ECSAL Section */}
            {canSeeSection('ecsal') && (
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-2 h-6 bg-emerald-500 rounded-full" />
                        <h2 className="text-sm font-black text-[#002855] uppercase tracking-[0.2em]">ECSAL</h2>
                        <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-[10px] font-black">{locations.filter(l => l.type === 'policlinico').length} sedes</span>
                    </div>
                    <div className="bg-white rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-slate-50 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/60">
                                    <th className="px-7 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Sede</th>
                                    <th className="px-5 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Dirección</th>
                                    <th className="px-5 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Documentos</th>
                                    <th className="px-5 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {locations.filter(l => l.type === 'policlinico').map(location => (
                                    <tr key={location.id} className="hover:bg-emerald-50/10 cursor-pointer transition-all group">
                                        <td className="px-7 py-5">
                                            <span className="text-[11px] font-black text-[#002855]">{location.name}</span>
                                        </td>
                                        <td className="px-5 py-5">
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{location.address || 'Sin dirección'}</p>
                                        </td>
                                        <td className="px-5 py-5 text-center">
                                            <span className="text-[9px] font-black text-emerald-600">2 documentos</span>
                                        </td>
                                        <td className="px-5 py-5">
                                            <button 
                                                onClick={() => navigate('/checklist/ecsal')}
                                                className="text-[10px] font-black text-emerald-600 hover:text-emerald-800 uppercase"
                                            >
                                                Ver checklist →
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* CITV Section */}
            {canSeeSection('citv') && (
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-2 h-6 bg-orange-500 rounded-full" />
                        <h2 className="text-sm font-black text-[#002855] uppercase tracking-[0.2em]">CITV</h2>
                        <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-lg text-[10px] font-black">{locations.filter(l => l.type === 'revision').length} sedes</span>
                    </div>
                    <div className="bg-white rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-slate-50 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/60">
                                    <th className="px-7 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Sede</th>
                                    <th className="px-5 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Dirección</th>
                                    <th className="px-5 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Documentos</th>
                                    <th className="px-5 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {locations.filter(l => l.type === 'revision').map(location => (
                                    <tr key={location.id} className="hover:bg-orange-50/10 cursor-pointer transition-all group">
                                        <td className="px-7 py-5">
                                            <span className="text-[11px] font-black text-[#002855]">{location.name}</span>
                                        </td>
                                        <td className="px-5 py-5">
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{location.address || 'Sin dirección'}</p>
                                        </td>
                                        <td className="px-5 py-5 text-center">
                                            <span className="text-[9px] font-black text-orange-600">2 documentos</span>
                                        </td>
                                        <td className="px-5 py-5">
                                            <button 
                                                onClick={() => navigate('/checklist/citv')}
                                                className="text-[10px] font-black text-orange-600 hover:text-orange-800 uppercase"
                                            >
                                                Ver checklist →
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
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
