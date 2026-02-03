/**
 * Extrait un ID d'un objet (gère id et _id)
 * @param obj - L'objet contenant l'ID
 * @returns L'ID trouvé, ou null si aucun ID n'est trouvé
 */
export const getId = (obj: any): string | null => {
  if (!obj) return null;
  return obj.id || obj._id || null;
};

/**
 * Extrait l'ID d'une église (gère church_id, eglise_id, id et _id)
 * @param church - L'objet contenant l'ID de l'église
 * @returns L'ID de l'église trouvé, ou null si aucun ID n'est trouvé
 */
export const getChurchId = (church: any): string | null => {
  if (!church) return null;
  return church.church_id || church.eglise_id || church.id || church._id || null;
};

/**
 * Extrait l'ID de l'église locale d'un utilisateur
 * Gère les cas où eglise_locale est un objet ou un ID direct
 * @param user - L'objet utilisateur
 * @returns L'ID de l'église locale, ou null si aucune église n'est trouvée
 */
export const getUserChurchId = (user: any): string | null => {
  if (!user?.eglise_locale) return null;
  
  if (typeof user.eglise_locale === 'object') {
    return user.eglise_locale.id || user.eglise_locale._id || user.eglise_locale.church_id || user.eglise_locale.eglise_id || null;
  }
  
  return String(user.eglise_locale);
};

/**
 * Extrait l'ID d'une église depuis un objet réseau
 * Gère church_id et eglise_id, ainsi que les IDs imbriqués
 * @param network - L'objet réseau
 * @returns L'ID de l'église, ou null si aucune église n'est trouvée
 */
export const getNetworkChurchId = (network: any): string | null => {
  if (!network) return null;
  return network.church_id || network.eglise_id || getChurchId(network.eglise || network.church) || null;
};

/**
 * Vérifie si deux objets ont le même ID (gère id et _id)
 * @param obj1 - Premier objet
 * @param obj2 - Deuxième objet
 * @returns true si les IDs correspondent, false sinon
 */
export const isSameId = (obj1: any, obj2: any): boolean => {
  const id1 = getId(obj1);
  const id2 = getId(obj2);
  if (!id1 || !id2) return false;
  return String(id1) === String(id2);
};
