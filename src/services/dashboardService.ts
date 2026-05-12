import api from './api';

export const dashboardService = {
  async getQuickStats() {
    const response = await api.get('/dashboard/stats');
    return response.data;
  }
};
