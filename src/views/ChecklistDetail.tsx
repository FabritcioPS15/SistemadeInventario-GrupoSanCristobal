import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, History, ExternalLink, GraduationCap, Stethoscope, Car, MapPin, Building2 } from 'lucide-react';
import { supabase, Location } from '../lib/supabase';

export default function ChecklistDetail() {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLocation = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setLocation(data as Location);
    } catch (err) {
      console.error('Error fetching location:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocation();
  }, [id]);

  const getTypeInfo = () => {
    switch (type) {
      case 'escon':
        return {
          title: 'ESCON',
          icon: <GraduationCap size={32} />,
          color: 'blue',
          description: 'Escuela de Conductores'
        };
      case 'ecsal':
        return {
          title: 'ECSAL',
          icon: <Stethoscope size={32} />,
          color: 'emerald',
          description: 'Policlínico'
        };
      case 'citv':
        return {
          title: 'CITV',
          icon: <Car size={32} />,
          color: 'orange',
          description: 'Revisión Técnica'
        };
      default:
        return {
          title: 'SEDE',
          icon: <Building2 size={32} />,
          color: 'slate',
          description: 'Sede'
        };
    }
  };

  const typeInfo = getTypeInfo();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-slate-800"></div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500 font-medium">No se encontró la sede.</p>
      </div>
    );
  }

  const driveLinks: Record<string, string> = {
    escon: (location as any).escon_general || '',
    ecsal: (location as any).ecsal_general || '',
    citv: (location as any).citv_general || ''
  };

  const evidenceLinks: Record<string, string> = {
    escon: (location as any).escon_individual || '',
    ecsal: (location as any).ecsal_individual || '',
    citv: (location as any).citv_individual || ''
  };

  const getTypeLink = (links: Record<string, string>) => {
    if (!type) return '';
    return links[type] || '';
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fc]">
      <div className="p-8 flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <button
            onClick={() => navigate('/checklist')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-6"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-semibold">Volver a Checklist</span>
          </button>

          {/* Location Info Card */}
          <div className="bg-white border border-slate-200 rounded-none shadow-sm overflow-hidden mb-8">
            <div className={`bg-gradient-to-r from-${typeInfo.color}-600 to-${typeInfo.color}-600 px-8 py-6`}>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  {typeInfo.icon}
                </div>
                <div>
                  <h1 className="text-2xl font-black text-white uppercase tracking-tight">{location.name}</h1>
                  <p className="text-white/80 text-sm font-semibold uppercase tracking-wider">{typeInfo.description}</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin size={16} className="text-slate-400" />
                <span className="text-sm font-semibold uppercase tracking-wider">{location.address || 'Sin dirección registrada'}</span>
              </div>
            </div>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Checklist Card */}
            <div
              className="bg-white border border-slate-200 rounded-none shadow-sm hover:shadow-lg transition-all cursor-pointer group overflow-hidden"
              onClick={() => {
                const link = getTypeLink(driveLinks);
                if (link) {
                  window.open(link, '_blank');
                }
              }}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <FileText size={24} className="text-blue-600 group-hover:text-white transition-colors" />
                  </div>
                  <ExternalLink size={20} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                </div>
                <h3 className="text-lg font-black text-slate-900 uppercase mb-2">Realizar Checklist</h3>
                <p className="text-sm text-slate-600 font-medium">Acceder al formulario de checklist para esta sede</p>
              </div>
              <div className={`bg-${typeInfo.color}-100 px-6 py-3 border-t border-${typeInfo.color}-200`}>
                <span className={`text-xs font-black uppercase tracking-widest text-${typeInfo.color}-700`}>
                  Abrir en Drive
                </span>
              </div>
            </div>

            {/* History Card */}
            <div
              className="bg-white border border-slate-200 rounded-none shadow-sm hover:shadow-lg transition-all cursor-pointer group overflow-hidden"
              onClick={() => {
                const link = getTypeLink(evidenceLinks);
                if (link) {
                  window.open(link, '_blank');
                }
              }}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <History size={24} className="text-emerald-600 group-hover:text-white transition-colors" />
                  </div>
                  <ExternalLink size={20} className="text-slate-300 group-hover:text-emerald-600 transition-colors" />
                </div>
                <h3 className="text-lg font-black text-slate-900 uppercase mb-2">Ver Historial</h3>
                <p className="text-sm text-slate-600 font-medium">Acceder a la carpeta de evidencias y documentos históricos</p>
              </div>
              <div className="bg-emerald-100 px-6 py-3 border-t border-emerald-200">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-700">
                  Abrir Evidencias
                </span>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-8 bg-white border border-slate-200 rounded-none shadow-sm p-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Información de la Sede</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-widest block mb-1">Nombre</span>
                <span className="text-sm font-semibold text-slate-900">{location.name}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-widest block mb-1">Tipo</span>
                <span className="text-sm font-semibold text-slate-900">{typeInfo.description}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
