import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, AlertTriangle, User, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FutureVisit {
  id: string;
  visit_date: string;
  inspector_name: string;
  location_name: string;
  visit_type: string;
  status: string;
  estimated_duration?: string;
  estimated_cost?: number;
  observations?: string;
}

export default function SutranFutureVisits() {
  const navigate = useNavigate();
  const [visits, setVisits] = useState<FutureVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFutureVisits = async () => {
    try {
      const today = new Date();
      const ninetyDaysFromNow = new Date();
      ninetyDaysFromNow.setDate(today.getDate() + 90);

      const { data, error } = await supabase
        .from('sutran_visits')
        .select('*')
        .eq('status', 'pending')
        .gte('visit_date', today.toISOString().split('T')[0])
        .lte('visit_date', ninetyDaysFromNow.toISOString().split('T')[0])
        .order('visit_date', { ascending: true });

      if (error) throw error;
      setVisits(data as FutureVisit[] || []);
    } catch (error) {
      console.error('Error fetching future visits:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFutureVisits();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFutureVisits();
  };

  const getDaysRemaining = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(dateString);
    targetDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Mañana';
    return `en ${diffDays} días`;
  };

  const getVisitTypeLabel = (type: string) => {
    switch (type) {
      case 'programada': return 'Programada';
      case 'no_programada': return 'No programada';
      case 'de_gabinete': return 'De gabinete';
      default: return 'Desconocido';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'programada': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'no_programada': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'de_gabinete': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const totalEstimatedCost = visits.reduce((sum, visit) => sum + (visit.estimated_cost || 0), 0);

  return (
    <div className="flex flex-col h-full bg-[#f8f9fc]">
      <div className="p-8 space-y-6 flex-1 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#001529] flex items-center justify-center text-white shadow-xl">
              <Calendar size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#002855] tracking-tight">Futuras Visitas SUTRAN</h1>
              <p className="text-sm text-slate-500">Visitas programadas y estimados para los próximos 90 días</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            <span className="font-medium">Refrescar</span>
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-none shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Calendar size={24} className="text-blue-600" />
              </div>
              <span className="text-3xl font-black text-slate-900">{visits.length}</span>
            </div>
            <p className="text-sm font-bold text-slate-600">Visitas Programadas</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-none shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Clock size={24} className="text-emerald-600" />
              </div>
              <span className="text-3xl font-black text-slate-900">
                {visits.reduce((sum, visit) => {
                  const duration = parseInt(visit.estimated_duration || '0');
                  return sum + duration;
                }, 0)}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-600">Horas Estimadas</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-none shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                <AlertTriangle size={24} className="text-amber-600" />
              </div>
              <span className="text-3xl font-black text-slate-900">
                S/ {totalEstimatedCost.toLocaleString()}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-600">Costo Estimado Total</p>
          </div>
        </div>

        {/* Visits List */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-slate-800"></div>
          </div>
        ) : visits.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-none shadow-sm p-16 text-center">
            <div className="w-24 h-24 rounded-full bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center mx-auto mb-6">
              <Calendar size={48} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">No hay visitas futuras programadas</h3>
            <p className="text-slate-500">Las visitas SUTRAN programadas aparecerán aquí</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-none shadow-sm overflow-hidden flex flex-col">
            <table className="w-full text-left border-collapse border-spacing-0">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-5 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Fecha</span></th>
                  <th className="px-4 py-5 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Sede</span></th>
                  <th className="px-4 py-5 text-left"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Inspector</span></th>
                  <th className="px-4 py-5 text-center"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Tipo</span></th>
                  <th className="px-4 py-5 text-center"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Duración</span></th>
                  <th className="px-4 py-5 text-center"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Costo</span></th>
                  <th className="px-6 py-5 text-center"><span className="text-[12px] font-black text-[#002855] uppercase tracking-[0.2em]">Tiempo</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visits.map((visit) => (
                  <tr key={visit.id} onClick={() => navigate('/sutran')} className="hover:bg-blue-50/70 cursor-pointer transition-colors duration-200 group relative border-b border-slate-50 last:border-0">
                    <td className="px-6 py-5 font-bold text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-none flex items-center justify-center shadow-sm transition-all duration-300 bg-slate-100 text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-md">
                          <Calendar size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[14px] font-black text-[#002855] uppercase leading-tight group-hover:text-blue-600 transition-colors">
                            {new Date(visit.visit_date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{getDaysRemaining(visit.visit_date)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-left">
                      <div className="flex items-center gap-2">
                        <MapPin size={12} className="text-slate-400" />
                        <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">{visit.location_name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-left">
                      <div className="flex items-center gap-2">
                        <User size={12} className="text-slate-400" />
                        <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">{visit.inspector_name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-widest border ${getTypeColor(visit.visit_type)} rounded-none`}>
                        {getVisitTypeLabel(visit.visit_type)}
                      </span>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-600">
                        <Clock size={12} className="text-slate-400" />
                        {visit.estimated_duration ? `${visit.estimated_duration}h` : 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <div className="text-[10px] font-bold text-slate-600">
                        {visit.estimated_cost ? `S/ ${visit.estimated_cost.toLocaleString()}` : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-600">
                        <Clock size={12} className="text-slate-400" />
                        {getDaysRemaining(visit.visit_date)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
