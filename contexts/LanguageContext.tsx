import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import i18nService from '../services/i18nService';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => Promise<void>;
  t: (key: string, params?: { [key: string]: any }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<string>(i18nService.getCurrentLanguage());
  const [updateTrigger, setUpdateTrigger] = useState(0);

  // Initialiser la langue au démarrage
  useEffect(() => {
    const initLanguage = async () => {
      const currentLang = await i18nService.getStoredLanguage();
      setLanguageState(currentLang || 'fr');
    };
    initLanguage();
  }, []);

  const setLanguage = React.useCallback(async (lang: string) => {
    await i18nService.setLanguage(lang);
    setLanguageState(lang);
    // Forcer le re-render de tous les composants qui utilisent ce contexte
    setUpdateTrigger(prev => prev + 1);
  }, []);

  // Créer une fonction t stable qui utilise la langue actuelle
  const t = React.useCallback((key: string, params?: { [key: string]: any }) => {
    return i18nService.t(key, params);
  }, [language]); // Dépendre de language pour se mettre à jour quand la langue change

  const contextValue = React.useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t]
  );

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

