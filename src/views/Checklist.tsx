import { Car, ClipboardCheck, ChevronRight, Building2, Stethoscope, GraduationCap, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ChecklistProps {
    type?: string;
}

export default function Checklist({ type }: ChecklistProps) {
    const navigate = useNavigate();

    const getSubtitle = (t?: string) => {
        if (!t) return '';
        return t.toUpperCase();
    };

    const renderGeneralView = () => (
        <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* ESCON Card */}
                <div
                    onClick={() => navigate('/checklist-escon')}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="bg-blue-100 p-3 rounded-lg group-hover:bg-blue-200 transition-colors">
                            <GraduationCap className="text-blue-600" size={32} />
                        </div>
                        <ChevronRight className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">ESCON</h3>
                    <p className="text-gray-600 text-sm mb-4">Escuela de Conductores</p>
                    <div className="flex items-center text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded w-fit">
                        3 Sedes Disponibles
                    </div>
                </div>

                {/* ECSAL Card */}
                <div
                    onClick={() => navigate('/checklist-ecsal')}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="bg-green-100 p-3 rounded-lg group-hover:bg-green-200 transition-colors">
                            <Stethoscope className="text-green-600" size={32} />
                        </div>
                        <ChevronRight className="text-gray-400 group-hover:text-green-600 transition-colors" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">ECSAL</h3>
                    <p className="text-gray-600 text-sm mb-4">Policlínicos / Salud</p>
                    <div className="flex items-center text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded w-fit">
                        3 Sedes Disponibles
                    </div>
                </div>

                {/* CITV Card */}
                <div
                    onClick={() => navigate('/checklist-citv')}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="bg-orange-100 p-3 rounded-lg group-hover:bg-orange-200 transition-colors">
                            <Car className="text-orange-600" size={32} />
                        </div>
                        <ChevronRight className="text-gray-400 group-hover:text-orange-600 transition-colors" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">CITV</h3>
                    <p className="text-gray-600 text-sm mb-4">Revisiones Técnicas</p>
                    <div className="flex items-center text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded w-fit">
                        7 Sedes Disponibles
                    </div>
                </div>
            </div>
        </div>
    );

    const renderCITVView = () => (
        <div className="max-w-7xl mx-auto">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <Car className="text-orange-600" size={24} />
                Centros de Inspección Técnica Vehicular
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* RTP Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-slate-900 p-6 text-white text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Car size={100} />
                        </div>
                        <h3 className="text-3xl font-black mb-1 relative z-10">RTP</h3>
                        <p className="text-orange-400 font-medium relative z-10 text-sm tracking-wider uppercase">Revisiones Técnicas del Perú</p>
                    </div>
                    <div className="p-6">
                        <div className="space-y-3">
                            {['RTP ANDAHUAYLAS', 'RTP AYACUCHO', 'RTP CANTA CALLAO', 'RTP CALLAO GAMBETA'].map((item) => (
                                <button key={item} className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-100 bg-gray-50 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                            <MapPin size={16} />
                                        </div>
                                        <span className="font-semibold text-gray-700 group-hover:text-slate-900">{item}</span>
                                    </div>
                                    <ChevronRight className="text-gray-400 group-hover:text-slate-900 opacity-0 group-hover:opacity-100 transition-all" size={20} />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RTV Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-amber-500 p-6 text-white text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Car size={100} />
                        </div>
                        <h3 className="text-3xl font-black mb-1 relative z-10">RTV</h3>
                        <p className="text-white/80 font-medium relative z-10 text-sm tracking-wider uppercase">Revisiones Técnicas Vehiculares</p>
                    </div>
                    <div className="p-6">
                        <div className="space-y-3">
                            {['RTV HUANCAVELICA', 'RTV ICA', 'RTV AYACUCHO'].map((item) => (
                                <button key={item} className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-100 bg-gray-50 hover:bg-white hover:border-amber-400 hover:shadow-sm transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
                                            <MapPin size={16} />
                                        </div>
                                        <span className="font-semibold text-gray-700 group-hover:text-amber-700">{item}</span>
                                    </div>
                                    <ChevronRight className="text-gray-400 group-hover:text-amber-600 opacity-0 group-hover:opacity-100 transition-all" size={20} />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderESCONView = () => (
        <div className="max-w-7xl mx-auto">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <GraduationCap className="text-blue-600" size={24} />
                Escuelas de Conductores
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {['ESCON SAN CRISTOBAL', 'ESCON SANTA ROSA', 'ESCON LIMA'].map((item) => (
                    <button key={item} className="flex flex-col p-6 rounded-xl border border-gray-200 bg-white hover:shadow-md hover:border-blue-300 transition-all text-left group">
                        <div className="bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Building2 size={24} className="text-blue-600 group-hover:text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{item}</h3>
                        <p className="text-sm text-gray-500 mb-4">Sede autorizada</p>
                        <div className="mt-auto flex items-center text-sm font-medium text-blue-600 gap-1 group-hover:gap-2 transition-all">
                            Ver Checklist <ChevronRight size={16} />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );

    const renderECSALView = () => (
        <div className="max-w-7xl mx-auto">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                <Stethoscope className="text-green-600" size={24} />
                Policlínicos y Salud
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {['ECSAL SAN CRISTOBAL', 'ECSAL LIMA NORTE', 'ECSAL SUR'].map((item) => (
                    <button key={item} className="flex flex-col p-6 rounded-xl border border-gray-200 bg-white hover:shadow-md hover:border-green-300 transition-all text-left group">
                        <div className="bg-green-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-600 group-hover:text-white transition-colors">
                            <Stethoscope size={24} className="text-green-600 group-hover:text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{item}</h3>
                        <p className="text-sm text-gray-500 mb-4">Servicios Médicos</p>
                        <div className="mt-auto flex items-center text-sm font-medium text-green-600 gap-1 group-hover:gap-2 transition-all">
                            Ver Checklist <ChevronRight size={16} />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div className="p-6"> {/* Standard padding p-8 matches other views */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-orange-100 border border-orange-200 rounded-lg p-2">
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Checklists
                            {type && (
                                <span className="ml-2 text-lg font-medium text-gray-500">
                                    / {getSubtitle(type)}
                                </span>
                            )}
                        </h1>
                        <p className="text-gray-600">Gestión y seguimiento de inspecciones</p>
                    </div>
                </div>
            </div>

            {/* Content Rendering */}
            {!type && renderGeneralView()}
            {type === 'citv' && renderCITVView()}
            {type === 'escon' && renderESCONView()}
            {type === 'ecsal' && renderECSALView()}
        </div>
    );
}
