import api from './api';
import { supabase } from '../lib/supabase';

const DB_MODE = import.meta.env.VITE_DATABASE_MODE || 'supabase';

export const inventoryService = {
  async getAllAssets() {
    if (DB_MODE === 'supabase') {
      const { data, error } = await supabase
        .from('assets')
        .select(`
          *,
          locations(name),
          categories(name),
          subcategories(name)
        `)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data;
    } else {
      const response = await api.get('/inventory/assets');
      return response.data;
    }
  },

  async createAsset(assetData: any) {
    if (DB_MODE === 'supabase') {
      const { data, error } = await supabase
        .from('assets')
        .insert([assetData])
        .select();
        
      if (error) throw error;
      return data[0];
    } else {
      const response = await api.post('/inventory/assets', assetData);
      return response.data;
    }
  },

  async getStats() {
    if (DB_MODE === 'supabase') {
      // En modo Supabase usualmente hacemos múltiples conteos
      const { count: total } = await supabase.from('assets').select('*', { count: 'exact', head: true });
      const { count: active } = await supabase.from('assets').select('*', { count: 'exact', head: true }).eq('status', 'active');
      
      return { total, active };
    } else {
      const response = await api.get('/inventory/stats');
      return response.data;
    }
  },

  async deleteAsset(id: string) {
    if (DB_MODE === 'supabase') {
      const { error } = await supabase.from('assets').delete().eq('id', id);
      if (error) throw error;
      return true;
    } else {
      const response = await api.delete(`/inventory/assets/${id}`);
      return response.data;
    }
  }
};
