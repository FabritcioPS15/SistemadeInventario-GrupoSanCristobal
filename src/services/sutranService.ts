import api from './api';
import { supabase } from '../lib/supabase';

const DB_MODE = import.meta.env.VITE_DATABASE_MODE || 'supabase';

export const sutranService = {
  async getAll() {
    if (DB_MODE === 'supabase') {
      const { data, error } = await supabase
        .from('sutran_visits')
        .select('*, locations(*)')
        .order('visit_date', { ascending: false });
        
      if (error) throw error;
      return data;
    } else {
      const response = await api.get('/sutran/visits');
      return response.data;
    }
  },

  async delete(id: string) {
    if (DB_MODE === 'supabase') {
      const { error } = await supabase.from('sutran_visits').delete().eq('id', id);
      if (error) throw error;
      return true;
    } else {
      const response = await api.delete(`/sutran/visits/${id}`);
      return response.data;
    }
  }
};
