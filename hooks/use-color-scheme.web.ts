import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  // Tous les hooks doivent être appelés avant tout retour conditionnel
  const [hasHydrated, setHasHydrated] = useState(false);
  const colorScheme = useRNColorScheme();

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Retour conditionnel APRÈS tous les hooks
  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
