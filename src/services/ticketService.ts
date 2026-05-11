import api from './api';
import { supabase } from '../lib/supabase';

// Determinar el modo de base de datos desde variables de entorno
// Si no está definido, por defecto usa 'supabase' para mantener estabilidad
const DB_MODE = import.meta.env.VITE_DATABASE_MODE || 'supabase';

export const ticketService = {
  /**
   * Obtiene todos los tickets activos (no archivados)
   */
  async getAll() {
    if (DB_MODE === 'supabase') {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          id, 
          title, 
          status, 
          priority, 
          created_at, 
          resolved_at, 
          closed_at, 
          attended_at, 
          requester_id, 
          assigned_to, 
          location_id, 
          requester:requester_id(full_name, avatar_url), 
          attendant:assigned_to(full_name, avatar_url), 
          locations(name)
        `)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data;
    } else {
      const response = await api.get('/tickets');
      return response.data;
    }
  },

  /**
   * Actualiza el estado de un ticket
   */
  async updateStatus(id: string, status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'archived') {
    if (DB_MODE === 'supabase') {
      const updateData: any = { 
        status,
        updated_at: new Date().toISOString()
      };
      
      if (status === 'closed') updateData.closed_at = new Date().toISOString();
      if (status === 'resolved') updateData.resolved_at = new Date().toISOString();
      
      const { error } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', id);
        
      if (error) throw error;
      return true;
    } else {
      const response = await api.patch(`/tickets/${id}/status`, { status });
      return response.data;
    }
  },

  /**
   * Crea un nuevo ticket
   */
  async create(ticketData: any) {
    if (DB_MODE === 'supabase') {
      const { data, error } = await supabase
        .from('tickets')
        .insert([ticketData])
        .select();
        
      if (error) throw error;
      return data[0];
    } else {
      const response = await api.post('/tickets', ticketData);
      return response.data;
    }
  },

  /**
   * Elimina o archiva un ticket (dependiendo de la implementación del backend)
   */
  async delete(id: string) {
    if (DB_MODE === 'supabase') {
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      return true;
    } else {
      const response = await api.delete(`/tickets/${id}`);
      return response.data;
    }
  }
};
