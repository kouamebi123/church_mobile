import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import i18nService from '../services/i18nService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BottomSheetItem {
  label: string;
  value: string | number;
  icon?: string;
  selected?: boolean;
  disabled?: boolean;
}

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  items: BottomSheetItem[];
  onSelect: (item: BottomSheetItem) => void;
  title?: string;
  multiSelect?: boolean;
  selectedValues?: (string | number)[];
}

export default function BottomSheet({
  visible,
  onClose,
  items,
  onSelect,
  title,
  multiSelect = false,
  selectedValues = [],
}: BottomSheetProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const isItemSelected = (item: BottomSheetItem) => {
    if (multiSelect) {
      return selectedValues.includes(item.value);
    }
    return item.selected || false;
  };

  const handleSelect = (item: BottomSheetItem) => {
    try {
      if (!item || item.disabled) return;
      if (onSelect) {
        onSelect(item);
      }
      if (!multiSelect && onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Erreur lors de la sélection dans BottomSheet:', error);
      if (onClose) {
        onClose();
      }
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropOpacity,
            },
          ]}
        />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableWithoutFeedback>
          <View style={styles.sheet}>
            {/* Handle bar */}
            <View style={styles.handleBar} />

            {/* Title */}
            {title && (
              <View style={styles.titleContainer}>
                <Text style={styles.title}>{title}</Text>
              </View>
            )}

            {/* Items */}
            <ScrollView 
              style={styles.itemsContainer}
              contentContainerStyle={styles.itemsContentContainer}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {items && items.length > 0 ? items.map((item, index) => {
                if (!item || !item.value) return null;
                const isSelected = isItemSelected(item);
                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.item,
                      index === 0 && styles.firstItem,
                      index === items.length - 1 && styles.lastItem,
                      isSelected && styles.selectedItem,
                      item.disabled && styles.disabledItem,
                    ]}
                    onPress={() => handleSelect(item)}
                    disabled={item.disabled}
                    activeOpacity={0.7}
                  >
                    {item.icon && (
                      <MaterialIcons
                        name={item.icon as any}
                        size={24}
                        color={isSelected ? '#662d91' : '#333'}
                        style={styles.itemIcon}
                      />
                    )}
                    <Text
                      style={[
                        styles.itemLabel,
                        isSelected && styles.selectedItemLabel,
                        item.disabled && styles.disabledItemLabel,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {isSelected && (
                      <MaterialIcons
                        name="check"
                        size={24}
                        color="#662d91"
                        style={styles.checkIcon}
                      />
                    )}
                  </TouchableOpacity>
                );
              }) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {i18nService.t('common.noItems') || 'Aucun élément disponible'}
                  </Text>
                </View>
              )}
            </ScrollView>
            {multiSelect && (
              <View style={styles.multiSelectFooter}>
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={onClose}
                >
                  <Text style={styles.doneButtonText}>
                    {i18nService.t('common.actions.done') || 'Terminé'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: SCREEN_HEIGHT * 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    flexDirection: 'column',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  titleContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  itemsContainer: {
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  itemsContentContainer: {
    paddingVertical: 8,
    paddingBottom: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  firstItem: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  lastItem: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  selectedItem: {
    backgroundColor: '#f9f5ff',
  },
  disabledItem: {
    opacity: 0.5,
  },
  itemIcon: {
    marginRight: 12,
  },
  itemLabel: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '400',
  },
  selectedItemLabel: {
    color: '#662d91',
    fontWeight: '600',
  },
  disabledItemLabel: {
    color: '#999',
  },
  checkIcon: {
    marginLeft: 8,
  },
  multiSelectFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  doneButton: {
    backgroundColor: '#662d91',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});

