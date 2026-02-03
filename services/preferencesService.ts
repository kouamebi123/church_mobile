import AsyncStorage from '@react-native-async-storage/async-storage';

const preferencesService = {
  getPreference: (key: string): any => {
    // Pour React Native, on utilise AsyncStorage de manière synchrone via une promesse
    // Mais pour la compatibilité, on retourne null et on charge via AsyncStorage.getItem
    return null;
  },

  setPreference: async (key: string, value: any): Promise<void> => {
    try {
      await AsyncStorage.setItem(`preference_${key}`, JSON.stringify(value));
    } catch (error) {
      console.error(`Erreur lors de la sauvegarde de la préférence ${key}:`, error);
    }
  },

  getPreferenceSync: async (key: string): Promise<any> => {
    try {
      const value = await AsyncStorage.getItem(`preference_${key}`);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Erreur lors de la récupération de la préférence ${key}:`, error);
      return null;
    }
  },
};

export default preferencesService;

