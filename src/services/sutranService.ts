import api from './api';

export const sutranService = {
  async getAll() {
    const response = await api.get('/sutran/visits');
    return response.data;
  },

  async delete(id: string) {
    const response = await api.delete(`/sutran/visits/${id}`);
    return response.data;
  }
};
