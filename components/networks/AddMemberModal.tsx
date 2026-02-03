import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, Button, SegmentedButtons } from 'react-native-paper';
import BaseModal from './BaseModal';
import BottomSheet from '../BottomSheet';
import MemberForm from '../members/MemberForm';
import { useMemberForm } from '../../hooks/members/useMemberForm';
import i18nService from '../../services/i18nService';

interface AddMemberModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: any) => void;
  availableUsers: any[];
  networkCompanions: any[];
  canUpdateGroups: boolean;
  departments?: any[];
}

export default function AddMemberModal({
  visible,
  onClose,
  onAdd,
  availableUsers = [],
  networkCompanions = [],
  canUpdateGroups,
  departments = [],
}: AddMemberModalProps) {
  const [newMemberMode, setNewMemberMode] = useState(false);
  const [selectedMember, setSelectedMember] = useState('');
  const [userSheetVisible, setUserSheetVisible] = useState(false);

  // Hook pour gérer le formulaire de membre
  const memberFormHook = useMemberForm({
    initialValues: null,
    onFormChange: null,
    includePassword: false,
  });

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
    label: `${user.username || ''} (${user.qualification || ''})`,
    value: user.id || user._id || '',
  })).filter(item => item.value && item.label);

  const selectedUser = filteredUsers.find(u => {
    const userId = u.id || u._id;
    return userId && userId === selectedMember;
  });

  const handleAdd = () => {
    if (newMemberMode) {
      // Mode création : passer le formulaire complet
      const formData = memberFormHook.formData;
      if (!formData.username || !formData.email || !formData.qualification) {
        Alert.alert(
          i18nService.t('errors.validation.title') || 'Erreur',
          i18nService.t('networks.details.selectMember') || 'Veuillez remplir tous les champs requis'
        );
        return;
      }
      onAdd(formData);
    } else {
      // Mode sélection : passer l'ID du membre sélectionné
      if (!selectedMember) {
        Alert.alert(
          i18nService.t('errors.validation.title') || 'Erreur',
          i18nService.t('networks.details.selectMember') || 'Veuillez sélectionner un membre'
        );
        return;
      }
      onAdd({ user_id: selectedMember });
    }
    handleClose();
  };

  const handleClose = () => {
    // Ne pas réinitialiser ici, laisser le useEffect gérer la réinitialisation si nécessaire
    setUserSheetVisible(false);
    setNewMemberMode(false);
    setSelectedMember('');
    memberFormHook.resetForm();
    onClose();
  };

  const actions = (
    <>
      <Button onPress={handleClose} mode="outlined" style={styles.button}>
        {i18nService.t('networks.details.cancel') || 'Annuler'}
      </Button>
      <Button
        onPress={handleAdd}
        mode="contained"
        disabled={!canUpdateGroups || (newMemberMode ? false : !selectedMember)}
        style={styles.button}
        buttonColor="#662d91"
      >
        {i18nService.t('networks.details.addMember') || 'Ajouter'}
      </Button>
    </>
  );

  return (
    <>
      <BaseModal
        visible={visible}
        onClose={handleClose}
        title={i18nService.t('networks.details.addMember') || 'Ajouter un membre'}
        actions={actions}
      >
        <View style={styles.container}>
          {/* Toggle entre sélection et création */}
          <SegmentedButtons
            value={newMemberMode ? 'create' : 'select'}
            onValueChange={(value) => setNewMemberMode(value === 'create')}
            buttons={[
              {
                value: 'select',
                label: i18nService.t('networks.details.selectExistingMember') || 'Sélectionner',
              },
              {
                value: 'create',
                label: i18nService.t('networks.details.createNewMember') || 'Créer',
              },
            ]}
            style={styles.segmentedButtons}
          />

          {newMemberMode ? (
            // Mode création : afficher le formulaire complet
            <MemberForm
              memberFormHook={memberFormHook}
              disabled={!canUpdateGroups}
              includePassword={false}
              departments={departments}
              allowedQualifications={['LEADER', 'REGULIER', 'IRREGULIER', 'EN_INTEGRATION']}
              getHelpMessage={() => ''}
            />
          ) : (
            // Mode sélection : afficher le sélecteur d'utilisateur
            <>
              <TouchableOpacity
                onPress={() => setUserSheetVisible(true)}
                disabled={!canUpdateGroups}
                style={[styles.selectButton, !canUpdateGroups && styles.disabled]}
              >
                <Text style={styles.selectLabel}>
                  {i18nService.t('networks.details.selectMember') || 'Sélectionner un membre'}
                </Text>
                <Text style={styles.selectedValue}>
                  {selectedUser ? `${selectedUser.username} (${selectedUser.qualification || ''})` : i18nService.t('common.actions.select') || 'Sélectionner'}
                </Text>
              </TouchableOpacity>

              {filteredUsers.length === 0 && (
                <Text style={styles.emptyText}>
                  {i18nService.t('networks.details.noAvailableUsers') || 'Aucun utilisateur disponible'}
                </Text>
              )}
            </>
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
              setSelectedMember(item.value as string);
            }
            setUserSheetVisible(false);
          } catch (error) {
            console.error('Erreur lors de la sélection:', error);
            setUserSheetVisible(false);
          }
        }}
        title={i18nService.t('networks.details.selectMember') || 'Sélectionner un membre'}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  segmentedButtons: {
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
