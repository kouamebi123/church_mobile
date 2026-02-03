/**
 * Extrait les données d'une réponse API
 * Gère les différentes structures possibles : response.data.data, response.data, ou response direct
 * @param response - La réponse de l'API
 * @param defaultValue - La valeur par défaut si aucune donnée n'est trouvée
 * @returns Les données extraites ou la valeur par défaut
 */
export const extractApiData = <T>(response: any, defaultValue: T): T => {
  if (response?.data?.data !== undefined) {
    return response.data.data;
  }
  if (response?.data !== undefined) {
    return response.data;
  }
  if (response !== undefined && response !== null) {
    return response;
  }
  return defaultValue;
};

/**
 * Extrait un tableau de données d'une réponse API
 * Gère les différentes structures possibles et s'assure que le résultat est un tableau
 * @param response - La réponse de l'API
 * @returns Un tableau de données, ou un tableau vide si aucune donnée valide n'est trouvée
 */
export const extractApiArray = <T>(response: any): T[] => {
  let data: any;
  
  if (response?.data?.data !== undefined) {
    data = response.data.data;
  } else if (response?.data !== undefined) {
    data = response.data;
  } else if (response !== undefined && response !== null) {
    data = response;
  } else {
    return [] as T[];
  }
  
  return (Array.isArray(data) ? data : []) as T[];
};

/**
 * Extrait un objet de données d'une réponse API
 * S'assure que le résultat est un objet (pas un tableau)
 * @param response - La réponse de l'API
 * @param defaultValue - La valeur par défaut si aucune donnée n'est trouvée
 * @returns Un objet de données, ou la valeur par défaut
 */
export const extractApiObject = <T extends Record<string, any>>(
  response: any,
  defaultValue: T
): T => {
  let data: any;
  
  if (response?.data?.data !== undefined) {
    data = response.data.data;
  } else if (response?.data !== undefined) {
    data = response.data;
  } else if (response !== undefined && response !== null) {
    data = response;
  } else {
    return defaultValue;
  }
  
  // S'assurer que c'est un objet et non un tableau
  if (Array.isArray(data)) {
    return defaultValue;
  }
  
  return typeof data === 'object' && data !== null ? data : defaultValue;
};
