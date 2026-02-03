import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../../services/authService';

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { pseudo: string; password: string }, thunkAPI) => {
    try {
      const response = await authService.login(credentials);
      return response;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response?.data || error);
    }
  }
);

export const getMe = createAsyncThunk(
  'auth/getMe',
  async (_, thunkAPI) => {
    try {
      const response = await authService.getMe();
      return response;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response?.data || error);
    }
  }
);

// Initialiser l'état depuis AsyncStorage
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, thunkAPI) => {
    try {
      const token = await authService.getToken();
      if (token) {
        // Si on a un token, récupérer les infos utilisateur
        try {
          const response = await authService.getMe();
          return { token, user: response.data || response };
        } catch (error) {
          // Si getMe échoue, le token est invalide
          await authService.removeToken();
          return { token: null, user: null };
        }
      }
      return { token: null, user: null };
    } catch (error: any) {
      // En cas d'erreur, nettoyer le token
      await authService.removeToken();
      return { token: null, user: null };
    }
  }
);

export const updateUserProfile = createAsyncThunk(
  'auth/updateProfile',
  async (userData: any, thunkAPI) => {
    try {
      const response = await authService.updateProfile(userData);
      return response;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response?.data || error);
    }
  }
);

// État initial - sera mis à jour par initializeAuth
const initialState = {
  user: null as any,
  token: null as string | null,
  isAuthenticated: false,
  isLoading: true, // Commencer par true pour vérifier le token
  error: null as string | null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      authService.logout();
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Initialize Auth
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.token && action.payload.user) {
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.token = action.payload.token;
        } else {
          state.isAuthenticated = false;
          state.user = null;
          state.token = null;
        }
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      })
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        const payload = action.payload;
        
        // Gérer différentes structures de réponse
        // Le token devrait déjà être dans payload.token car authService.login le stocke
        if (payload.user && payload.token) {
          state.isAuthenticated = true;
          state.user = payload.user;
          state.token = payload.token;
        } else if (payload.data) {
          // Si la réponse est dans data
          state.isAuthenticated = true;
          state.user = payload.data.user || payload.data;
          state.token = payload.data.token || payload.token;
        } else {
          // Structure directe - le token devrait être dans payload.token
          state.isAuthenticated = true;
          state.user = payload.user || payload;
          state.token = payload.token;
        }
        
        // S'assurer que le token est bien défini
        if (!state.token) {
          console.warn('Token manquant après connexion, récupération depuis AsyncStorage...');
          // Le token devrait déjà être dans AsyncStorage grâce à authService.login
        }
      })
      .addCase(login.rejected, (state, action: any) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Une erreur est survenue';
      })
      // Get Me
      .addCase(getMe.pending, (state) => {
        // Ne pas mettre isLoading à true si on est déjà authentifié
        // Cela évite les redirections inutiles pendant les mises à jour
        if (!state.isAuthenticated) {
          state.isLoading = true;
        }
        state.error = null;
      })
      .addCase(getMe.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        // Le token devrait déjà être dans l'état après le login
        // Gérer différentes structures de réponse
        const payload = action.payload;
        let newUser = null;
        if (payload.data) {
          newUser = payload.data;
        } else if (payload.user) {
          newUser = payload.user;
        } else if (payload) {
          newUser = payload;
        }
        // S'assurer que user n'est jamais null/undefined
        // Garder l'ancien user si la nouvelle valeur est invalide
        if (newUser && (newUser.id || newUser._id)) {
          state.user = newUser;
        } else {
          console.warn('getMe: received invalid user data, keeping existing user');
          // Garder l'ancien user si les nouvelles données sont invalides
          if (!state.user) {
            console.error('getMe: no existing user to fall back to');
          }
        }
      })
      .addCase(getMe.rejected, (state, action: any) => {
        state.isLoading = false;
        // Ne déconnecter que si c'est vraiment une erreur d'authentification
        const errorMessage = action.payload?.message || '';
        const errorCode = action.payload?.code || '';
        // Si c'est une erreur de permissions ou autre, ne pas déconnecter
        if (errorMessage.includes('droits') || 
            errorMessage.includes('autorisé') || 
            errorMessage.includes('permissions') ||
            errorCode === 'FORBIDDEN') {
          // Ne pas déconnecter, juste marquer l'erreur
          state.error = errorMessage;
          return;
        }
        // Seulement déconnecter si c'est vraiment une erreur d'authentification
        if (errorMessage.includes('token') || 
            errorMessage.includes('expiré') || 
            errorMessage.includes('Non autorisé') ||
            errorMessage.includes('authentifié') ||
            action.payload?.status === 401) {
          state.isAuthenticated = false;
          state.user = null;
          state.token = null;
          authService.removeToken();
        } else {
          // Autre erreur, ne pas déconnecter
          state.error = errorMessage;
        }
      })
      // Update Profile
      .addCase(updateUserProfile.pending, (state) => {
        // Ne pas mettre isLoading à true si on est déjà authentifié
        // Cela évite les redirections inutiles pendant les mises à jour
        if (!state.isAuthenticated) {
          state.isLoading = true;
        }
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        // Gérer différentes structures de réponse comme dans getMe
        const payload = action.payload;
        let updatedUser = null;
        if (payload.data) {
          updatedUser = payload.data;
        } else if (payload.user) {
          updatedUser = payload.user;
        } else if (payload) {
          updatedUser = payload;
        }
        
        // Fusionner les nouvelles données avec les anciennes pour préserver available_roles et role_assignments
        // Si le backend ne retourne pas ces champs, on les garde depuis l'état actuel
        if (updatedUser && (updatedUser.id || updatedUser._id)) {
          state.user = {
            ...state.user, // Préserver les données existantes (available_roles, role_assignments, etc.)
            ...updatedUser, // Mettre à jour avec les nouvelles données
            // S'assurer que available_roles et role_assignments sont préservés s'ils ne sont pas dans la réponse
            available_roles: updatedUser.available_roles || state.user?.available_roles || [],
            role_assignments: updatedUser.role_assignments || state.user?.role_assignments || [],
          };
        } else {
          console.warn('updateUserProfile: received invalid user data, keeping existing user');
          // Si les données sont invalides, garder l'utilisateur actuel
          if (!state.user) {
            console.error('updateUserProfile: no existing user to fall back to');
          }
        }
      })
      .addCase(updateUserProfile.rejected, (state, action: any) => {
        state.isLoading = false;
        state.error = action.payload?.message || 'Erreur de mise à jour du profil';
        // Ne pas mettre isAuthenticated à false en cas d'erreur de mise à jour
        // L'utilisateur reste connecté même si la mise à jour échoue
      });
  }
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;

