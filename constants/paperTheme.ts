import { MD3LightTheme } from 'react-native-paper';

/**
 * Thème personnalisé pour React Native Paper
 * Force toujours les couleurs claires, indépendamment du thème système
 */
export const customPaperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    // Couleurs principales
    primary: '#662d91',
    onPrimary: '#ffffff',
    primaryContainer: '#F5F3FF',
    onPrimaryContainer: '#662d91',
    
    // Couleurs secondaires
    secondary: '#9e005d',
    onSecondary: '#ffffff',
    secondaryContainer: '#F5F3FF',
    onSecondaryContainer: '#9e005d',
    
    // Couleurs de fond
    background: '#ffffff',
    onBackground: '#11181C',
    surface: '#ffffff',
    onSurface: '#11181C',
    surfaceVariant: '#f0f2f5',
    onSurfaceVariant: '#666666',
    
    // Couleurs d'erreur
    error: '#EF4444',
    onError: '#ffffff',
    errorContainer: '#FEE2E2',
    onErrorContainer: '#EF4444',
    
    // Couleurs de succès
    success: '#4CAF50',
    onSuccess: '#ffffff',
    
    // Couleurs de bordure et outline
    outline: '#d1d5db',
    outlineVariant: '#e0e0e0',
    
    // Couleurs d'élévation
    elevation: {
      level0: '#ffffff',
      level1: '#f5f5f5',
      level2: '#eeeeee',
      level3: '#e0e0e0',
      level4: '#bdbdbd',
      level5: '#9e9e9e',
    },
    
    // Couleurs de texte
    text: '#11181C',
    textSecondary: '#666666',
    
    // Couleurs d'icônes
    icon: '#662d91',
    iconSecondary: '#666666',
  },
};

