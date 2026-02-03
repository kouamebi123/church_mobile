import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button } from 'react-native-paper';
import BaseModal from './BaseModal';
import MemberForm from '../members/MemberForm';
import { useMemberForm } from '../../hooks/members/useMemberForm';
import { useImageUpload } from '../../hooks/members/useImageUpload';
import { getImageUrl } from '../../config/apiConfig';
import i18nService from '../../services/i18nService';

interface EditMemberModalProps {
  visible: boolean;
  onClose: () => void;
  onUpdate: (data: any) => void;
  member: any;
  canUpdateUsers: boolean;
  departments?: any[];
}

export default function EditMemberModal({
  visible,
  onClose,
  onUpdate,
  member,
  canUpdateUsers,
  departments = [],
}: EditMemberModalProps) {
  const [editSelectedImage, setEditSelectedImage] = useState<any>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);

  // Hook pour gérer le formulaire d'édition
  const editMemberFormHook = useMemberForm({
    initialValues: member,
    onFormChange: null,
    includePassword: false
  });

  // Hook pour gérer l'upload d'image
  const imageUploadHook = useImageUpload({
    initialImage: null, // Sera mis à jour dans useEffect
    onImageChange: (newImage, newPreview) => {
      editMemberFormHook.setFormData((prev: any) => ({ ...prev, image: newPreview || '' }));
      setEditImagePreview(newPreview);
      setEditSelectedImage(newImage);
    },
  });

  // Réinitialiser le formulaire quand le modal s'ouvre avec un nouveau membre
  useEffect(() => {
    if (visible && member) {
      // Extraire les départements depuis user_departments si nécessaire
      const userDepartments = member.user_departments || [];
      const departementIds = userDepartments.length > 0
        ? userDepartments.map((ud: any) => ud.department?.id || ud.department?._id || ud.department_id).filter(Boolean)
        : (member.departement_ids || []); // Fallback à l'ancien departement_ids si user_departments est vide
      
      editMemberFormHook.setFormData({
        username: member.username || '',
        pseudo: member.pseudo || '',
        email: member.email || '',
        telephone: member.telephone || '',
        adresse: member.adresse || '',
        genre: member.genre || '',
        tranche_age: member.tranche_age || '',
        profession: member.profession || '',
        situation_professionnelle: member.situation_professionnelle || '',
        ville_residence: member.ville_residence || '',
        origine: member.origine || '',
        situation_matrimoniale: member.situation_matrimoniale || '',
        niveau_education: member.niveau_education || '',
        departement_ids: departementIds,
        qualification: member.qualification || '',
        role: member.role || 'MEMBRE', // Préserver le rôle existant
        image: member.image || ''
      });
      
      // Initialiser le switch "Sert dans un département" si l'utilisateur a des départements
      if (departementIds.length > 0) {
        editMemberFormHook.setSertDepartement(true);
      } else {
        editMemberFormHook.setSertDepartement(false);
      }
      
      // Réinitialiser les états d'image seulement quand on ouvre pour un nouveau membre
      // (quand member.id change, pas à chaque fois que visible change)
      setEditImagePreview(null);
      setEditSelectedImage(null);
      
      // Mettre à jour l'image preview si le membre a une image
      if (member.image) {
        // Convertir l'image en URL complète pour l'affichage
        const imageUrl = getImageUrl(member.image);
        imageUploadHook.setImagePreview(imageUrl);
      } else {
        // Réinitialiser l'image preview si le membre n'a pas d'image
        imageUploadHook.setImagePreview(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, member?.id]); // Ne pas inclure editMemberFormHook pour éviter les boucles infinies

  const handleUpdate = () => {
    const formData = editMemberFormHook.formData;
    const validation = editMemberFormHook.validateForm();
    
    if (!validation.isValid) {
      Alert.alert(
        i18nService.t('errors.validation.title') || 'Erreur',
        Object.values(validation.errors)[0] || 'Veuillez remplir tous les champs requis'
      );
      return;
    }

    onUpdate({
      ...formData,
      image: editSelectedImage ? editImagePreview : formData.image
    });
    handleClose();
  };

  const handleClose = () => {
    editMemberFormHook.resetForm();
    imageUploadHook.resetImageUpload();
    setEditImagePreview(null);
    setEditSelectedImage(null);
    onClose();
  };

  // Créer un hook d'image avec imagePreview synchronisé pour forcer le re-render
  // Quand une nouvelle image est sélectionnée, editImagePreview est mis à jour via le callback onImageChange
  // On doit synchroniser cela avec le hook pour que MemberForm affiche immédiatement l'image
  // Si editImagePreview existe (nouvelle image sélectionnée), l'utiliser prioritairement
  // Sinon utiliser imageUploadHook.imagePreview (image existante du membre ou null)
  const syncedImageUploadHook = {
    ...imageUploadHook,
    imagePreview: editImagePreview !== null ? editImagePreview : imageUploadHook.imagePreview
  };

  const actions = (
    <>
      <Button onPress={handleClose} mode="outlined" style={styles.button}>
        {i18nService.t('networks.details.cancel') || 'Annuler'}
      </Button>
      <Button
        onPress={handleUpdate}
        mode="contained"
        disabled={!canUpdateUsers}
        style={styles.button}
        buttonColor="#662d91"
      >
        {i18nService.t('common.actions.edit') || 'Modifier'}
      </Button>
    </>
  );

  return (
    <BaseModal
      visible={visible}
      onClose={handleClose}
      title={i18nService.t('networks.details.editMember') || 'Modifier le membre'}
      actions={actions}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <MemberForm
          memberFormHook={editMemberFormHook}
          imageUploadHook={syncedImageUploadHook}
          disabled={!canUpdateUsers}
          includePassword={false}
          departments={departments}
          allowedQualifications={['LEADER', 'REGULIER', 'IRREGULIER', 'EN_INTEGRATION']}
          getHelpMessage={() => ''}
        />
      </ScrollView>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    maxHeight: 600,
  },
  button: {
    minWidth: 100,
  },
});
