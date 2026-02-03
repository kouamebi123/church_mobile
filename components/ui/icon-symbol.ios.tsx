// Utiliser Ionicons sur iOS aussi pour la cohérence
import Ionicons from '@expo/vector-icons/Ionicons';
import { SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<string, ComponentProps<typeof Ionicons>['name']>;

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

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: string;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const mappedName = MAPPING[name as string];
  let iconName: ComponentProps<typeof Ionicons>['name'] = mappedName || (name as ComponentProps<typeof Ionicons>['name']);
  
  if (!iconName) {
    iconName = 'help-circle-outline';
  }
  
  return <Ionicons name={iconName} size={size} color={color} style={style} />;
}
