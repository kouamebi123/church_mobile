import AsyncStorage from '@react-native-async-storage/async-storage';
import fr from '../assets/i18n/fr.json';
import en from '../assets/i18n/en.json';

class I18nService {
  private translations: { [key: string]: any };
  private currentLanguage: string;
  private fallbackLanguage: string = 'fr';

  constructor() {
    this.translations = {
      fr,
      en
    };
    this.currentLanguage = 'fr';
  }

  /**
   * Initialise la langue depuis les préférences utilisateur si l'utilisateur est connecté
   */
  async initWithUserLanguage(): Promise<string> {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        try {
          // Importer dynamiquement le service de préférences
          const { default: preferencesApiService } = await import('./preferencesApiService');
          const apiPreferences = await preferencesApiService.getPreferences();
          const userLanguage = apiPreferences?.data?.language;
          
          if (userLanguage && this.isLanguageSupported(userLanguage)) {
            this.setLanguage(userLanguage);
            return userLanguage;
          }
        } catch (error) {
          console.debug('Impossible de charger la langue depuis l\'API, utilisation de la langue stockée');
        }
      }
      
      const storedLanguage = await this.getStoredLanguage();
      this.setLanguage(storedLanguage || this.fallbackLanguage);
      return storedLanguage || this.fallbackLanguage;
    } catch (error) {
      console.warn('Erreur lors de l\'initialisation de la langue utilisateur:', error);
      const storedLanguage = await this.getStoredLanguage();
      this.setLanguage(storedLanguage || this.fallbackLanguage);
      return storedLanguage || this.fallbackLanguage;
    }
  }

  /**
   * Initialise le service i18n
   */
  init() {
    this.getStoredLanguage().then(language => {
      this.setLanguage(language || this.fallbackLanguage);
    });
  }

  /**
   * Récupère la langue stockée dans AsyncStorage
   */
  async getStoredLanguage(): Promise<string> {
    try {
      return (await AsyncStorage.getItem('user_language')) || 'fr';
    } catch (error) {
      console.warn('Impossible de récupérer la langue depuis AsyncStorage:', error);
      return 'fr';
    }
  }

  /**
   * Stocke la langue dans AsyncStorage
   */
  async setStoredLanguage(language: string): Promise<void> {
    try {
      await AsyncStorage.setItem('user_language', language);
    } catch (error) {
      console.warn('Impossible de stocker la langue dans AsyncStorage:', error);
    }
  }

  /**
   * Vérifie si une langue est supportée
   */
  isLanguageSupported(language: string): boolean {
    return language in this.translations;
  }

  /**
   * Définit la langue actuelle
   */
  async setLanguage(language: string): Promise<void> {
    if (this.isLanguageSupported(language)) {
      this.currentLanguage = language;
      await this.setStoredLanguage(language);
    } else {
      console.warn(`Langue non supportée: ${language}, utilisation de la langue par défaut`);
      this.currentLanguage = this.fallbackLanguage;
    }
  }

  /**
   * Récupère la langue actuelle
   */
  getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * Traduit une clé
   */
  t(key: string, params?: { [key: string]: any }): string {
    const keys = key.split('.');
    let value: any = this.translations[this.currentLanguage];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Essayer avec la langue de fallback
        value = this.translations[this.fallbackLanguage];
        for (const fallbackKey of keys) {
          if (value && typeof value === 'object' && fallbackKey in value) {
            value = value[fallbackKey];
          } else {
            return key; // Retourner la clé si la traduction n'existe pas
          }
        }
        break;
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    // Remplacer les paramètres
    if (params) {
      return this.replaceParams(value, params);
    }

    return value;
  }

  /**
   * Remplace les paramètres dans une chaîne
   */
  private replaceParams(text: string, params: { [key: string]: any }): string {
    let result = text;
    for (const [key, value] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }
    return result;
  }
}

const i18nService = new I18nService();
export default i18nService;

