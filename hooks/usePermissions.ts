import { useSelector } from 'react-redux';
import { RootState } from '../store';

export const usePermissions = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  if (!user) {
    return {
      isAdmin: false,
      isSuperAdmin: false,
      isManager: false,
      isCollecteurReseaux: false,
      isCollecteurCulte: false,
      isSuperviseur: false,
    };
  }

  // Normalisation des rôles pour accepter les deux formats (backend Prisma et ancien)
  const normalizeRole = (role: string | null | undefined): string | null => {
    if (!role) return null;
    const roleStr = role.toString().toUpperCase();
    // Mapping des rôles Prisma vers l'ancien format
    const roleMap: Record<string, string> = {
      'SUPER_ADMIN': 'SUPER_ADMIN',
      'COLLECTEUR_RESEAUX': 'COLLECTEUR_RESEAUX',
      'COLLECTEUR_CULTE': 'COLLECTEUR_CULTE'
    };
    return roleMap[roleStr] || roleStr;
  };

  const normalizedRole = normalizeRole(user.current_role || user.role);

  const isAdmin = normalizedRole === 'ADMIN';
  const isSuperAdmin = normalizedRole === 'SUPER_ADMIN';
  const isManager = normalizedRole === 'MANAGER';
  const isCollecteurReseaux = normalizedRole === 'COLLECTEUR_RESEAUX';
  const isCollecteurCulte = normalizedRole === 'COLLECTEUR_CULTE';
  const isSuperviseur = normalizedRole === 'SUPERVISEUR';

  return {
    isAdmin,
    isSuperAdmin,
    isManager,
    isCollecteurReseaux,
    isCollecteurCulte,
    isSuperviseur,
  };
};

