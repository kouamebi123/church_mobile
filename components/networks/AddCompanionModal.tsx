import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Button, TextInput } from 'react-native-paper';
import BaseModal from './BaseModal';
import i18nService from '../../services/i18nService';
import BottomSheet from '../BottomSheet';

interface User {
  id?: string;
  _id?: string;
  username: string;
  qualification?: string;
}

interface Companion {
  id?: string;
  _id?: string;
  user?: {
    id?: string;
    _id?: string;
  };
}

interface Group {
  members?: Array<{
    user?: {
      id?: string;
      _id?: string;
    };
  }>;
}

interface AddCompanionModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: () => void;
  selectedUserId: string;
  onUserIdChange: (userId: string) => void;
  availableUsers: User[];
  networkGroups: Group[];
  networkCompanions: Companion[];
  canCreateGroups: boolean;
  getHelpMessage: (permission: boolean) => string;
}

export default function AddCompanionModal({
  visible,
  onClose,
  onAdd,
  selectedUserId,
  onUserIdChange,
  availableUsers = [],
  networkGroups = [],
  networkCompanions = [],
  canCreateGroups,
  getHelpMessage,
}: AddCompanionModalProps) {
  const filteredUsers = useMemo(() => {
    return availableUsers.filter(user => {
      if (user.qualification !== 'COMPAGNON_OEUVRE') return false;
      
      const userId = user.id || user._id;
      if (!userId) return false;
      
      const isMemberOfAnyGroup = networkGroups.some(gr => 
        gr.members?.some(m => {
          const memberUserId = m.user?.id || m.user?._id;
          return memberUserId === userId;
        })
      );
      if (isMemberOfAnyGroup) return false;
      
      const isCompanionInThisNetwork = networkCompanions.some(c => {
        const companionUserId = c.user?.id || c.user?._id;
        return companionUserId === userId;
      });
      if (isCompanionInThisNetwork) return false;
      
      return true;
    });
  }, [availableUsers, networkGroups, networkCompanions]);

  const [userSheetVisible, setUserSheetVisible] = React.useState(false);

  const userItems = filteredUsers.map(user => ({
    label: user.username || '',
    value: user.id || user._id || '',
  })).filter(item => item.value && item.label);

  const selectedUser = filteredUsers.find(u => {
    const userId = u.id || u._id;
    return userId && userId === selectedUserId;
  });

  const actions = (
    <>
      <Button onPress={onClose} mode="outlined" style={styles.button}>
        {i18nService.t('networks.details.cancel') || 'Annuler'}
      </Button>
      <Button
        onPress={onAdd}
        mode="contained"
        disabled={!canCreateGroups || !selectedUserId}
        style={styles.button}
        buttonColor="#662d91"
      >
        {i18nService.t('common.actions.add') || 'Ajouter'}
      </Button>
    </>
  );

  return (
    <BaseModal
      visible={visible}
      onClose={onClose}
      title={i18nService.t('networks.details.addCompanion') || 'Ajouter un compagnon d\'œuvre'}
      actions={actions}
    >
      <View style={styles.container}>
        <TouchableOpacity
          onPress={() => setUserSheetVisible(true)}
          disabled={!canCreateGroups}
          style={[styles.selectButton, !canCreateGroups && styles.disabled]}
        >
          <Text style={styles.selectLabel}>
            {i18nService.t('networks.details.selectUser') || 'Sélectionner un utilisateur'}
          </Text>
          <Text style={styles.selectedValue}>
            {selectedUser?.username || i18nService.t('common.actions.select') || 'Sélectionner'}
          </Text>
        </TouchableOpacity>

        {filteredUsers.length === 0 && (
          <Text style={styles.emptyText}>
            {i18nService.t('networks.details.noAvailableCompanions') || 
              'Aucun utilisateur avec la qualification "Compagnon d\'œuvre" disponible.'}
          </Text>
        )}
      </View>

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
              onUserIdChange(item.value as string);
            }
            setUserSheetVisible(false);
          } catch (error) {
            console.error('Erreur lors de la sélection:', error);
            setUserSheetVisible(false);
          }
        }}
        title={i18nService.t('networks.details.selectUser') || 'Sélectionner un utilisateur'}
      />
    </BaseModal>
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

