import api from './api';
import { supabase } from '../lib/supabase';

const DB_MODE = import.meta.env.VITE_DATABASE_MODE || 'supabase';

export const vehicleService = {
  async getAll() {
    if (DB_MODE === 'supabase') {
      const { data, error } = await supabase
        .from('vehiculos')
        .select('*')
        .order('placa', { ascending: true });
        
      if (error) throw error;
      return data;
    } else {
      const response = await api.get('/vehicles');
      return response.data;
    }
  },

  async update(id: string, vehicleData: any) {
    if (DB_MODE === 'supabase') {
      const { error } = await supabase
        .from('vehiculos')
        .update(vehicleData)
        .eq('id', id);
        
      if (error) throw error;
      return true;
    } else {
      const response = await api.put(`/vehicles/${id}`, vehicleData);
      return response.data;
    }
  },

  async getExpirations() {
    if (DB_MODE === 'supabase') {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const limitDate = thirtyDaysFromNow.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('vehiculos')
        .select('placa, soat_vencimiento, citv_vencimiento, poliza_vencimiento')
        .or(`soat_vencimiento.lte.${limitDate},citv_vencimiento.lte.${limitDate},poliza_vencimiento.lte.${limitDate}`);

      if (error) throw error;
      return data;
    } else {
      const response = await api.get('/vehicles/expirations');
      return response.data;
    }
  },

  async delete(id: string) {
    if (DB_MODE === 'supabase') {
      const { error } = await supabase.from('vehiculos').delete().eq('id', id);
      if (error) throw error;
      return true;
    } else {
      const response = await api.delete(`/vehicles/${id}`);
      return response.data;
    }
  }
};
