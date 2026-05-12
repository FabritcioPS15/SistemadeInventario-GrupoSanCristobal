import api from './api';

export const locationService = {
  async getAll() {
    const response = await api.get('/locations');
    return response.data;
  },
  async getOne(id: string) {
    const response = await api.get(`/locations/${id}`);
    return response.data;
  },
  async create(data: any) {
    const response = await api.post('/locations', data);
    return response.data;
  },
  async update(id: string, data: any) {
    const response = await api.patch(`/locations/${id}`, data);
    return response.data;
  },
  async delete(id: string) {
    const response = await api.delete(`/locations/${id}`);
    return response.data;
  },
  async getAreas(locationId?: string) {
    const response = await api.get('/locations/areas', { params: { locationId } });
    return response.data;
  }
};
