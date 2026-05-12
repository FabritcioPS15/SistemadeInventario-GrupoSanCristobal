import api from './api';

export const ticketService = {
  /**
   * Obtiene todos los tickets activos (no archivados)
   */
  async getAll() {
    const response = await api.get('/tickets');
    return response.data;
  },

  /**
   * Actualiza el estado de un ticket
   */
  async updateStatus(id: string, status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'archived') {
    const response = await api.patch(`/tickets/${id}/status`, { status });
    return response.data;
  },

  /**
   * Crea un nuevo ticket
   */
  async create(ticketData: any) {
    const response = await api.post('/tickets', ticketData);
    return response.data;
  },

  /**
   * Elimina o archiva un ticket
   */
  async delete(id: string) {
    const response = await api.delete(`/tickets/${id}`);
    return response.data;
  }
};
