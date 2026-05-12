import api from './api';

export const inventoryService = {
  async getAllAssets() {
    const response = await api.get('/inventory/assets');
    return response.data;
  },

  async createAsset(assetData: any) {
    const response = await api.post('/inventory/assets', assetData);
    return response.data;
  },

  async getStats() {
    const response = await api.get('/inventory/stats');
    return response.data;
  },

  async updateAsset(id: string, assetData: any) {
    const response = await api.patch(`/inventory/assets/${id}`, assetData);
    return response.data;
  },
  async deleteAsset(id: string) {
    const response = await api.delete(`/inventory/assets/${id}`);
    return response.data;
  },
  async getCategories() {
    const response = await api.get('/inventory/categories');
    return response.data;
  },
  async getSubcategories(categoryId?: string) {
    const response = await api.get('/inventory/subcategories', { params: { categoryId } });
    return response.data;
  }
};
