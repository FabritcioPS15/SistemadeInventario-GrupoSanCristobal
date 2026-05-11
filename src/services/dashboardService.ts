import api from './api';
import { supabase } from '../lib/supabase';

const DB_MODE = import.meta.env.VITE_DATABASE_MODE || 'supabase';

export const dashboardService = {
  async getQuickStats() {
    if (DB_MODE === 'supabase') {
      // Reutilizamos la lógica pesada de Supabase pero centralizada
      const [
        { count: totalAssets },
        { count: activeAssets },
        { count: totalCameras },
        { count: activeCameras },
        { count: totalTickets },
        { data: tickets },
        { data: vehicles },
        { data: schoolsData },
        { data: recentTicketsData }
      ] = await Promise.all([
        supabase.from('assets').select('id', { count: 'exact', head: true }),
        supabase.from('assets').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('cameras').select('id', { count: 'exact', head: true }),
        supabase.from('cameras').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('tickets').select('*', { count: 'exact', head: true }),
        supabase.from('tickets').select('status'),
        supabase.from('vehiculos').select('estado, soat_vencimiento, citv_vencimiento, poliza_vencimiento, placa, ubicacion_actual'),
        supabase.from('locations').select('id, name'),
        supabase.from('tickets')
          .select(`
            id,
            requester:requester_id(id, full_name, avatar_url),
            attendant:assigned_to(id, full_name, avatar_url)
          `)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      return {
        totalAssets,
        activeAssets,
        totalCameras,
        activeCameras,
        totalTickets,
        tickets,
        vehicles,
        schoolsData,
        recentTicketsData: recentTicketsData
      };
    } else {
      const response = await api.get('/dashboard/stats');
      return response.data;
    }
  }
};
