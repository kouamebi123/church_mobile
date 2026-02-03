import { apiService } from './apiService';

class AssistanceService {
  async create(assistanceData: any) {
    const response = await apiService.assistance.create(assistanceData);
    return response.data;
  }

  async getStats(filters: any = {}) {
    const response = await apiService.assistance.getStats(filters);
    return response.data;
  }

  async getById(id: string) {
    const response = await apiService.assistance.getById(id);
    return response.data;
  }

  async update(id: string, assistanceData: any) {
    const response = await apiService.assistance.update(id, assistanceData);
    return response.data;
  }

  async delete(id: string) {
    const response = await apiService.assistance.delete(id);
    return response.data;
  }
}

export default new AssistanceService();

