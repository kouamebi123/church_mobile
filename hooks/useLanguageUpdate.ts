import { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Hook pour forcer le re-render des composants quand la langue change
 * Utilisez ce hook dans vos composants pour qu'ils se mettent à jour automatiquement
 */
export const useLanguageUpdate = () => {
  const { language } = useLanguage();
  const [updateKey, setUpdateKey] = useState(0);

  useEffect(() => {
    // Quand la langue change, incrémenter updateKey pour forcer le re-render
    setUpdateKey(prev => prev + 1);
  }, [language]);

  return updateKey;
};

