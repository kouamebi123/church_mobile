import { apiService } from './apiService';

class PrevisionnelService {
  async create(previsionnelData: any) {
    const response = await apiService.previsionnels.create(previsionnelData);
    return response.data;
  }

  async getByNetwork(networkId: string, filters: any = {}) {
    const response = await apiService.previsionnels.getByNetwork(networkId, filters);
    return response.data;
  }

  async getById(id: string) {
    const response = await apiService.previsionnels.getById(id);
    return response.data;
  }

  async update(id: string, previsionnelData: any) {
    const response = await apiService.previsionnels.update(id, previsionnelData);
    return response.data;
  }

  async delete(id: string) {
    const response = await apiService.previsionnels.delete(id);
    return response.data;
  }

  async getStats(filters: any = {}) {
    const response = await apiService.previsionnels.getStats(filters);
    return response.data;
  }
}

export default new PrevisionnelService();

