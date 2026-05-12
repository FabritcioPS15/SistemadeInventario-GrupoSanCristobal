import api from './api';

export const userService = {
  async getAll() {
    const response = await api.get('/users');
    return response.data;
  },
  async getOne(id: string) {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  async create(data: any) {
    const response = await api.post('/users', data);
    return response.data;
  },
  async update(id: string, data: any) {
    const response = await api.patch(`/users/${id}`, data);
    return response.data;
  },
  async delete(id: string) {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  }
};
