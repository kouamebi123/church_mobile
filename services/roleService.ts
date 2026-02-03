import authAxios from './authService';

const roleService = {
  // Obtenir les rôles disponibles pour l'utilisateur
  getAvailableRoles: async () => {
    try {
      const response = await authAxios.get('/roles/available-roles');
      return response;
    } catch (error) {
      throw error;
    }
  },

  // Changer de rôle
  changeRole: async (role: string) => {
    try {
      const response = await authAxios.post('/roles/change-role', { role });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Obtenir les rôles d'un utilisateur spécifique
  getUserRoles: async (userId: string) => {
    try {
      const response = await authAxios.get(`/roles/user/${userId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default roleService;

