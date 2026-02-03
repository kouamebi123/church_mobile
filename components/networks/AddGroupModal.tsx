import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, Button, TextInput } from 'react-native-paper';
import BaseModal from './BaseModal';
import BottomSheet from '../BottomSheet';
import i18nService from '../../services/i18nService';

interface AddGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  availableUsers: any[];
  networkCompanions: any[];
  canCreateGroups: boolean;
}

export default function AddGroupModal({
  visible,
  onClose,
  onSubmit,
  availableUsers = [],
  networkCompanions = [],
  canCreateGroups,
}: AddGroupModalProps) {
  const [selectedResponsable1, setSelectedResponsable1] = useState('');
  const [userSheetVisible, setUserSheetVisible] = useState(false);

  const filteredUsers = (availableUsers || []).filter(user => {
    if (!user) return false;
    const userId = user.id || user._id;
    if (!userId) return false;
    const isCompanion = (networkCompanions || []).some(c => {
      const companionUserId = c.user?.id || c.user?._id;
      return companionUserId === userId;
    });
    return user.qualification !== 'COMPAGNON_OEUVRE' && !isCompanion;
  });

  const userItems = filteredUsers.map(user => ({
    label: user.username || '',
    value: user.id || user._id || '',
  })).filter(item => item.value && item.label);

  const selectedUser = filteredUsers.find(u => {
    const userId = u.id || u._id;
    return userId && userId === selectedResponsable1;
  });

  const handleSubmit = () => {
    if (!selectedResponsable1) {
      Alert.alert(
        i18nService.t('errors.validation.title') || 'Erreur',
        i18nService.t('networks.details.selectResponsable') || 'Veuillez sélectionner un responsable'
      );
      return;
    }
    onSubmit({ responsable1: selectedResponsable1 });
    setSelectedResponsable1('');
    onClose();
  };

  const handleClose = () => {
    // Ne pas réinitialiser ici, laisser le useEffect gérer la réinitialisation si nécessaire
    setUserSheetVisible(false);
    setSelectedResponsable1('');
    onClose();
  };

  const actions = (
    <>
      <Button onPress={handleClose} mode="outlined" style={styles.button}>
        {i18nService.t('networks.details.cancel') || 'Annuler'}
      </Button>
      <Button
        onPress={handleSubmit}
        mode="contained"
        disabled={!canCreateGroups || !selectedResponsable1}
        style={styles.button}
        buttonColor="#662d91"
      >
        {i18nService.t('common.actions.add') || 'Ajouter'}
      </Button>
    </>
  );

  return (
    <>
      <BaseModal
        visible={visible}
        onClose={handleClose}
        title={i18nService.t('networks.details.addGroupDialog') || 'Ajouter un groupe'}
        actions={actions}
      >
        <View style={styles.container}>
          <TouchableOpacity
            onPress={() => setUserSheetVisible(true)}
            disabled={!canCreateGroups}
            style={[styles.selectButton, !canCreateGroups && styles.disabled]}
          >
            <Text style={styles.selectLabel}>
              {i18nService.t('networks.details.responsable1') || 'Responsable 1'}
            </Text>
            <Text style={styles.selectedValue}>
              {selectedUser?.username || i18nService.t('common.actions.select') || 'Sélectionner'}
            </Text>
          </TouchableOpacity>

          {filteredUsers.length === 0 && (
            <Text style={styles.emptyText}>
              {i18nService.t('networks.details.noAvailableUsers') || 'Aucun utilisateur disponible'}
            </Text>
          )}
        </View>
      </BaseModal>

      <BottomSheet
        visible={userSheetVisible}
        onClose={() => {
          // Fermer le BottomSheet sans modifier la sélection
          setUserSheetVisible(false);
        }}
        items={userItems}
        onSelect={(item) => {
          try {
            if (item && item.value) {
              setSelectedResponsable1(item.value as string);
            }
            setUserSheetVisible(false);
          } catch (error) {
            console.error('Erreur lors de la sélection:', error);
            setUserSheetVisible(false);
          }
        }}
        title={i18nService.t('networks.details.selectResponsable') || 'Sélectionner un responsable'}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  selectButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  disabled: {
    opacity: 0.5,
  },
  selectLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  selectedValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  button: {
    minWidth: 100,
  },
});

