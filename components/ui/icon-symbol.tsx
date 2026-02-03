// Utilisation d'Ionicons pour un style plus moderne

import Ionicons from '@expo/vector-icons/Ionicons';
import { SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<string, ComponentProps<typeof Ionicons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Mapping des icônes SF Symbols vers Ionicons (plus stylés et modernes)
 * - Voir Ionicons: https://icons.expo.fyi/
 * - Voir SF Symbols: https://developer.apple.com/sf-symbols/
 */
const MAPPING: IconMapping = {
  'house.fill': 'home',
  'home': 'home',
  'network': 'people',
  'people': 'people',
  'book.fill': 'book',
  'book': 'book',
  'calendar': 'calendar',
  'envelope.fill': 'mail',
  'mail': 'mail',
  'person.fill': 'person',
  'person': 'person',
  'paperplane.fill': 'send',
  'send': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-forward',
} as IconMapping;

// Note: Les noms d'icônes Ionicons doivent correspondre exactement
// Documentation: https://icons.expo.fyi/
// Si les icônes ne s'affichent pas, vérifiez que les noms sont corrects
// Exemples valides: 'home', 'home-outline', 'home-sharp', 'people', 'people-outline', etc.

/**
 * Composant d'icône utilisant SF Symbols sur iOS et Ionicons sur Android/web.
 * Ionicons offre un style plus moderne et élégant.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName | string;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  // Récupérer le nom d'icône mappé depuis le mapping
  const mappedName = MAPPING[name as string];
  
  // Si un mapping existe, l'utiliser
  // Sinon, essayer le nom directement, puis avec des variantes
  let iconName: ComponentProps<typeof Ionicons>['name'] = mappedName || (name as ComponentProps<typeof Ionicons>['name']);
  
  // Si le nom n'est pas valide, utiliser un fallback
  if (!iconName) {
    iconName = 'help-circle-outline';
  }
  
  return <Ionicons name={iconName} size={size} color={color} style={style} />;
}
