import { useState, useCallback, useEffect, useRef } from 'react';
import { useImageUpload } from './useImageUpload';
import i18nService from '../../services/i18nService';

/**
 * Valeurs initiales par défaut du formulaire membre
 */
export const getInitialMemberForm = () => ({
  username: '',
  pseudo: '',
  email: '',
  password: '',
  role: 'MEMBRE',
  genre: '',
  tranche_age: '',
  profession: '',
  situation_professionnelle: '',
  ville_residence: '',
  origine: '',
  situation_matrimoniale: '',
  niveau_education: '',
  departement: '',
  departement_ids: [] as string[],
  qualification: '',
  telephone: '',
  adresse: '',
  image: '',
  eglise_locale_id: ''
});

interface UseMemberFormOptions {
  initialValues?: any;
  onFormChange?: ((data: any) => void) | null;
  includePassword?: boolean;
}

/**
 * Hook pour gérer le formulaire de membre
 */
export const useMemberForm = (options: UseMemberFormOptions = {}) => {
  const {
    initialValues = null,
    onFormChange = null,
    includePassword = false
  } = options;

  const [formData, setFormData] = useState(() => {
    if (initialValues) {
      return { ...getInitialMemberForm(), ...initialValues };
    }
    return getInitialMemberForm();
  });

  const [sertDepartement, setSertDepartement] = useState(false);
  const isManualChangeRef = useRef(false);
  const initialIdRef = useRef<string | null>(null);

  // Hook pour l'upload d'image
  const imageUpload = useImageUpload({
    onImageChange: (file, preview) => {
      if (file) {
        setFormData((prev: any) => ({ ...prev, image: preview || '' }));
      }
    },
    initialImage: initialValues?.image || null
  });

  // Synchroniser sertDepartement avec departement_ids
  // IMPORTANT: On ne décoche JAMAIS automatiquement le switch, seulement on le coche si departement_ids a des valeurs
  useEffect(() => {
    // Ne pas synchroniser si le changement vient de l'utilisateur (dans les 200ms qui suivent)
    if (isManualChangeRef.current) {
      // Réinitialiser le flag après un court délai pour permettre la synchronisation future
      const timeoutId = setTimeout(() => {
        isManualChangeRef.current = false;
      }, 200);
      return () => clearTimeout(timeoutId);
    }
    
    const hasDepartments = formData.departement_ids && formData.departement_ids.length > 0;
    // Seulement cocher automatiquement si departement_ids a des valeurs
    // Ne JAMAIS décocher automatiquement (l'utilisateur doit le faire manuellement)
    if (hasDepartments) {
      setSertDepartement((prev: boolean) => prev ? prev : true); // Ne changer que si c'est false
    }
  }, [formData.departement_ids]);

  // Mémoriser l'ID initial pour éviter les boucles infinies
  // Mettre à jour le formulaire quand initialValues change (seulement si c'est un nouvel ID)
  useEffect(() => {
    if (!initialValues) {
      initialIdRef.current = null;
      return; // Ignorer si initialValues est null
    }
    
    const currentId = initialValues?.id || initialValues?._id;
    const prevId = initialIdRef.current;
    
    // Seulement mettre à jour si c'est un nouvel ID
    if (currentId && currentId !== prevId) {
      const newFormData = { ...getInitialMemberForm(), ...initialValues };
      setFormData(newFormData);
      // Initialiser sertDepartement si l'utilisateur a des départements
      if (initialValues.departement_ids && initialValues.departement_ids.length > 0) {
        setSertDepartement(true);
      } else {
        setSertDepartement(false);
      }
      if (initialValues.image) {
        imageUpload.setImagePreview(initialValues.image);
      }
      initialIdRef.current = currentId;
    }
  }, [initialValues?.id, initialValues?._id, imageUpload]);

  // Notifier les changements (avec une référence pour éviter les boucles infinies)
  const onFormChangeRef = useRef(onFormChange);
  const prevFormDataRef = useRef(formData);
  
  // Mettre à jour la référence de la fonction callback
  useEffect(() => {
    onFormChangeRef.current = onFormChange;
  }, [onFormChange]);
  
  // Notifier les changements seulement si les données ont vraiment changé
  useEffect(() => {
    // Comparer les valeurs pour éviter les appels inutiles
    const hasChanged = JSON.stringify(prevFormDataRef.current) !== JSON.stringify(formData);
    
    if (hasChanged && onFormChangeRef.current) {
      prevFormDataRef.current = formData;
      onFormChangeRef.current(formData);
    }
  }, [formData]);

  /**
   * Met à jour un champ du formulaire
   */
  const updateField = useCallback((field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  }, []);

  /**
   * Met à jour plusieurs champs à la fois
   */
  const updateFields = useCallback((fields: Record<string, any>) => {
    setFormData((prev: any) => ({ ...prev, ...fields }));
  }, []);

  /**
   * Réinitialise le formulaire
   */
  const resetForm = useCallback((newInitialValues: any = null) => {
    if (newInitialValues) {
      setFormData({ ...getInitialMemberForm(), ...newInitialValues });
    } else {
      setFormData(getInitialMemberForm());
    }
    setSertDepartement(false);
    imageUpload.resetImageUpload();
  }, [imageUpload]);

  /**
   * Gère le changement de situation professionnelle
   */
  const handleSituationProfessionnelleChange = useCallback((value: string) => {
    updateField('situation_professionnelle', value);
    // Vider le champ profession si la situation ne nécessite pas de profession
    if (!['EMPLOYE', 'INDEPENDANT'].includes(value)) {
      updateField('profession', '');
    }
  }, [updateField]);

  /**
   * Gère le changement du switch "sert dans département"
   */
  const handleSertDepartementChange = useCallback((checked: boolean) => {
    // Marquer que c'est un changement manuel
    isManualChangeRef.current = true;
    
    // Mettre à jour sertDepartement
    setSertDepartement(checked);
    
    // Vider les départements seulement si on décoche
    if (!checked && formData.departement_ids && formData.departement_ids.length > 0) {
      updateField('departement_ids', []);
    }
  }, [updateField, formData.departement_ids]);

  /**
   * Valide le formulaire
   */
  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};

    if (!formData.username || formData.username.trim() === '') {
      errors.username = i18nService.t('errors.validation.usernameRequired') || 'Nom d\'utilisateur requis';
    }

    if (!formData.email || formData.email.trim() === '') {
      errors.email = i18nService.t('errors.validation.emailRequired') || 'Email requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = i18nService.t('errors.validation.emailInvalid') || 'Email invalide';
    }

    if (includePassword && !formData.password) {
      errors.password = i18nService.t('errors.validation.passwordRequired') || 'Mot de passe requis';
    }

    if (!formData.genre) {
      errors.genre = i18nService.t('errors.validation.genreRequired') || 'Genre requis';
    }

    if (!formData.tranche_age) {
      errors.tranche_age = i18nService.t('errors.validation.ageRangeRequired') || 'Tranche d\'âge requise';
    }

    if (formData.situation_professionnelle && ['EMPLOYE', 'INDEPENDANT'].includes(formData.situation_professionnelle)) {
      if (!formData.profession || formData.profession.trim() === '') {
        errors.profession = i18nService.t('errors.validation.professionRequired') || 'Profession requise';
      }
    }

    if (!formData.ville_residence || formData.ville_residence.trim() === '') {
      errors.ville_residence = i18nService.t('errors.validation.cityRequired') || 'Ville de résidence requise';
    }

    if (!formData.origine) {
      errors.origine = i18nService.t('errors.validation.originRequired') || 'Origine requise';
    }

    if (!formData.situation_matrimoniale) {
      errors.situation_matrimoniale = i18nService.t('errors.validation.maritalStatusRequired') || 'Situation matrimoniale requise';
    }

    if (!formData.niveau_education) {
      errors.niveau_education = i18nService.t('errors.validation.educationRequired') || 'Niveau d\'éducation requis';
    }

    if (!formData.qualification) {
      errors.qualification = i18nService.t('errors.validation.qualificationRequired') || 'Qualification requise';
    }

    if (sertDepartement && (!formData.departement_ids || formData.departement_ids.length === 0)) {
      errors.departement_ids = i18nService.t('errors.validation.departmentsRequired') || 'Au moins un département est requis';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }, [formData, sertDepartement, includePassword]);

  return {
    formData,
    sertDepartement,
    updateField,
    updateFields,
    resetForm,
    handleSituationProfessionnelleChange,
    handleSertDepartementChange,
    validateForm,
    setFormData,
    setSertDepartement,
    ...imageUpload
  };
};

