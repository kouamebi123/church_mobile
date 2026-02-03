import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/apiConfig';

// Configuration axios avec intercepteurs
const authAxios: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Intercepteur pour ajouter automatiquement le token
authAxios.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Ne pas écraser Content-Type si c'est FormData (multipart/form-data)
    // axios le gérera automatiquement
    if (config.data instanceof FormData) {
      // Supprimer Content-Type pour laisser axios le définir avec le boundary
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur de réponse
authAxios.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Gestion des erreurs d'authentification
    if (error.response?.status === 401) {
      const errorMessage = error.response?.data?.message || '';
      const errorCode = error.response?.data?.code || '';
      
      // Si c'est une erreur de permissions, ne pas déconnecter
      if (errorMessage.includes('droits') || 
          errorMessage.includes('autorisé') || 
          errorMessage.includes('permissions') ||
          errorMessage.includes('église')) {
        return Promise.reject(error);
      }
      
      // Si c'est une erreur CSRF expiré ou session expirée
      if (errorCode === 'CSRF_TOKEN_EXPIRED' || errorMessage.includes('Session expirée')) {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('csrfToken');
        // Déclencher la déconnexion via un événement
        return Promise.reject(error);
      }
      
      // Si c'est vraiment une erreur d'authentification
      if (errorMessage.includes('token') || 
          errorMessage.includes('expiré') || 
          errorMessage.includes('Non autorisé') ||
          errorMessage.includes('authentifié')) {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('csrfToken');
        return Promise.reject(error);
      }
    }
    
    // Gestion des erreurs 429 (trop de requêtes)
    // Ne pas déconnecter l'utilisateur pour une erreur 429, juste rejeter l'erreur
    // L'utilisateur peut réessayer après un délai
    if (error.response?.status === 429) {
      return Promise.reject(error);
    }
    
    return Promise.reject(error);
  }
);

export const authService = {
  // Récupérer le token depuis AsyncStorage
  getToken: async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem('token');
    } catch (error) {
      console.error('Erreur lors de la récupération du token:', error);
      return null;
    }
  },

  // Stocker le token
  setToken: async (token: string): Promise<void> => {
    try {
      await AsyncStorage.setItem('token', token);
    } catch (error) {
      console.error('Erreur lors du stockage du token:', error);
    }
  },

  // Supprimer le token
  removeToken: async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('csrfToken');
    } catch (error) {
      console.error('Erreur lors de la suppression du token:', error);
    }
  },

  // Vérifier si l'utilisateur est authentifié
  isAuthenticated: async (): Promise<boolean> => {
    const token = await authService.getToken();
    return !!token;
  },

  // Connexion
  login: async (credentials: { pseudo: string; password: string }) => {
    const response = await authAxios.post('/auth/login', credentials);
    if (response.data.token) {
      await authService.setToken(response.data.token);
    }
    return response.data;
  },

  // Inscription
  register: async (userData: any) => {
    const response = await authAxios.post('/auth/register', userData);
    if (response.data.token) {
      await authService.setToken(response.data.token);
    }
    return response.data;
  },

  // Récupérer les informations de l'utilisateur connecté
  getMe: async () => {
    const response = await authAxios.get('/auth/me');
    return response.data;
  },

  // Mettre à jour le profil
  updateProfile: async (userData: any) => {
    const response = await authAxios.put('/users/profile', userData);
    return response.data;
  },

  // Mettre à jour le mot de passe
  updatePassword: async (passwordData: { currentPassword: string; newPassword: string }) => {
    const response = await authAxios.put('/auth/updatepassword', passwordData);
    return response.data;
  },

  // Déconnexion
  logout: async () => {
    await AsyncStorage.clear();
  },

  // Mot de passe oublié
  forgotPassword: async (email: string) => {
    const response = await authAxios.post('/auth/forgot-password', { email });
    return response.data;
  },

  // Réinitialiser le mot de passe
  resetPassword: async (token: string, newPassword: string) => {
    const response = await authAxios.post('/auth/reset-password', { token, newPassword });
    return response.data;
  }
};

export default authAxios;

