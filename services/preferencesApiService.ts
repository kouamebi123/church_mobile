import authAxios from './authService';

const preferencesApiService = {
  getPreferences: async () => {
    const response = await authAxios.get('/preferences');
    return response.data;
  },
  updatePreferences: async (preferences: any) => {
    const response = await authAxios.put('/preferences', preferences);
    return response.data;
  }
};

export default preferencesApiService;

