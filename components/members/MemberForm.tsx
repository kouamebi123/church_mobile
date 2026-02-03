import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Text, TextInput, Switch, Chip } from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemberForm } from '../../hooks/members/useMemberForm';
import { useImageUpload } from '../../hooks/members/useImageUpload';
import {
  GENRE_OPTIONS,
  TRANCHE_AGE_OPTIONS,
  SITUATION_MATRIMONIALE_OPTIONS,
  SITUATION_PROFESSIONNELLE_OPTIONS,
  NIVEAU_EDUCATION_OPTIONS,
  QUALIFICATION_OPTIONS
} from '../../constants/enums';
import { COUNTRIES } from '../../constants/countries';
import { getImageUrl, DEFAULT_PROFILE_IMAGE } from '../../config/apiConfig';
import BottomSheet from '../BottomSheet';
import i18nService from '../../services/i18nService';

interface MemberFormProps {
  initialValues?: any;
  onChange?: (data: any) => void;
  disabled?: boolean;
  includePassword?: boolean;
  departments?: any[];
  getHelpMessage?: () => string;
  allowedQualifications?: string[];
  showImageUpload?: boolean;
  memberFormHook?: any;
  imageUploadHook?: any;
}

export default function MemberForm({
  initialValues = null,
  onChange = null,
  disabled = false,
  includePassword = false,
  departments = [],
  getHelpMessage = () => '',
  allowedQualifications = ['LEADER', 'REGULIER', 'IRREGULIER', 'EN_INTEGRATION'],
  showImageUpload = true,
  memberFormHook = null,
  imageUploadHook = null
}: MemberFormProps) {
  // Utiliser le hook externe si fourni, sinon créer le nôtre
  const internalHook = useMemberForm({
    initialValues,
    onFormChange: onChange,
    includePassword
  });
  
  // Utiliser le hook externe si fourni, sinon utiliser le hook interne
  const memberForm = memberFormHook || internalHook;

  const {
    formData,
    sertDepartement,
    updateField,
    handleSituationProfessionnelleChange,
    handleSertDepartementChange,
    imagePreview,
    selectedImage,
    handleImageSelect,
    handleRemoveImage
  } = memberForm;

  // Utiliser le hook d'image externe si fourni
  const imageUpload = imageUploadHook || memberForm;
  
  // Utiliser handleImageSelect du hook externe si fourni, sinon celui de memberForm
  const imageSelectHandler = imageUploadHook?.handleImageSelect || handleImageSelect;
  const imageRemoveHandler = imageUploadHook?.handleRemoveImage || handleRemoveImage;

  // États pour les BottomSheets
  const [genreSheetVisible, setGenreSheetVisible] = React.useState(false);
  const [ageSheetVisible, setAgeSheetVisible] = React.useState(false);
  const [situationProfSheetVisible, setSituationProfSheetVisible] = React.useState(false);
  const [situationMatSheetVisible, setSituationMatSheetVisible] = React.useState(false);
  const [educationSheetVisible, setEducationSheetVisible] = React.useState(false);
  const [qualificationSheetVisible, setQualificationSheetVisible] = React.useState(false);
  const [origineSheetVisible, setOrigineSheetVisible] = React.useState(false);
  const [departmentsSheetVisible, setDepartmentsSheetVisible] = React.useState(false);

  // Déterminer l'image à afficher
  // Si imageUploadHook est fourni, utiliser directement imageUploadHook.imagePreview pour la réactivité
  // Sinon utiliser memberForm.imagePreview
  const imagePreviewToUse = imageUploadHook?.imagePreview ?? memberForm.imagePreview;
  const displayImage = imagePreviewToUse || (formData.image ? getImageUrl(formData.image) : null);

  // Options filtrées pour les qualifications
  const filteredQualifications = QUALIFICATION_OPTIONS.filter(qual => 
    allowedQualifications.includes(qual.value)
  );

  // Items pour les BottomSheets
  const genreItems = GENRE_OPTIONS.map(opt => ({ label: opt.label, value: opt.value }));
  const ageItems = TRANCHE_AGE_OPTIONS.map(opt => ({ label: opt.label, value: opt.value }));
  const situationProfItems = [
    { label: 'Aucune', value: '' },
    ...SITUATION_PROFESSIONNELLE_OPTIONS.map(opt => ({ label: opt.label, value: opt.value }))
  ];
  const situationMatItems = SITUATION_MATRIMONIALE_OPTIONS.map(opt => ({ label: opt.label, value: opt.value }));
  const educationItems = NIVEAU_EDUCATION_OPTIONS.map(opt => ({ label: opt.label, value: opt.value }));
  const qualificationItems = filteredQualifications.map(opt => ({ label: opt.label, value: opt.value }));
  const origineItems = COUNTRIES.map(country => ({ label: country.label, value: country.value }));
  const departmentItems = departments.map(dept => ({ 
    label: dept.nom, 
    value: (dept.id || dept._id).toString() 
  }));

  // Trouver les labels pour les valeurs sélectionnées
  const getLabel = (value: string, options: any[]) => {
    const option = options.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  const selectedGenreLabel = getLabel(formData.genre, GENRE_OPTIONS);
  const selectedAgeLabel = getLabel(formData.tranche_age, TRANCHE_AGE_OPTIONS);
  const selectedSituationProfLabel = formData.situation_professionnelle 
    ? getLabel(formData.situation_professionnelle, SITUATION_PROFESSIONNELLE_OPTIONS)
    : 'Aucune';
  const selectedSituationMatLabel = getLabel(formData.situation_matrimoniale, SITUATION_MATRIMONIALE_OPTIONS);
  const selectedEducationLabel = getLabel(formData.niveau_education, NIVEAU_EDUCATION_OPTIONS);
  const selectedQualificationLabel = getLabel(formData.qualification, filteredQualifications);
  const selectedOrigineLabel = getLabel(formData.origine, COUNTRIES);
  const selectedDepartmentsLabels = formData.departement_ids?.map((id: string) => {
    const dept = departments.find(d => (d.id || d._id).toString() === id);
    return dept ? dept.nom : id;
  }) || [];

  return (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {/* Section Upload d'image */}
      {showImageUpload && (
        <View style={styles.imageSection}>
          {displayImage ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: displayImage }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={imageRemoveHandler}
                disabled={disabled}
              >
                <MaterialIcons name="delete" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <MaterialIcons name="person" size={40} color="#9e9e9e" />
              <Text style={styles.imagePlaceholderText}>
                {i18nService.t('auth.register.noImageSelected') || 'Aucune photo sélectionnée'}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.imageButton, disabled && styles.disabled]}
            onPress={imageSelectHandler}
            disabled={disabled}
          >
            <Text style={styles.imageButtonText}>
              {displayImage
                ? (i18nService.t('auth.register.changeImage') || 'Changer l\'image')
                : (i18nService.t('auth.register.selectImage') || 'Sélectionner une image')
              }
            </Text>
          </TouchableOpacity>

          <Text style={styles.imageHint}>
            JPG, PNG, GIF (max 5MB)
          </Text>
        </View>
      )}

      {/* Champs du formulaire */}
      <TextInput
        label={i18nService.t('auth.register.username') || 'Nom d\'utilisateur'}
        value={formData.username}
        onChangeText={(text) => updateField('username', text)}
        style={styles.input}
        mode="outlined"
        disabled={disabled}
        required
      />

      <TextInput
        label={i18nService.t('auth.register.pseudo') || 'Pseudo'}
        value={formData.pseudo}
        onChangeText={(text) => updateField('pseudo', text)}
        style={styles.input}
        mode="outlined"
        disabled={disabled}
        required
      />

      <TextInput
        label={i18nService.t('auth.register.email') || 'Email'}
        value={formData.email}
        onChangeText={(text) => updateField('email', text)}
        keyboardType="email-address"
        style={styles.input}
        mode="outlined"
        disabled={disabled}
        required
      />

      {includePassword && (
        <TextInput
          label={i18nService.t('auth.register.password') || 'Mot de passe'}
          value={formData.password || ''}
          onChangeText={(text) => updateField('password', text)}
          secureTextEntry
          style={styles.input}
          mode="outlined"
          disabled={disabled}
          required
        />
      )}

      <TextInput
        label={i18nService.t('auth.register.telephone') || 'Téléphone'}
        value={formData.telephone}
        onChangeText={(text) => updateField('telephone', text)}
        keyboardType="phone-pad"
        style={styles.input}
        mode="outlined"
        disabled={disabled}
        required
      />

      <TextInput
        label={i18nService.t('auth.register.adresse') || 'Adresse'}
        value={formData.adresse}
        onChangeText={(text) => updateField('adresse', text)}
        style={styles.input}
        mode="outlined"
        disabled={disabled}
      />

      {/* Genre */}
      <TouchableOpacity
        style={[styles.selectButton, disabled && styles.disabled]}
        onPress={() => setGenreSheetVisible(true)}
        disabled={disabled}
      >
        <Text style={styles.selectLabel}>
          {i18nService.t('auth.register.genre') || 'Genre'} *
        </Text>
        <Text style={styles.selectedValue}>
          {selectedGenreLabel || i18nService.t('common.actions.select') || 'Sélectionner'}
        </Text>
      </TouchableOpacity>

      {/* Tranche d'âge */}
      <TouchableOpacity
        style={[styles.selectButton, disabled && styles.disabled]}
        onPress={() => setAgeSheetVisible(true)}
        disabled={disabled}
      >
        <Text style={styles.selectLabel}>
          {i18nService.t('auth.register.ageRange') || 'Tranche d\'âge'} *
        </Text>
        <Text style={styles.selectedValue}>
          {selectedAgeLabel || i18nService.t('common.actions.select') || 'Sélectionner'}
        </Text>
      </TouchableOpacity>

      {/* Situation professionnelle */}
      <TouchableOpacity
        style={[styles.selectButton, disabled && styles.disabled]}
        onPress={() => setSituationProfSheetVisible(true)}
        disabled={disabled}
      >
        <Text style={styles.selectLabel}>
          {i18nService.t('auth.register.situationProfessionnelle') || 'Situation professionnelle'}
        </Text>
        <Text style={styles.selectedValue}>
          {selectedSituationProfLabel || i18nService.t('common.actions.select') || 'Sélectionner'}
        </Text>
      </TouchableOpacity>

      {/* Profession (conditionnel) */}
      {formData.situation_professionnelle && ['EMPLOYE', 'INDEPENDANT'].includes(formData.situation_professionnelle) && (
        <TextInput
          label={i18nService.t('auth.register.profession') || 'Profession'}
          value={formData.profession}
          onChangeText={(text) => updateField('profession', text)}
          style={styles.input}
          mode="outlined"
          disabled={disabled}
          required
        />
      )}

      {/* Ville de résidence */}
      <TextInput
        label={i18nService.t('auth.register.villeResidence') || 'Ville de résidence'}
        value={formData.ville_residence}
        onChangeText={(text) => updateField('ville_residence', text)}
        style={styles.input}
        mode="outlined"
        disabled={disabled}
        required
      />

      {/* Origine */}
      <TouchableOpacity
        style={[styles.selectButton, disabled && styles.disabled]}
        onPress={() => setOrigineSheetVisible(true)}
        disabled={disabled}
      >
        <Text style={styles.selectLabel}>
          {i18nService.t('auth.register.originCountry') || 'Pays d\'origine'} *
        </Text>
        <Text style={styles.selectedValue}>
          {selectedOrigineLabel || i18nService.t('common.actions.select') || 'Sélectionner'}
        </Text>
      </TouchableOpacity>

      {/* Situation matrimoniale */}
      <TouchableOpacity
        style={[styles.selectButton, disabled && styles.disabled]}
        onPress={() => setSituationMatSheetVisible(true)}
        disabled={disabled}
      >
        <Text style={styles.selectLabel}>
          {i18nService.t('auth.register.situationMatrimoniale') || 'Situation matrimoniale'} *
        </Text>
        <Text style={styles.selectedValue}>
          {selectedSituationMatLabel || i18nService.t('common.actions.select') || 'Sélectionner'}
        </Text>
      </TouchableOpacity>

      {/* Niveau d'éducation */}
      <TouchableOpacity
        style={[styles.selectButton, disabled && styles.disabled]}
        onPress={() => setEducationSheetVisible(true)}
        disabled={disabled}
      >
        <Text style={styles.selectLabel}>
          {i18nService.t('auth.register.educationLevel') || 'Niveau d\'éducation'} *
        </Text>
        <Text style={styles.selectedValue}>
          {selectedEducationLabel || i18nService.t('common.actions.select') || 'Sélectionner'}
        </Text>
      </TouchableOpacity>

      {/* Qualification */}
      <TouchableOpacity
        style={[styles.selectButton, disabled && styles.disabled]}
        onPress={() => setQualificationSheetVisible(true)}
        disabled={disabled}
      >
        <Text style={styles.selectLabel}>
          {i18nService.t('auth.register.qualification') || 'Qualification'} *
        </Text>
        <Text style={styles.selectedValue}>
          {selectedQualificationLabel || i18nService.t('common.actions.select') || 'Sélectionner'}
        </Text>
      </TouchableOpacity>

      {/* Switch sert dans département */}
      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>
          {i18nService.t('networks.details.sertDepartement') || 'Sert dans un département'}
        </Text>
        <Switch
          value={sertDepartement}
          onValueChange={handleSertDepartementChange}
          disabled={disabled}
        />
      </View>

      {/* Sélection départements (si sert dans département) */}
      {sertDepartement && (
        <TouchableOpacity
          style={[styles.selectButton, disabled && styles.disabled]}
          onPress={() => setDepartmentsSheetVisible(true)}
          disabled={disabled}
        >
          <Text style={styles.selectLabel}>
            {i18nService.t('auth.register.departments') || 'Départements'} *
          </Text>
          <View style={styles.chipsContainer}>
            {selectedDepartmentsLabels.length > 0 ? (
              selectedDepartmentsLabels.map((label: string, index: number) => (
                <Chip key={index} style={styles.chip} textStyle={styles.chipText}>
                  {label}
                </Chip>
              ))
            ) : (
              <Text style={styles.selectedValue}>
                {i18nService.t('common.actions.select') || 'Sélectionner'}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      )}

      {/* BottomSheets */}
      <BottomSheet
        visible={genreSheetVisible}
        onClose={() => setGenreSheetVisible(false)}
        items={genreItems}
        onSelect={(item) => {
          updateField('genre', item.value);
          setGenreSheetVisible(false);
        }}
        title={i18nService.t('auth.register.genre') || 'Genre'}
      />

      <BottomSheet
        visible={ageSheetVisible}
        onClose={() => setAgeSheetVisible(false)}
        items={ageItems}
        onSelect={(item) => {
          updateField('tranche_age', item.value);
          setAgeSheetVisible(false);
        }}
        title={i18nService.t('auth.register.ageRange') || 'Tranche d\'âge'}
      />

      <BottomSheet
        visible={situationProfSheetVisible}
        onClose={() => setSituationProfSheetVisible(false)}
        items={situationProfItems}
        onSelect={(item) => {
          handleSituationProfessionnelleChange(item.value);
          setSituationProfSheetVisible(false);
        }}
        title={i18nService.t('auth.register.situationProfessionnelle') || 'Situation professionnelle'}
      />

      <BottomSheet
        visible={situationMatSheetVisible}
        onClose={() => setSituationMatSheetVisible(false)}
        items={situationMatItems}
        onSelect={(item) => {
          updateField('situation_matrimoniale', item.value);
          setSituationMatSheetVisible(false);
        }}
        title={i18nService.t('auth.register.situationMatrimoniale') || 'Situation matrimoniale'}
      />

      <BottomSheet
        visible={educationSheetVisible}
        onClose={() => setEducationSheetVisible(false)}
        items={educationItems}
        onSelect={(item) => {
          updateField('niveau_education', item.value);
          setEducationSheetVisible(false);
        }}
        title={i18nService.t('auth.register.educationLevel') || 'Niveau d\'éducation'}
      />

      <BottomSheet
        visible={qualificationSheetVisible}
        onClose={() => setQualificationSheetVisible(false)}
        items={qualificationItems}
        onSelect={(item) => {
          updateField('qualification', item.value);
          setQualificationSheetVisible(false);
        }}
        title={i18nService.t('auth.register.qualification') || 'Qualification'}
      />

      <BottomSheet
        visible={origineSheetVisible}
        onClose={() => setOrigineSheetVisible(false)}
        items={origineItems}
        onSelect={(item) => {
          updateField('origine', item.value);
          setOrigineSheetVisible(false);
        }}
        title={i18nService.t('auth.register.originCountry') || 'Pays d\'origine'}
      />

      <BottomSheet
        visible={departmentsSheetVisible}
        onClose={() => setDepartmentsSheetVisible(false)}
        items={departmentItems}
        onSelect={(item) => {
          const currentIds = formData.departement_ids || [];
          const itemValue = item.value as string;
          if (currentIds.includes(itemValue)) {
            updateField('departement_ids', currentIds.filter((id: string) => id !== itemValue));
          } else {
            updateField('departement_ids', [...currentIds, itemValue]);
          }
        }}
        title={i18nService.t('auth.register.departments') || 'Départements'}
        multiSelect
        selectedValues={formData.departement_ids || []}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  imagePreview: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: 'rgba(102, 45, 145, 0.2)',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  imagePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#bdbdbd',
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  imageButton: {
    backgroundColor: '#662d91',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  imageButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  imageHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  selectButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#f9f9f9',
    marginBottom: 16,
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
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    marginRight: 4,
    marginBottom: 4,
  },
  chipText: {
    fontSize: 12,
  },
});

