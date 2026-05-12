import api from './api';

export const cameraService = {
  async getAll() {
    const response = await api.get('/cameras');
    return response.data;
  },
  async getOne(id: string) {
    const response = await api.get(`/cameras/${id}`);
    return response.data;
  },
  async create(data: any) {
    const response = await api.post('/cameras', data);
    return response.data;
  },
  async update(id: string, data: any) {
    const response = await api.patch(`/cameras/${id}`, data);
    return response.data;
  },
  async delete(id: string) {
    const response = await api.delete(`/cameras/${id}`);
    return response.data;
  },

  // Stored Disks
  async getStoredDisks() {
    const response = await api.get('/cameras/stored-disks');
    return response.data;
  },
  async createStoredDisk(data: any) {
    const response = await api.post('/cameras/stored-disks', data);
    return response.data;
  },
  async updateStoredDisk(id: string, data: any) {
    const response = await api.patch(`/cameras/stored-disks/${id}`, data);
    return response.data;
  },
  async deleteStoredDisk(id: string) {
    const response = await api.delete(`/cameras/stored-disks/${id}`);
    return response.data;
  }
};
