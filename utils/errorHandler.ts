import { Alert } from 'react-native';
import i18nService from '../services/i18nService';

/**
 * Extrait le message d'erreur d'une réponse API ou d'une exception
 * @param error - L'erreur à traiter
 * @param defaultKey - La clé de traduction par défaut si aucune erreur spécifique n'est trouvée
 * @returns Le message d'erreur formaté
 */
export const handleApiError = (error: any, defaultKey: string): string => {
  // Gestion des erreurs HTTP spécifiques
  if (error.response?.status === 400) {
    return i18nService.t('errors.api.invalidData') || i18nService.t('errors.validation.validation400');
  } else if (error.response?.status === 500) {
    return i18nService.t('errors.api.serverError') || i18nService.t('errors.server.internal');
  } else if (error.response?.status === 401) {
    return i18nService.t('errors.authentication.title') || i18nService.t('errors.auth401');
  } else if (error.response?.status === 403) {
    return i18nService.t('errors.authorization') || i18nService.t('errors.permission403');
  } else if (error.response?.status === 404) {
    return i18nService.t('errors.notFound404') || i18nService.t('errors.notFound404');
  } else if (error.response?.status === 429) {
    return i18nService.t('errors.http.429') || i18nService.t('errors.tooManyRequests');
  }
  
  // Message d'erreur spécifique du backend
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  // Message d'erreur de l'exception
  if (error.message) {
    return error.message;
  }
  
  // Message par défaut
  return i18nService.t(defaultKey) || 'Une erreur est survenue';
};

/**
 * Affiche une alerte avec le message d'erreur
 * @param error - L'erreur à traiter
 * @param defaultKey - La clé de traduction par défaut
 */
export const showApiError = (error: any, defaultKey: string): void => {
  const errorMessage = handleApiError(error, defaultKey);
  Alert.alert(i18nService.t('errors.error'), errorMessage);
};

/**
 * Extrait le message d'erreur sans afficher d'alerte (pour usage personnalisé)
 * @param error - L'erreur à traiter
 * @param defaultKey - La clé de traduction par défaut
 * @returns Le message d'erreur formaté
 */
export const getApiErrorMessage = (error: any, defaultKey: string): string => {
  return handleApiError(error, defaultKey);
};
