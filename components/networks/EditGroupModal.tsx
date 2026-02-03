import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, Button } from 'react-native-paper';
import BaseModal from './BaseModal';
import BottomSheet from '../BottomSheet';
import i18nService from '../../services/i18nService';

interface EditGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  group: any;
  availableUsers: any[];
  networkCompanions: any[];
  canUpdateGroups: boolean;
}

export default function EditGroupModal({
  visible,
  onClose,
  onSubmit,
  group,
  availableUsers = [],
  networkCompanions = [],
  canUpdateGroups,
}: EditGroupModalProps) {
  const [selectedResponsable1, setSelectedResponsable1] = useState('');
  const [userSheetVisible, setUserSheetVisible] = useState(false);

  useEffect(() => {
    if (visible && group) {
      const responsableId = group.responsable1?.id || group.responsable1?._id || '';
      setSelectedResponsable1(responsableId);
    } else if (!visible) {
      // Réinitialiser seulement quand le modal se ferme complètement
      setSelectedResponsable1('');
      setUserSheetVisible(false);
    }
  }, [visible, group]);

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
    onSubmit({
      id: group?.id || group?._id,
      responsable1_id: selectedResponsable1,
    });
    onClose();
  };

  const handleClose = () => {
    // Ne pas réinitialiser ici, laisser le useEffect gérer la réinitialisation
    setUserSheetVisible(false);
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
        disabled={!canUpdateGroups || !selectedResponsable1}
        style={styles.button}
        buttonColor="#662d91"
      >
        {i18nService.t('common.actions.edit') || 'Modifier'}
      </Button>
    </>
  );

  return (
    <>
      <BaseModal
        visible={visible}
        onClose={handleClose}
        title={i18nService.t('networks.details.editGroupDialog') || 'Modifier le groupe'}
        actions={actions}
      >
        <View style={styles.container}>
          <Text style={styles.groupName}>{group?.nom}</Text>

          <TouchableOpacity
            onPress={() => setUserSheetVisible(true)}
            disabled={!canUpdateGroups}
            style={[styles.selectButton, !canUpdateGroups && styles.disabled]}
          >
            <Text style={styles.selectLabel}>
              {i18nService.t('networks.details.responsable1') || 'Responsable 1'}
            </Text>
            <Text style={styles.selectedValue}>
              {selectedUser?.username || i18nService.t('common.actions.select') || 'Sélectionner'}
            </Text>
          </TouchableOpacity>
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
  groupName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#662d91',
    marginBottom: 16,
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
  button: {
    minWidth: 100,
  },
});

