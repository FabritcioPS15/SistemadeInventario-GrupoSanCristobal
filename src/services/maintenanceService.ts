import api from './api';
import { supabase } from '../lib/supabase';

const DB_MODE = import.meta.env.VITE_DATABASE_MODE || 'supabase';

export const maintenanceService = {
  async getAll(filters: any = {}) {
    if (DB_MODE === 'supabase') {
      let query = supabase
        .from('maintenance_records')
        .select('*, assets(*, asset_types(*), locations(*)), locations!location_id(*)')
        .order('created_at', { ascending: false });

      if (filters.status) query = query.eq('status', filters.status);
      if (filters.type) query = query.eq('maintenance_type', filters.type);
      if (filters.machineType) query = query.eq('assets.asset_type_id', filters.machineType);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    } else {
      const response = await api.get('/maintenance', { params: filters });
      return response.data;
    }
  },

  async delete(id: string) {
    if (DB_MODE === 'supabase') {
      const { error } = await supabase.from('maintenance_records').delete().eq('id', id);
      if (error) throw error;
      return true;
    } else {
      const response = await api.delete(`/maintenance/${id}`);
      return response.data;
    }
  }
};
