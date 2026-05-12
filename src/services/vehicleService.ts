import api from './api';

export const vehicleService = {
  async getAll() {
    const response = await api.get('/vehicles');
    return response.data;
  },

  async update(id: string, vehicleData: any) {
    const response = await api.put(`/vehicles/${id}`, vehicleData);
    return response.data;
  },

  async getExpirations() {
    const response = await api.get('/vehicles/expirations');
    return response.data;
  },

  async delete(id: string) {
    const response = await api.delete(`/vehicles/${id}`);
    return response.data;
  }
};
