import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import i18nService from '../../services/i18nService';

interface UseImageUploadOptions {
  maxSizeMB?: number;
  onImageChange?: (file: any, preview: string | null) => void;
  initialImage?: string | null;
}

export const useImageUpload = (options: UseImageUploadOptions = {}) => {
  const { maxSizeMB = 5, onImageChange, initialImage = null } = options;

  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialImage || null);
  const [confirmedImage, setConfirmedImage] = useState<any>(null);

  /**
   * Gère la sélection d'une image
   */
  const handleImageSelect = useCallback(async () => {
    try {
      // Demander la permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          i18nService.t('errors.validation.title') || 'Permission requise',
          i18nService.t('errors.validation.cameraPermission') || 'Permission d\'accès à la galerie requise'
        );
        return;
      }

      // Ouvrir le sélecteur d'images
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      
      // Vérifier la taille
      if (asset.fileSize && asset.fileSize > maxSizeMB * 1024 * 1024) {
        Alert.alert(
          i18nService.t('errors.validation.title') || 'Erreur',
          i18nService.t('errors.validation.imageTooLarge') || `L'image ne doit pas dépasser ${maxSizeMB}MB`
        );
        return;
      }

      setSelectedImage(asset);
      setImagePreview(asset.uri);

      if (onImageChange) {
        onImageChange(asset, asset.uri);
      }
    } catch (error: any) {
      Alert.alert(
        i18nService.t('errors.validation.title') || 'Erreur',
        error.message || i18nService.t('errors.validation.imageSelectError') || 'Erreur lors de la sélection de l\'image'
      );
    }
  }, [maxSizeMB, onImageChange]);

  /**
   * Supprime l'image sélectionnée
   */
  const handleRemoveImage = useCallback(() => {
    setSelectedImage(null);
    setImagePreview(null);
    setConfirmedImage(null);
    if (onImageChange) {
      onImageChange(null, null);
    }
  }, [onImageChange]);

  /**
   * Confirme l'image sélectionnée
   */
  const handleConfirmImage = useCallback(() => {
    setConfirmedImage(selectedImage);
  }, [selectedImage]);

  /**
   * Réinitialise l'état de l'upload
   */
  const resetImageUpload = useCallback(() => {
    setSelectedImage(null);
    setImagePreview(null);
    setConfirmedImage(null);
  }, []);

  /**
   * Restaure une image précédemment confirmée
   */
  const restoreConfirmedImage = useCallback(() => {
    if (confirmedImage) {
      setSelectedImage(confirmedImage);
      setImagePreview(confirmedImage.uri);
    } else {
      setSelectedImage(null);
      setImagePreview(null);
    }
  }, [confirmedImage]);

  return {
    selectedImage,
    imagePreview,
    confirmedImage,
    handleImageSelect,
    handleRemoveImage,
    handleConfirmImage,
    resetImageUpload,
    restoreConfirmedImage,
    setSelectedImage,
    setImagePreview,
    setConfirmedImage
  };
};

