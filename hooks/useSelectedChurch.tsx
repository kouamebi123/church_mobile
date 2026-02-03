import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { apiService } from '../services/apiService';

interface Church {
  id?: string;
  _id?: string;
  nom: string;
  [key: string]: any;
}

interface SelectedChurchContextType {
  selectedChurch: Church | null;
  churches: Church[];
  changeSelectedChurch: (churchId: string | null) => Promise<void>;
  loading: boolean;
}

const SelectedChurchContext = createContext<SelectedChurchContextType | undefined>(undefined);

export const SelectedChurchProvider = ({ children }: { children: ReactNode }) => {
  // Tous les hooks doivent être appelés avant tout retour conditionnel
  const { user } = useSelector((state: RootState) => state.auth);
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChurches();
  }, []);

  useEffect(() => {
    if (user && churches.length > 0) {
      initializeSelectedChurch();
    }
  }, [user, churches]);

  const loadChurches = async () => {
    try {
      const response = await apiService.churches.getAll();
      const data = response.data?.data || response.data || [];
      setChurches(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erreur lors du chargement des églises:', error);
      setChurches([]);
    } finally {
      setLoading(false);
    }
  };

  const initializeSelectedChurch = async () => {
    try {
      // Récupérer l'église sauvegardée
      const savedChurchId = await AsyncStorage.getItem('selectedChurchId');
      
      if (savedChurchId) {
        const church = churches.find(
          (c) => (c.id || c._id) === savedChurchId
        );
        if (church) {
          setSelectedChurch(church);
          return;
        }
      }

      // Sinon, utiliser l'église de l'utilisateur
      if (user?.eglise_locale) {
        const userChurchId = typeof user.eglise_locale === 'object'
          ? user.eglise_locale.id || user.eglise_locale._id
          : user.eglise_locale;

        const church = churches.find(
          (c) => (c.id || c._id) === userChurchId
        );
        if (church) {
          setSelectedChurch(church);
          await AsyncStorage.setItem('selectedChurchId', userChurchId);
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de l\'église sélectionnée:', error);
    }
  };

  const changeSelectedChurch = async (churchId: string | null) => {
    try {
      if (churchId) {
        const church = churches.find((c) => (c.id || c._id) === churchId);
        if (church) {
          setSelectedChurch(church);
          await AsyncStorage.setItem('selectedChurchId', churchId);
        }
      } else {
        setSelectedChurch(null);
        await AsyncStorage.removeItem('selectedChurchId');
      }
    } catch (error) {
      console.error('Erreur lors du changement d\'église:', error);
    }
  };

  return (
    <SelectedChurchContext.Provider
      value={{
        selectedChurch,
        churches,
        changeSelectedChurch,
        loading,
      }}
    >
      {children}
    </SelectedChurchContext.Provider>
  );
};

export const useSelectedChurch = () => {
  const context = useContext(SelectedChurchContext);
  if (context === undefined) {
    throw new Error('useSelectedChurch must be used within a SelectedChurchProvider');
  }
  return context;
};

