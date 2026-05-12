import api from './api';

export const maintenanceService = {
  async getAll(filters: any = {}) {
    const response = await api.get('/maintenance', { params: filters });
    return response.data;
  },

  async delete(id: string) {
    const response = await api.delete(`/maintenance/${id}`);
    return response.data;
  }
};
