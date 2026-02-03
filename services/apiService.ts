import authAxios from './authService';
import axios from 'axios';
import { API_URL } from '../config/apiConfig';

// Instance axios publique pour les endpoints qui ne nécessitent pas d'authentification
const publicAxios = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Service API centralisé pour toutes les requêtes
export const apiService = {
  // Gestion des utilisateurs
  users: {
    getAll: (params?: any) => authAxios.get('/users', { params }),
    getById: (id: string) => authAxios.get(`/users/${id}`),
    create: (userData: any) => authAxios.post('/users', userData),
    update: (id: string, userData: any) => authAxios.put(`/users/${id}`, userData),
    updateProfile: (userData: any) => authAxios.put('/users/profile', userData),
    delete: (id: string) => authAxios.delete(`/users/${id}`),
    getStats: (params?: any) => authAxios.get('/users/stats', { params }),
    getRelations: (id: string) => authAxios.get(`/users/${id}/relations`),
    getAvailable: (params?: any) => authAxios.get('/users/available', { params }),
    updateQualification: (id: string, qualification: string) => authAxios.put(`/users/${id}/qualification`, { qualification }),
    resetPassword: (id: string, newPassword: string) => authAxios.post(`/users/${id}/reset-password`, { newPassword }),
    getUserNetwork: (id: string) => authAxios.get(`/users/${id}/network`),
    getUserSession: (id: string) => authAxios.get(`/users/${id}/session`),
    getGovernance: () => authAxios.get('/users/governance'),
    getNonIsoles: () => authAxios.get('/users/non-isoles'),
    getIsoles: () => authAxios.get('/users/isoles'),
    getRetired: () => authAxios.get('/users/retired'),
    getEvolution: (params?: any) => authAxios.get('/users/evolution', { params }),
    uploadProfileImage: (formData: FormData) => {
      // Pour React Native, axios détecte automatiquement FormData
      // Ne pas définir Content-Type, axios le fera avec le boundary approprié
      return authAxios.post('/users/profile/image', formData);
    },
    removeProfileImage: () => authAxios.delete('/users/profile/image'),
    uploadUserImage: (userId: string, formData: FormData) => {
      // Pour React Native, axios détecte automatiquement FormData
      // Ne pas définir Content-Type, axios le fera avec le boundary approprié
      return authAxios.post(`/users/${userId}/image`, formData);
    },
  },

  // Gestion des réseaux
  networks: {
    getAll: (params?: any) => authAxios.get('/networks', { params }),
    getById: (id: string) => authAxios.get(`/networks/${id}`),
    create: (networkData: any) => authAxios.post('/networks', networkData),
    update: (id: string, networkData: any) => authAxios.put(`/networks/${id}`, networkData),
    delete: (id: string) => authAxios.delete(`/networks/${id}`),
    getStats: (params?: any) => authAxios.get('/networks/stats', { params }),
    getStatsById: (id: string) => authAxios.get(`/networks/${id}/stats`),
    getQualificationStats: (params?: any) => authAxios.get('/networks/qualification-stats', { params }),
    getDepartmentInvolvement: (params?: any) => authAxios.get('/networks/department-involvement', { params }),
    getGroups: (id: string) => authAxios.get(`/networks/${id}/grs`),
    getPublicGroups: (id: string) => publicAxios.get(`/networks/public/${id}/groups`),
    getPublicNetworks: () => publicAxios.get('/networks/public'),
    getMembers: (id: string) => authAxios.get(`/networks/${id}/members`),
    getCompanions: (id: string) => authAxios.get(`/networks/${id}/companions`),
    addCompanion: (id: string, userId: string) => authAxios.post(`/networks/${id}/companions`, { user_id: userId }),
    removeCompanion: (id: string, companionId: string) => authAxios.delete(`/networks/${id}/companions/${companionId}`),
    getObjective: (id: string) => authAxios.get(`/networks/${id}/objective`),
    getObjectives: (id: string) => authAxios.get(`/networks/${id}/objectives`),
    createObjective: (id: string, objectiveData: any) => authAxios.post(`/networks/${id}/objectives`, objectiveData),
    updateObjective: (objectiveId: string, objectiveData: any) => authAxios.put(`/networks/objectives/${objectiveId}`, objectiveData),
    deleteObjective: (objectiveId: string) => authAxios.delete(`/networks/objectives/${objectiveId}`),
  },

  // Gestion des sessions
  sessions: {
    getAll: (params?: any) => authAxios.get('/sessions', { params }),
    getById: (id: string) => authAxios.get(`/sessions/${id}`),
    create: (sessionData: any) => authAxios.post('/sessions', sessionData),
    update: (id: string, sessionData: any) => authAxios.put(`/sessions/${id}`, sessionData),
    delete: (id: string) => authAxios.delete(`/sessions/${id}`),
    getStats: (params?: any) => authAxios.get('/sessions/stats', { params }),
    getStatsById: (id: string) => authAxios.get(`/sessions/${id}/stats`),
    getUnits: (id: string) => authAxios.get(`/sessions/${id}/units`)
  },

  // Gestion des églises
  churches: {
    getAll: () => authAxios.get('/churches'),
    getById: (id: string) => authAxios.get(`/churches/${id}`),
  },

  // Gestion des départements
  departments: {
    getAll: () => authAxios.get('/departments'),
    getById: (id: string) => authAxios.get(`/departments/${id}`),
    create: (departmentData: any) => authAxios.post('/departments', departmentData),
    update: (id: string, departmentData: any) => authAxios.put(`/departments/${id}`, departmentData),
    delete: (id: string) => authAxios.delete(`/departments/${id}`),
  },

  // Gestion des services/cultes
  services: {
    getAll: (params?: any) => authAxios.get('/services', { params }),
    getById: (id: string) => authAxios.get(`/services/${id}`),
    create: (serviceData: any) => authAxios.post('/services', serviceData),
    update: (id: string, serviceData: any) => authAxios.put(`/services/${id}`, serviceData),
    delete: (id: string) => authAxios.delete(`/services/${id}`),
    getStats: (params?: any) => authAxios.get('/services/stats', { params }),
    getByPeriod: (params?: any) => authAxios.get('/services/period', { params }),
  },

  // Gestion du carousel
  carousel: {
    getAll: () => authAxios.get('/carousel'),
  },

  // Statistiques générales
  stats: {
    getOverview: (params?: any) => authAxios.get('/stats', { params }),
    getNetworksEvolution: (params?: any) => authAxios.get('/stats/networks/evolution', { params }),
    getNetworksComparison: (params?: any) => {
      // Extraire years des params et les séparer en year1 et year2
      const { years, ...otherParams } = params || {};
      let queryParams = { ...otherParams };
      
      if (years) {
        const [year1, year2] = years.split(',');
        queryParams.year1 = year1;
        queryParams.year2 = year2;
      }
      
      return authAxios.get('/stats/networks/evolution/compare', { params: queryParams });
    },
  },

  // Gestion du calendrier
  calendar: {
    // Endpoints publics
    getPublicEvents: (params?: any) => authAxios.get('/calendar/public', { params }),
    getPublicEventsByMonth: (params?: any) => authAxios.get('/calendar/public/month', { params }),
    getPublicEventById: (id: string) => authAxios.get(`/calendar/public/${id}`),
    getPublicICSUrl: () => `${API_URL}/calendar/public.ics`,
    // Endpoints admin
    getAll: (params?: any) => authAxios.get('/calendar', { params }),
    getById: (id: string) => authAxios.get(`/calendar/${id}`),
    create: (eventData: any) => authAxios.post('/calendar', eventData),
    update: (id: string, eventData: any) => authAxios.put(`/calendar/${id}`, eventData),
    delete: (id: string) => authAxios.delete(`/calendar/${id}`),
  },

  // Gestion des paramètres de l'application
  appSettings: {
    get: () => publicAxios.get('/app-settings'),
    update: (settingsData: any) => authAxios.put('/app-settings', settingsData),
  },

  // Gestion du contact
  contact: {
    send: (messageData: any) => publicAxios.post('/contact', messageData),
    getAll: (params?: any) => authAxios.get('/contact', { params }),
    markAsRead: (id: string) => authAxios.put(`/contact/${id}/read`),
    delete: (id: string) => authAxios.delete(`/contact/${id}`),
  },

  // Gestion de la messagerie
  messages: {
    send: (messageData: any) => authAxios.post('/messages/send', messageData),
    getReceived: (params?: any) => authAxios.get('/messages/received', { params }),
    getSent: (params?: any) => authAxios.get('/messages/sent', { params }),
    getStats: () => authAxios.get('/messages/stats'),
    markAsRead: (messageId: string) => authAxios.put(`/messages/${messageId}/read`),
    acknowledge: (messageId: string) => authAxios.put(`/messages/${messageId}/acknowledge`),
    markMultipleAsRead: (messageIds: string[]) => authAxios.put('/messages/mark-multiple-read', { messageIds }),
    getConversations: () => authAxios.get('/messages/conversations'),
    getConversationHistory: (userId: string) => authAxios.get(`/messages/conversation/${userId}`),
    getUsers: (params?: any) => authAxios.get('/messages/users', { params }),
  },

  // Authentification (endpoints publics)
  auth: {
    forgotPassword: (email: string) => publicAxios.post('/auth/forgot-password', { email }),
    resetPassword: (token: string, newPassword: string) => publicAxios.post('/auth/reset-password', { token, newPassword })
  },

  // Gestion des groupes
  groups: {
    getAll: (params?: any) => authAxios.get('/groups', { params }),
    getById: (id: string) => authAxios.get(`/groups/${id}`),
    create: (groupData: any) => authAxios.post('/groups', groupData),
    update: (id: string, groupData: any) => authAxios.put(`/groups/${id}`, groupData),
    delete: (id: string) => authAxios.delete(`/groups/${id}`),
    getAvailableResponsables: (params?: any) => authAxios.get('/groups/available-responsables', { params }),
    addMember: (groupId: string, memberData: any) => authAxios.post(`/groups/${groupId}/members`, memberData),
    updateMember: (groupId: string, memberId: string, memberData: any) => authAxios.put(`/groups/${groupId}/members/${memberId}`, memberData),
    removeMember: (groupId: string, memberId: string) => authAxios.delete(`/groups/${groupId}/members/${memberId}`),
  },

  // Gestion des prévisionnels
  previsionnels: {
    create: (previsionnelData: any) => authAxios.post('/previsionnels', previsionnelData),
    getByNetwork: (networkId: string, filters?: any) => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.type_culte) params.append('type_culte', filters.type_culte);
      if (filters?.date_from) params.append('date_from', filters.date_from);
      if (filters?.date_to) params.append('date_to', filters.date_to);
      return authAxios.get(`/previsionnels/network/${networkId}?${params.toString()}`);
    },
    getById: (id: string) => authAxios.get(`/previsionnels/${id}`),
    update: (id: string, previsionnelData: any) => authAxios.put(`/previsionnels/${id}`, previsionnelData),
    delete: (id: string) => authAxios.delete(`/previsionnels/${id}`),
    getStats: (filters?: any) => {
      const params = new URLSearchParams();
      if (filters?.church_id) params.append('church_id', filters.church_id);
      if (filters?.network_id) params.append('network_id', filters.network_id);
      if (filters?.type_culte) params.append('type_culte', filters.type_culte);
      if (filters?.date_from) params.append('date_from', filters.date_from);
      if (filters?.date_to) params.append('date_to', filters.date_to);
      return authAxios.get(`/previsionnels/stats?${params.toString()}`);
    },
  },

  // Gestion de l'assistance
  assistance: {
    create: (assistanceData: any) => authAxios.post('/assistance', assistanceData),
    getStats: (filters?: any) => {
      const params = new URLSearchParams();
      Object.keys(filters || {}).forEach(key => {
        if (filters[key]) {
          params.append(key, filters[key]);
        }
      });
      return authAxios.get(`/assistance/stats?${params.toString()}`);
    },
    getById: (id: string) => authAxios.get(`/assistance/${id}`),
    update: (id: string, assistanceData: any) => authAxios.put(`/assistance/${id}`, assistanceData),
    delete: (id: string) => authAxios.delete(`/assistance/${id}`),
    getByNetwork: (networkId: string, filters?: any) => {
      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.type_culte) params.append('type_culte', filters.type_culte);
      if (filters?.date_from) params.append('date_from', filters.date_from);
      if (filters?.date_to) params.append('date_to', filters.date_to);
      return authAxios.get(`/assistance/network/${networkId}?${params.toString()}`);
    },
  },

  // Gestion des témoignages
  testimonies: {
    // Endpoints publics
    getChurches: () => publicAxios.get('/testimonies/churches'),
    getNetworks: (churchId: string) => publicAxios.get(`/testimonies/networks/${churchId}`),
    getSections: (churchId: string) => publicAxios.get(`/testimonies/sections/${churchId}`),
    getCategories: () => publicAxios.get('/testimonies/categories'),
    getApproved: (params?: any) => publicAxios.get('/testimonies/approved', { params }),
    create: (testimonyData: any, formData?: FormData) => {
      if (formData) {
        return publicAxios.post('/testimonies', formData);
      }
      return publicAxios.post('/testimonies', testimonyData);
    },
    // Endpoints admin
    getAll: (params?: any) => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.churchId) queryParams.append('churchId', params.churchId);
      if (params?.search) queryParams.append('search', params.search);
      if (params?.category) queryParams.append('category', params.category);
      if (params?.isRead !== undefined) queryParams.append('isRead', params.isRead.toString());
      if (params?.wantsToTestify !== undefined) queryParams.append('wantsToTestify', params.wantsToTestify.toString());
      return authAxios.get(`/testimonies/admin/all?${queryParams.toString()}`);
    },
    getForCulte: (params?: any) => {
      const queryParams = new URLSearchParams();
      if (params?.churchId) queryParams.append('churchId', params.churchId);
      if (params?.isConfirmed !== undefined) queryParams.append('isConfirmed', params.isConfirmed.toString());
      if (params?.hasTestified !== undefined) queryParams.append('hasTestified', params.hasTestified.toString());
      return authAxios.get(`/testimonies/admin/culte/${params?.churchId || ''}?${queryParams.toString()}`);
    },
    getById: (id: string) => authAxios.get(`/testimonies/${id}`),
    delete: (id: string) => authAxios.delete(`/testimonies/${id}`),
    markAsRead: (id: string) => authAxios.put(`/testimonies/${id}/mark-read`),
    addNote: (id: string, note: string) => authAxios.put(`/testimonies/${id}/note`, { note }),
    confirmForCulte: (id: string, data: { confirmed: boolean }) => authAxios.put(`/testimonies/${id}/confirm-culte`, data),
    markAsTestified: (id: string) => authAxios.put(`/testimonies/${id}/mark-testified`),
  },

  // Gestion des données de référence
  referenceData: {
    getAll: (model: string, params?: any) => authAxios.get(`/reference-data/${model}`, { params }),
    getById: (model: string, id: string) => authAxios.get(`/reference-data/${model}/${id}`),
    create: (model: string, data: any) => authAxios.post(`/reference-data/${model}`, data),
    update: (model: string, id: string, data: any) => authAxios.put(`/reference-data/${model}/${id}`, data),
    delete: (model: string, id: string) => authAxios.delete(`/reference-data/${model}/${id}`),
    serviceTypes: {
      getAll: (params?: any) => authAxios.get('/reference-data/service-types', { params }),
      getAllAdmin: (params?: any) => authAxios.get('/reference-data/service-types/all', { params }),
      getById: (id: string) => authAxios.get(`/reference-data/service-types/${id}`),
      create: (data: any) => authAxios.post('/reference-data/service-types', data),
      update: (id: string, data: any) => authAxios.put(`/reference-data/service-types/${id}`, data),
      delete: (id: string) => authAxios.delete(`/reference-data/service-types/${id}`),
    },
    speakers: {
      getAll: (params?: any) => authAxios.get('/reference-data/speakers', { params }),
      getAllAdmin: (params?: any) => authAxios.get('/reference-data/speakers/all', { params }),
      getById: (id: string) => authAxios.get(`/reference-data/speakers/${id}`),
      create: (data: any) => authAxios.post('/reference-data/speakers', data),
      update: (id: string, data: any) => authAxios.put(`/reference-data/speakers/${id}`, data),
      delete: (id: string) => authAxios.delete(`/reference-data/speakers/${id}`),
    },
    testimonyCategories: {
      getAll: (params?: any) => authAxios.get('/reference-data/testimony-categories', { params }),
      getAllAdmin: (params?: any) => authAxios.get('/reference-data/testimony-categories/all', { params }),
      getById: (id: string) => authAxios.get(`/reference-data/testimony-categories/${id}`),
      create: (data: any) => authAxios.post('/reference-data/testimony-categories', data),
      update: (id: string, data: any) => authAxios.put(`/reference-data/testimony-categories/${id}`, data),
      delete: (id: string) => authAxios.delete(`/reference-data/testimony-categories/${id}`),
    },
    eventTypes: {
      getAll: (params?: any) => authAxios.get('/reference-data/event-types', { params }),
      getAllAdmin: (params?: any) => authAxios.get('/reference-data/event-types/all', { params }),
      getById: (id: string) => authAxios.get(`/reference-data/event-types/${id}`),
      create: (data: any) => authAxios.post('/reference-data/event-types', data),
      update: (id: string, data: any) => authAxios.put(`/reference-data/event-types/${id}`, data),
      delete: (id: string) => authAxios.delete(`/reference-data/event-types/${id}`),
    },
  },

  // Gestion des unités
  units: {
    getAll: (params?: any) => authAxios.get('/units', { params }),
    getById: (id: string) => authAxios.get(`/units/${id}`),
    create: (unitData: any) => authAxios.post('/units', unitData),
    update: (id: string, unitData: any) => authAxios.put(`/units/${id}`, unitData),
    delete: (id: string) => authAxios.delete(`/units/${id}`),
    addMember: (unitId: string, memberData: any) => authAxios.post(`/units/${unitId}/members`, memberData),
    removeMember: (unitId: string, memberId: string) => authAxios.delete(`/units/${unitId}/members/${memberId}`),
  },

  // Gestion de la chaîne d'impact
  chaineImpact: {
    get: (params?: any) => authAxios.get('/chaine-impact', { params }),
    update: () => authAxios.post('/chaine-impact/update'),
    getByUser: (userId: string) => authAxios.get(`/chaine-impact/user/${userId}`),
    delete: (churchId: string) => authAxios.delete(`/chaine-impact/${churchId}`),
  },

  // Gestion des préférences
  preferences: {
    get: () => authAxios.get('/preferences'),
    update: (preferencesData: any) => authAxios.put('/preferences', preferencesData),
    updateEmail: (emailPreferences: any) => authAxios.put('/preferences/email', emailPreferences),
  },
};

export default apiService;

