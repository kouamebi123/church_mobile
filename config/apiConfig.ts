// Configuration de l'API backend
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://churchbackend-production.up.railway.app";
export const API_URL = `${API_BASE_URL}/api`;

// URL de l'image par défaut
export const DEFAULT_PROFILE_IMAGE = `${API_BASE_URL}/Image_default.png`;

// Configuration pour les images
export const getImageUrl = (imagePath: string | null | undefined): string => {
  if (!imagePath) return '';
  // Si c'est déjà une URL complète (http/https), la retourner telle quelle
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  // Si c'est une image base64, la retourner telle quelle
  if (imagePath.startsWith('data:image/') || imagePath.startsWith('data:application/')) {
    return imagePath;
  }
  // Si c'est un blob URL, la retourner telle quelle
  if (imagePath.startsWith('blob:')) {
    return imagePath;
  }
  // Sinon, traiter comme un chemin relatif
  const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  // Ajouter un paramètre de cache-busting pour forcer le rechargement
  const url = `${API_BASE_URL}${path}`;
  const finalUrl = url.includes('?') ? `${url}&cb=${Date.now()}` : `${url}?cb=${Date.now()}`;
  
  return finalUrl;
};

