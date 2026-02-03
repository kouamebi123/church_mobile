import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  ActivityIndicator,
  Button,
  FAB,
  TextInput,
  Chip,
  Dialog,
  Portal,
  IconButton,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useSelectedChurch } from '../hooks/useSelectedChurch';
import { usePermissions } from '../hooks/usePermissions';
import { useLanguageUpdate } from '../hooks/useLanguageUpdate';
import { apiService } from '../services/apiService';
import BottomSheet from '../components/BottomSheet';
import EditServiceModal from '../components/services/EditServiceModal';
import i18nService from '../services/i18nService';
import { extractApiArray } from '../utils/apiResponse';
import { showApiError } from '../utils/errorHandler';
import { getId, getUserChurchId } from '../utils/idHelper';
import dayjs from 'dayjs';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Service {
  id?: string;
  _id?: string;
  culte: string;
  orateur: string;
  date: string;
  total_adultes: number;
  total_enfants: number;
  total_chantres: number;
  total_protocoles: number;
  total_multimedia: number;
  total_respo_ecodim: number;
  total_animateurs_ecodim: number;
  total_enfants_ecodim: number;
  nouvelle_naissance?: number;
  adultes_restants?: number;
  enfants_restants?: number;
  chantres_restants?: number;
  protocoles_restants?: number;
  multimedia_restants?: number;
  respo_ecodim_restants?: number;
  animateurs_ecodim_restants?: number;
  enfants_ecodim_restants?: number;
  invitationYoutube?: number;
  invitationTiktok?: number;
  invitationInstagram?: number;
  invitationPhysique?: number;
  superviseur?: {
    username: string;
    pseudo?: string;
  };
  collecteur_culte?: {
    username: string;
    pseudo?: string;
  };
  eglise?: {
    nom: string;
  };
}

type ServicesView = 'menu' | 'list' | 'form';

// Composant du formulaire de service
interface ServiceFormViewProps {
  onBack: () => void;
  selectedChurch: any;
  user: any;
}

const ServiceFormView: React.FC<ServiceFormViewProps> = ({ onBack, selectedChurch, user }) => {
  useLanguageUpdate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [superviseurs, setSuperviseurs] = useState<any[]>([]);
  const [speakers, setSpeakers] = useState<Array<{ id: string; nom: string; description?: string }>>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showSuperviseurMenu, setShowSuperviseurMenu] = useState(false);
  const [showSpeakerMenu, setShowSpeakerMenu] = useState(false);
  const [successDialogVisible, setSuccessDialogVisible] = useState(false);
  const [newSpeakerDialogVisible, setNewSpeakerDialogVisible] = useState(false);
  const [newSpeakerName, setNewSpeakerName] = useState('');
  const [newSpeakerDescription, setNewSpeakerDescription] = useState('');
  const [creatingSpeaker, setCreatingSpeaker] = useState(false);
  const [serviceTypes, setServiceTypes] = useState<Array<{ id: string; nom: string }>>([]);

  // Schéma de validation
  const validationSchema = Yup.object({
    culte: Yup.string().required(i18nService.t('errors.validation.typeCulteRequired')),
    orateur: Yup.string().required(i18nService.t('errors.validation.orateurRequired')),
    date: Yup.date().required(i18nService.t('errors.validation.dateRequired')),
    total_adultes: Yup.number()
      .min(0, i18nService.t('errors.validation.numberMustBePositive'))
      .required(i18nService.t('errors.validation.adultsRequired')),
    total_enfants: Yup.number()
      .min(0, i18nService.t('errors.validation.numberMustBePositive'))
      .required(i18nService.t('errors.validation.childrenRequired')),
    total_chantres: Yup.number()
      .min(0, i18nService.t('errors.validation.numberMustBePositive'))
      .required(i18nService.t('errors.validation.chantresRequired')),
    total_protocoles: Yup.number()
      .min(0, i18nService.t('errors.validation.numberMustBePositive'))
      .required(i18nService.t('errors.validation.protocolesRequired')),
    total_multimedia: Yup.number()
      .min(0, i18nService.t('errors.validation.numberMustBePositive'))
      .required(i18nService.t('errors.validation.multimediaRequired')),
    total_respo_ecodim: Yup.number()
      .min(0, i18nService.t('errors.validation.numberMustBePositive'))
      .required(i18nService.t('errors.validation.ecodimResponsibleRequired')),
    total_animateurs_ecodim: Yup.number()
      .min(0, i18nService.t('errors.validation.numberMustBePositive'))
      .required(i18nService.t('errors.validation.ecodimAnimatorsRequired')),
    total_enfants_ecodim: Yup.number()
      .min(0, i18nService.t('errors.validation.numberMustBePositive'))
      .required(i18nService.t('errors.validation.ecodimChildrenRequired')),
    nouvelle_naissance: Yup.number().min(0, i18nService.t('errors.validation.numberMustBePositive')),
    adultes_restants: Yup.number().min(0, i18nService.t('errors.validation.numberMustBePositive')),
    enfants_restants: Yup.number().min(0, i18nService.t('errors.validation.numberMustBePositive')),
    chantres_restants: Yup.number().min(0, i18nService.t('errors.validation.numberMustBePositive')),
    protocoles_restants: Yup.number().min(0, i18nService.t('errors.validation.numberMustBePositive')),
    multimedia_restants: Yup.number().min(0, i18nService.t('errors.validation.numberMustBePositive')),
    respo_ecodim_restants: Yup.number().min(0, i18nService.t('errors.validation.numberMustBePositive')),
    animateurs_ecodim_restants: Yup.number().min(0, i18nService.t('errors.validation.numberMustBePositive')),
    enfants_ecodim_restants: Yup.number().min(0, i18nService.t('errors.validation.numberMustBePositive')),
    superviseur: Yup.string().required(i18nService.t('errors.validation.supervisorRequired')),
    invitationYoutube: Yup.number().min(0, i18nService.t('errors.validation.numberMustBePositive')),
    invitationTiktok: Yup.number().min(0, i18nService.t('errors.validation.numberMustBePositive')),
    invitationInstagram: Yup.number().min(0, i18nService.t('errors.validation.numberMustBePositive')),
    invitationPhysique: Yup.number().min(0, i18nService.t('errors.validation.numberMustBePositive')),
  });

  // Charger les types de culte depuis l'API
  useEffect(() => {
    const fetchServiceTypes = async () => {
      try {
        const response = await apiService.referenceData.serviceTypes.getAll();
        const typesData = extractApiArray<{ id: string; nom: string }>(response);
        setServiceTypes(typesData);
      } catch (err: any) {
        console.error('Erreur lors du chargement des types de culte:', err);
        // En cas d'erreur, utiliser une liste par défaut
        setServiceTypes([
          { id: '1', nom: 'Culte 1' },
          { id: '2', nom: 'Culte 2' },
          { id: '3', nom: 'Culte 3' },
        ]);
      }
    };

    fetchServiceTypes();
  }, []);

  // Charger les superviseurs
  useEffect(() => {
    const fetchSuperviseurs = async () => {
      try {
        setLoading(true);
        const response = await apiService.users.getAll({ role: 'SUPERVISEUR' });
        const superviseursData = extractApiArray<any>(response);
        setSuperviseurs(superviseursData);
      } catch (err: any) {
        console.error('Erreur lors du chargement des superviseurs:', err);
        setError(err.response?.data?.message || err.message || i18nService.t('errors.api.loadUsers'));
      } finally {
        setLoading(false);
      }
    };

    fetchSuperviseurs();
  }, []);

  // Charger les orateurs
  useEffect(() => {
    const fetchSpeakers = async () => {
      try {
        const response = await apiService.referenceData.speakers.getAll();
        const speakersData = extractApiArray<{ id: string; nom: string; description?: string; active?: boolean }>(response);
        setSpeakers(speakersData.filter((s) => s.active !== false));
      } catch (err: any) {
        console.warn('Erreur lors du chargement des orateurs:', err);
        // Ne pas bloquer le chargement si les orateurs ne peuvent pas être chargés
      }
    };

    fetchSpeakers();
  }, []);

  // Créer un nouvel orateur
  const handleCreateSpeaker = async () => {
    if (!newSpeakerName.trim()) {
      Alert.alert(i18nService.t('errors.error'), i18nService.t('services.errors.speakerNameRequired'));
      return;
    }

    setCreatingSpeaker(true);
    try {
      const newSpeaker = await apiService.referenceData.speakers.create({
        nom: newSpeakerName.trim(),
        description: newSpeakerDescription.trim() || null,
        active: true
      });

      const speakerData = newSpeaker.data?.data || newSpeaker.data;
      setSpeakers([...speakers, speakerData]);
      
      // Sélectionner automatiquement le nouvel orateur
      formik.setFieldValue('orateur', speakerData.nom);
      
      setNewSpeakerDialogVisible(false);
      setNewSpeakerName('');
      setNewSpeakerDescription('');
      Alert.alert(i18nService.t('success.success'), i18nService.t('success.speakerCreated'));
    } catch (error: any) {
      showApiError(error, 'services.errors.createSpeaker');
    } finally {
      setCreatingSpeaker(false);
    }
  };

  const formik = useFormik({
    initialValues: {
      culte: '',
      orateur: '',
      date: new Date(),
      total_adultes: '',
      total_enfants: '',
      total_chantres: '',
      total_protocoles: '',
      total_multimedia: '',
      total_respo_ecodim: '',
      total_animateurs_ecodim: '',
      total_enfants_ecodim: '',
      nouvelle_naissance: '0',
      adultes_restants: '0',
      enfants_restants: '0',
      chantres_restants: '0',
      protocoles_restants: '0',
      multimedia_restants: '0',
      respo_ecodim_restants: '0',
      animateurs_ecodim_restants: '0',
      enfants_ecodim_restants: '0',
      superviseur: '',
      invitationYoutube: '0',
      invitationTiktok: '0',
      invitationInstagram: '0',
      invitationPhysique: '0',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        // Vérifier que l'église est sélectionnée
        if (!selectedChurch?.id && !selectedChurch?._id) {
          Alert.alert(
            i18nService.t('errors.error'),
            i18nService.t('errors.api.selectChurch')
          );
          return;
        }

        // Vérifier que l'utilisateur est connecté
        if (!user?.id && !user?._id) {
          Alert.alert(
            i18nService.t('errors.error'),
            i18nService.t('errors.user.notConnected')
          );
          return;
        }

        setSubmitting(true);

        // Convertir les valeurs numériques en nombres et adapter au format backend
        // Formater la date au format ISO pour le backend
        const formattedDate = values.date instanceof Date 
          ? values.date.toISOString() 
          : values.date;

        const formattedValues = {
          date: formattedDate,
          culte: values.culte,
          orateur: values.orateur,
          eglise_id: selectedChurch.id || selectedChurch._id,
          nombre_present: Number(values.total_adultes) + Number(values.total_enfants),
          responsable_id: values.superviseur || null,
          total_adultes: Number(values.total_adultes),
          total_enfants: Number(values.total_enfants),
          total_chantres: Number(values.total_chantres),
          total_protocoles: Number(values.total_protocoles),
          total_multimedia: Number(values.total_multimedia),
          total_respo_ecodim: Number(values.total_respo_ecodim),
          total_animateurs_ecodim: Number(values.total_animateurs_ecodim),
          total_enfants_ecodim: Number(values.total_enfants_ecodim),
          nouvelle_naissance: Number(values.nouvelle_naissance),
          adultes_restants: Number(values.adultes_restants),
          enfants_restants: Number(values.enfants_restants),
          chantres_restants: Number(values.chantres_restants),
          protocoles_restants: Number(values.protocoles_restants),
          multimedia_restants: Number(values.multimedia_restants),
          respo_ecodim_restants: Number(values.respo_ecodim_restants),
          animateurs_ecodim_restants: Number(values.animateurs_ecodim_restants),
          enfants_ecodim_restants: Number(values.enfants_ecodim_restants),
          collecteur_culte_id: user?.id || user?._id,
          superviseur_id: values.superviseur,
          invitationYoutube: Number(values.invitationYoutube),
          invitationTiktok: Number(values.invitationTiktok),
          invitationInstagram: Number(values.invitationInstagram),
          invitationPhysique: Number(values.invitationPhysique),
        };

        await apiService.services.create(formattedValues);
        setSuccessDialogVisible(true);
        formik.resetForm();
      } catch (error: any) {
        console.error('Erreur lors de la création du service:', error);
        showApiError(error, 'errors.api.createService');
      } finally {
        setSubmitting(false);
      }
    },
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#662d91" />
          <Text style={styles.loadingText}>{i18nService.t('common.actions.loading')}</Text>
        </View>
      </View>
    );
  }

  // Vérifier qu'une église est sélectionnée
  if (!selectedChurch?.id && !selectedChurch?._id) {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color="#662d91" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {i18nService.t('services.form.title')}
            </Text>
            <View style={styles.headerDivider} />
          </View>
          <View style={styles.content}>
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                {i18nService.t('home.noChurchSelected')}
              </Text>
              <Text style={styles.emptySubtext}>
                {i18nService.t('home.selectChurchForService')}
              </Text>
            </Card>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#662d91" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {i18nService.t('services.form.title')}
          </Text>
          <View style={styles.headerDivider} />
          {selectedChurch && (
            <Text style={styles.headerSubtitle}>
              {i18nService.t('services.list.church')}: {selectedChurch.nom}
            </Text>
          )}
        </View>

        <View style={styles.formContainer}>
          {/* Section: Informations générales */}
          <Card style={styles.formSectionCard}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="info" size={24} color="#662d91" />
                <Text style={styles.sectionTitle}>
                  {i18nService.t('services.form.generalInfo') || 'Informations générales'}
                </Text>
              </View>

              {/* Type de culte */}
              <View style={styles.formField}>
                <View style={styles.labelContainer}>
                  <MaterialIcons name="event" size={18} color="#662d91" style={styles.labelIcon} />
                  <Text style={styles.formLabel}>
                    {i18nService.t('services.list.typeCulte')} *
                  </Text>
                </View>
                <Button
                  mode="outlined"
                  onPress={() => setShowTypeMenu(true)}
                  style={styles.formSelectButton}
                  contentStyle={styles.formSelectButtonContent}
                  labelStyle={styles.formSelectButtonLabel}
                  icon="chevron-down"
                >
                  {formik.values.culte || i18nService.t('services.list.typeCulte')}
                </Button>
                <BottomSheet
                  visible={showTypeMenu}
                  onClose={() => setShowTypeMenu(false)}
                  items={serviceTypes.map((option) => ({
                    label: option.nom,
                    value: option.nom,
                  }))}
                  onSelect={(item) => {
                    formik.setFieldValue('culte', item.value);
                    setShowTypeMenu(false);
                  }}
                  title={i18nService.t('services.list.typeCulte')}
                />
                {formik.touched.culte && formik.errors.culte && (
                  <Text style={styles.formError}>{formik.errors.culte}</Text>
                )}
              </View>

              {/* Date */}
              <View style={styles.formField}>
                <View style={styles.labelContainer}>
                  <MaterialIcons name="calendar-today" size={18} color="#662d91" style={styles.labelIcon} />
                  <Text style={styles.formLabel}>
                    {i18nService.t('services.list.dateCulte')} *
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={styles.dateButton}
                >
                  <Text style={styles.dateButtonText}>
                    {dayjs(formik.values.date).format('DD/MM/YYYY')}
                  </Text>
                  <MaterialIcons name="calendar-today" size={20} color="#662d91" />
                </TouchableOpacity>
                {formik.touched.date && formik.errors.date && (
                  <Text style={styles.formError}>
                    {typeof formik.errors.date === 'string' ? formik.errors.date : i18nService.t('errors.validation.dateRequired')}
                  </Text>
                )}
                {showDatePicker && (
                  <DateTimePicker
                    value={formik.values.date}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                      if (Platform.OS === 'android') {
                        setShowDatePicker(false);
                      }
                      if (event.type === 'set' && selectedDate) {
                        formik.setFieldValue('date', selectedDate);
                        if (Platform.OS === 'ios') {
                          setShowDatePicker(false);
                        }
                      } else if (event.type === 'dismissed') {
                        setShowDatePicker(false);
                      }
                    }}
                  />
                )}
              </View>

              {/* Orateur */}
              <View style={styles.formField}>
                <View style={styles.labelContainer}>
                  <MaterialIcons name="mic" size={18} color="#662d91" style={styles.labelIcon} />
                  <Text style={styles.formLabel}>
                    {i18nService.t('services.list.orateur')} *
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button
                    mode="outlined"
                    onPress={() => setShowSpeakerMenu(true)}
                    style={[styles.formSelectButton, { flex: 1 }]}
                    contentStyle={styles.formSelectButtonContent}
                    labelStyle={styles.formSelectButtonLabel}
                    icon="chevron-down"
                  >
                    {formik.values.orateur || i18nService.t('services.list.orateur')}
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => setNewSpeakerDialogVisible(true)}
                    style={styles.formSelectButton}
                    contentStyle={styles.formSelectButtonContent}
                    labelStyle={styles.formSelectButtonLabel}
                    icon="add"
                  >
                    {''}
                  </Button>
                </View>
                <BottomSheet
                  visible={showSpeakerMenu}
                  onClose={() => setShowSpeakerMenu(false)}
                  items={speakers.map((speaker) => ({
                    label: speaker.nom,
                    value: speaker.nom,
                  }))}
                  onSelect={(item) => {
                    formik.setFieldValue('orateur', item.value);
                    setShowSpeakerMenu(false);
                  }}
                  title={i18nService.t('services.list.orateur')}
                />
                {formik.touched.orateur && formik.errors.orateur && (
                  <Text style={styles.formError}>{formik.errors.orateur}</Text>
                )}
              </View>

              {/* Superviseur */}
              <View style={styles.formField}>
                <View style={styles.labelContainer}>
                  <MaterialIcons name="supervisor-account" size={18} color="#662d91" style={styles.labelIcon} />
                  <Text style={styles.formLabel}>
                    {i18nService.t('services.form.supervisor')} *
                  </Text>
                </View>
                <Button
                  mode="outlined"
                  onPress={() => setShowSuperviseurMenu(true)}
                  style={styles.formSelectButton}
                  contentStyle={styles.formSelectButtonContent}
                  labelStyle={styles.formSelectButtonLabel}
                  icon="chevron-down"
                >
                  {superviseurs.find(s => (s.id || s._id) === formik.values.superviseur)?.username || 
                   superviseurs.find(s => (s.id || s._id) === formik.values.superviseur)?.pseudo ||
                   i18nService.t('services.list.selectSuperviseur')}
                </Button>
                <BottomSheet
                  visible={showSuperviseurMenu}
                  onClose={() => setShowSuperviseurMenu(false)}
                  items={
                    superviseurs.length > 0
                      ? superviseurs.map((superviseur) => ({
                          label: superviseur.username || superviseur.pseudo || i18nService.t('common_text.unknownName'),
                          value: superviseur.id || superviseur._id || '',
                        }))
                      : [
                          {
                            label: i18nService.t('services.list.noSuperviseur'),
                            value: '',
                            disabled: true,
                          },
                        ]
                  }
                  onSelect={(item) => {
                    if (!item.disabled) {
                      formik.setFieldValue('superviseur', item.value);
                      setShowSuperviseurMenu(false);
                    }
                  }}
                  title={i18nService.t('services.form.supervisor')}
                />
                {formik.touched.superviseur && formik.errors.superviseur && (
                  <Text style={styles.formError}>{formik.errors.superviseur}</Text>
                )}
              </View>
            </Card.Content>
          </Card>

          {/* Section: Présence */}
          <Card style={styles.formSectionCard}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="people" size={24} color="#662d91" />
                <Text style={styles.sectionTitle}>
                  {i18nService.t('services.form.presence') || 'Présence'}
                </Text>
              </View>

              {/* Totaux - Adultes */}
              <View style={styles.formField}>
                <View style={styles.labelContainer}>
                  <MaterialIcons name="person" size={18} color="#662d91" style={styles.labelIcon} />
                  <Text style={styles.formLabel}>
                    {i18nService.t('services.list.nombreAdultes')} *
                  </Text>
                </View>
                <TextInput
                  mode="outlined"
                  value={formik.values.total_adultes}
                  onChangeText={formik.handleChange('total_adultes')}
                  onBlur={formik.handleBlur('total_adultes')}
                  keyboardType="numeric"
                  error={formik.touched.total_adultes && Boolean(formik.errors.total_adultes)}
                  style={styles.formInput}
                  placeholder="0"
                />
                {formik.touched.total_adultes && formik.errors.total_adultes && (
                  <Text style={styles.formError}>{formik.errors.total_adultes}</Text>
                )}
              </View>

              {/* Adultes restants */}
              <View style={styles.formField}>
                <View style={styles.labelContainer}>
                  <MaterialIcons name="person-outline" size={18} color="#662d91" style={styles.labelIcon} />
                  <Text style={styles.formLabel}>
                    {i18nService.t('services.list.adultesRestants')}
                  </Text>
                </View>
                <TextInput
                  mode="outlined"
                  value={formik.values.adultes_restants}
                  onChangeText={formik.handleChange('adultes_restants')}
                  onBlur={formik.handleBlur('adultes_restants')}
                  keyboardType="numeric"
                  error={formik.touched.adultes_restants && Boolean(formik.errors.adultes_restants)}
                  style={styles.formInput}
                  placeholder="0"
                />
                {formik.touched.adultes_restants && formik.errors.adultes_restants && (
                  <Text style={styles.formError}>{formik.errors.adultes_restants}</Text>
                )}
              </View>

              {/* Totaux - Enfants */}
              <View style={styles.formField}>
                <View style={styles.labelContainer}>
                  <MaterialIcons name="child-care" size={18} color="#662d91" style={styles.labelIcon} />
                  <Text style={styles.formLabel}>
                    {i18nService.t('services.list.nombreEnfants')} *
                  </Text>
                </View>
                <TextInput
                  mode="outlined"
                  value={formik.values.total_enfants}
                  onChangeText={formik.handleChange('total_enfants')}
                  onBlur={formik.handleBlur('total_enfants')}
                  keyboardType="numeric"
                  error={formik.touched.total_enfants && Boolean(formik.errors.total_enfants)}
                  style={styles.formInput}
                  placeholder="0"
                />
                {formik.touched.total_enfants && formik.errors.total_enfants && (
                  <Text style={styles.formError}>{formik.errors.total_enfants}</Text>
                )}
              </View>

              {/* Enfants restants */}
              <View style={styles.formField}>
                <View style={styles.labelContainer}>
                  <MaterialIcons name="child-care" size={18} color="#662d91" style={styles.labelIcon} />
                  <Text style={styles.formLabel}>
                    {i18nService.t('services.list.enfantsRestants')}
                  </Text>
                </View>
                <TextInput
                  mode="outlined"
                  value={formik.values.enfants_restants}
                  onChangeText={formik.handleChange('enfants_restants')}
                  onBlur={formik.handleBlur('enfants_restants')}
                  keyboardType="numeric"
                  error={formik.touched.enfants_restants && Boolean(formik.errors.enfants_restants)}
                  style={styles.formInput}
                  placeholder="0"
                />
                {formik.touched.enfants_restants && formik.errors.enfants_restants && (
                  <Text style={styles.formError}>{formik.errors.enfants_restants}</Text>
                )}
              </View>
            </Card.Content>
          </Card>

          {/* Section: Équipes de service */}
          <Card style={styles.formSectionCard}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="groups" size={24} color="#662d91" />
                <Text style={styles.sectionTitle}>
                  {i18nService.t('services.form.serviceTeams') || 'Équipes de service'}
                </Text>
              </View>

              {/* Totaux - Chantres */}
              <View style={styles.formField}>
                <View style={styles.labelContainer}>
                  <MaterialIcons name="music-note" size={18} color="#662d91" style={styles.labelIcon} />
                  <Text style={styles.formLabel}>
                    {i18nService.t('services.list.nombreChantres')} *
                  </Text>
                </View>
                <TextInput
                  mode="outlined"
                  value={formik.values.total_chantres}
                  onChangeText={formik.handleChange('total_chantres')}
                  onBlur={formik.handleBlur('total_chantres')}
                  keyboardType="numeric"
                  error={formik.touched.total_chantres && Boolean(formik.errors.total_chantres)}
                  style={styles.formInput}
                  placeholder="0"
                />
                {formik.touched.total_chantres && formik.errors.total_chantres && (
                  <Text style={styles.formError}>{formik.errors.total_chantres}</Text>
                )}
              </View>

              {/* Chantres restants */}
              <View style={styles.formField}>
                <View style={styles.labelContainer}>
                  <MaterialIcons name="music-note" size={18} color="#662d91" style={styles.labelIcon} />
                  <Text style={styles.formLabel}>
                    {i18nService.t('services.list.chantresRestants')}
                  </Text>
                </View>
                <TextInput
                  mode="outlined"
                  value={formik.values.chantres_restants}
                  onChangeText={formik.handleChange('chantres_restants')}
                  onBlur={formik.handleBlur('chantres_restants')}
                  keyboardType="numeric"
                  error={formik.touched.chantres_restants && Boolean(formik.errors.chantres_restants)}
                  style={styles.formInput}
                  placeholder="0"
                />
                {formik.touched.chantres_restants && formik.errors.chantres_restants && (
                  <Text style={styles.formError}>{formik.errors.chantres_restants}</Text>
                )}
              </View>

              {/* Totaux - Protocoles */}
              <View style={styles.formField}>
                <View style={styles.labelContainer}>
                  <MaterialIcons name="event-seat" size={18} color="#662d91" style={styles.labelIcon} />
                  <Text style={styles.formLabel}>
                    {i18nService.t('services.list.nombreProtocoles')} *
                  </Text>
                </View>
                <TextInput
                  mode="outlined"
                  value={formik.values.total_protocoles}
                  onChangeText={formik.handleChange('total_protocoles')}
                  onBlur={formik.handleBlur('total_protocoles')}
                  keyboardType="numeric"
                  error={formik.touched.total_protocoles && Boolean(formik.errors.total_protocoles)}
                  style={styles.formInput}
                  placeholder="0"
                />
                {formik.touched.total_protocoles && formik.errors.total_protocoles && (
                  <Text style={styles.formError}>{formik.errors.total_protocoles}</Text>
                )}
              </View>

              {/* Protocoles restants */}
              <View style={styles.formField}>
                <View style={styles.labelContainer}>
                  <MaterialIcons name="event-seat" size={18} color="#662d91" style={styles.labelIcon} />
                  <Text style={styles.formLabel}>
                    {i18nService.t('services.list.protocolesRestants')}
                  </Text>
                </View>
                <TextInput
                  mode="outlined"
                  value={formik.values.protocoles_restants}
                  onChangeText={formik.handleChange('protocoles_restants')}
                  onBlur={formik.handleBlur('protocoles_restants')}
                  keyboardType="numeric"
                  error={formik.touched.protocoles_restants && Boolean(formik.errors.protocoles_restants)}
                  style={styles.formInput}
                  placeholder="0"
                />
                {formik.touched.protocoles_restants && formik.errors.protocoles_restants && (
                  <Text style={styles.formError}>{formik.errors.protocoles_restants}</Text>
                )}
              </View>

              {/* Totaux - Multimédia */}
              <View style={styles.formField}>
                <View style={styles.labelContainer}>
                  <MaterialIcons name="videocam" size={18} color="#662d91" style={styles.labelIcon} />
                  <Text style={styles.formLabel}>
                    {i18nService.t('services.list.nombreMultimedia')} *
                  </Text>
                </View>
                <TextInput
                  mode="outlined"
                  value={formik.values.total_multimedia}
                  onChangeText={formik.handleChange('total_multimedia')}
                  onBlur={formik.handleBlur('total_multimedia')}
                  keyboardType="numeric"
                  error={formik.touched.total_multimedia && Boolean(formik.errors.total_multimedia)}
                  style={styles.formInput}
                  placeholder="0"
                />
                {formik.touched.total_multimedia && formik.errors.total_multimedia && (
                  <Text style={styles.formError}>{formik.errors.total_multimedia}</Text>
                )}
              </View>

              {/* Multimédia restants */}
              <View style={styles.formField}>
                <View style={styles.labelContainer}>
                  <MaterialIcons name="videocam" size={18} color="#662d91" style={styles.labelIcon} />
                  <Text style={styles.formLabel}>
                    {i18nService.t('services.list.multimediaRestants')}
                  </Text>
                </View>
                <TextInput
                  mode="outlined"
                  value={formik.values.multimedia_restants}
                  onChangeText={formik.handleChange('multimedia_restants')}
                  onBlur={formik.handleBlur('multimedia_restants')}
                  keyboardType="numeric"
                  error={formik.touched.multimedia_restants && Boolean(formik.errors.multimedia_restants)}
                  style={styles.formInput}
                  placeholder="0"
                />
                {formik.touched.multimedia_restants && formik.errors.multimedia_restants && (
                  <Text style={styles.formError}>{formik.errors.multimedia_restants}</Text>
                )}
              </View>
            </Card.Content>
          </Card>

          {/* Section: ECODIM */}
          <Card style={styles.formSectionCard}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="child-care" size={24} color="#662d91" />
                <Text style={styles.sectionTitle}>
                  {i18nService.t('services.form.ecodim') || 'ECODIM'}
                </Text>
              </View>

              {/* Totaux - Responsable ECODIM */}
              <View style={styles.formField}>
                <View style={styles.labelContainer}>
                  <MaterialIcons name="person" size={18} color="#662d91" style={styles.labelIcon} />
                  <Text style={styles.formLabel}>
                    {i18nService.t('services.list.responsableEcodim')} *
                  </Text>
                </View>
                <TextInput
                  mode="outlined"
                  value={formik.values.total_respo_ecodim}
                  onChangeText={formik.handleChange('total_respo_ecodim')}
                  onBlur={formik.handleBlur('total_respo_ecodim')}
                  keyboardType="numeric"
                  error={formik.touched.total_respo_ecodim && Boolean(formik.errors.total_respo_ecodim)}
                  style={styles.formInput}
                  placeholder="0"
                />
                {formik.touched.total_respo_ecodim && formik.errors.total_respo_ecodim && (
                  <Text style={styles.formError}>{formik.errors.total_respo_ecodim}</Text>
                )}
              </View>

              {/* Responsables Ecodim restants */}
              <View style={styles.formField}>
                <View style={styles.labelContainer}>
                  <MaterialIcons name="person-outline" size={18} color="#662d91" style={styles.labelIcon} />
                  <Text style={styles.formLabel}>
                    {i18nService.t('services.list.respoEcodimRestants')}
                  </Text>
                </View>
                <TextInput
                  mode="outlined"
                  value={formik.values.respo_ecodim_restants}
                  onChangeText={formik.handleChange('respo_ecodim_restants')}
                  onBlur={formik.handleBlur('respo_ecodim_restants')}
                  keyboardType="numeric"
                  error={formik.touched.respo_ecodim_restants && Boolean(formik.errors.respo_ecodim_restants)}
                  style={styles.formInput}
                  placeholder="0"
                />
                {formik.touched.respo_ecodim_restants && formik.errors.respo_ecodim_restants && (
                  <Text style={styles.formError}>{formik.errors.respo_ecodim_restants}</Text>
                )}
              </View>

              {/* Totaux - Animateurs ECODIM */}
              <View style={styles.formField}>
                <View style={styles.labelContainer}>
                  <MaterialIcons name="people" size={18} color="#662d91" style={styles.labelIcon} />
                  <Text style={styles.formLabel}>
                    {i18nService.t('services.list.nombreAnimateurs')} *
                  </Text>
                </View>
                <TextInput
                  mode="outlined"
                  value={formik.values.total_animateurs_ecodim}
                  onChangeText={formik.handleChange('total_animateurs_ecodim')}
                  onBlur={formik.handleBlur('total_animateurs_ecodim')}
                  keyboardType="numeric"
                  error={formik.touched.total_animateurs_ecodim && Boolean(formik.errors.total_animateurs_ecodim)}
                  style={styles.formInput}
                  placeholder="0"
                />
                {formik.touched.total_animateurs_ecodim && formik.errors.total_animateurs_ecodim && (
                  <Text style={styles.formError}>{formik.errors.total_animateurs_ecodim}</Text>
                )}
              </View>

              {/* Animateurs Ecodim restants */}
              <View style={styles.formField}>
                <View style={styles.labelContainer}>
                  <MaterialIcons name="people-outline" size={18} color="#662d91" style={styles.labelIcon} />
                  <Text style={styles.formLabel}>
                    {i18nService.t('services.list.animateursEcodimRestants')}
                  </Text>
                </View>
                <TextInput
                  mode="outlined"
                  value={formik.values.animateurs_ecodim_restants}
                  onChangeText={formik.handleChange('animateurs_ecodim_restants')}
                  onBlur={formik.handleBlur('animateurs_ecodim_restants')}
                  keyboardType="numeric"
                  error={formik.touched.animateurs_ecodim_restants && Boolean(formik.errors.animateurs_ecodim_restants)}
                  style={styles.formInput}
                  placeholder="0"
                />
                {formik.touched.animateurs_ecodim_restants && formik.errors.animateurs_ecodim_restants && (
                  <Text style={styles.formError}>{formik.errors.animateurs_ecodim_restants}</Text>
                )}
              </View>

              {/* Totaux - Enfants ECODIM */}
              <View style={styles.formField}>
                <View style={styles.labelContainer}>
                  <MaterialIcons name="child-care" size={18} color="#662d91" style={styles.labelIcon} />
                  <Text style={styles.formLabel}>
                    {i18nService.t('services.list.nombreEnfants')} {i18nService.t('services.list.enfEcodim')} *
                  </Text>
                </View>
                <TextInput
                  mode="outlined"
                  value={formik.values.total_enfants_ecodim}
                  onChangeText={formik.handleChange('total_enfants_ecodim')}
                  onBlur={formik.handleBlur('total_enfants_ecodim')}
                  keyboardType="numeric"
                  error={formik.touched.total_enfants_ecodim && Boolean(formik.errors.total_enfants_ecodim)}
                  style={styles.formInput}
                  placeholder="0"
                />
                {formik.touched.total_enfants_ecodim && formik.errors.total_enfants_ecodim && (
                  <Text style={styles.formError}>{formik.errors.total_enfants_ecodim}</Text>
                )}
              </View>

              {/* Enfants Ecodim restants */}
              <View style={styles.formField}>
                <View style={styles.labelContainer}>
                  <MaterialIcons name="child-care" size={18} color="#662d91" style={styles.labelIcon} />
                  <Text style={styles.formLabel}>
                    {i18nService.t('services.list.enfantsEcodimRestants')}
                  </Text>
                </View>
                <TextInput
                  mode="outlined"
                  value={formik.values.enfants_ecodim_restants}
                  onChangeText={formik.handleChange('enfants_ecodim_restants')}
                  onBlur={formik.handleBlur('enfants_ecodim_restants')}
                  keyboardType="numeric"
                  error={formik.touched.enfants_ecodim_restants && Boolean(formik.errors.enfants_ecodim_restants)}
                  style={styles.formInput}
                  placeholder="0"
                />
                {formik.touched.enfants_ecodim_restants && formik.errors.enfants_ecodim_restants && (
                  <Text style={styles.formError}>{formik.errors.enfants_ecodim_restants}</Text>
                )}
              </View>
            </Card.Content>
          </Card>

          {/* Section: Nouvelle naissance */}
          <Card style={styles.formSectionCard}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="favorite" size={24} color="#662d91" />
                <Text style={styles.sectionTitle}>
                  Nouvelle naissance
                </Text>
              </View>

              {/* Nouvelle naissance */}
              <View style={styles.formField}>
                <View style={styles.labelContainer}>
                  <MaterialIcons name="favorite" size={18} color="#662d91" style={styles.labelIcon} />
                  <Text style={styles.formLabel}>
                    Nouvelle naissance
                  </Text>
                </View>
                <TextInput
                  mode="outlined"
                  value={formik.values.nouvelle_naissance}
                  onChangeText={formik.handleChange('nouvelle_naissance')}
                  onBlur={formik.handleBlur('nouvelle_naissance')}
                  keyboardType="numeric"
                  error={formik.touched.nouvelle_naissance && Boolean(formik.errors.nouvelle_naissance)}
                  style={styles.formInput}
                  placeholder="0"
                />
                {formik.touched.nouvelle_naissance && formik.errors.nouvelle_naissance && (
                  <Text style={styles.formError}>{formik.errors.nouvelle_naissance}</Text>
                )}
              </View>
            </Card.Content>
          </Card>

          {/* Section: Invitations */}
          <Card style={styles.formSectionCard}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="share" size={24} color="#662d91" />
                <Text style={styles.sectionTitle}>
                  {i18nService.t('services.form.invitations') || 'Invitations'}
                </Text>
              </View>

              {/* Invitations - YouTube */}
              <View style={styles.formField}>
                <View style={styles.labelContainer}>
                  <MaterialIcons name="play-circle" size={18} color="#662d91" style={styles.labelIcon} />
                  <Text style={styles.formLabel}>
                    {i18nService.t('services.list.invitationsYoutube')}
                  </Text>
                </View>
                <TextInput
                  mode="outlined"
                  value={formik.values.invitationYoutube}
                  onChangeText={formik.handleChange('invitationYoutube')}
                  onBlur={formik.handleBlur('invitationYoutube')}
                  keyboardType="numeric"
                  error={formik.touched.invitationYoutube && Boolean(formik.errors.invitationYoutube)}
                  style={styles.formInput}
                  placeholder="0"
                />
                {formik.touched.invitationYoutube && formik.errors.invitationYoutube && (
                  <Text style={styles.formError}>{formik.errors.invitationYoutube}</Text>
                )}
              </View>

              {/* Invitations - TikTok */}
              <View style={styles.formField}>
                <View style={styles.labelContainer}>
                  <MaterialIcons name="video-library" size={18} color="#662d91" style={styles.labelIcon} />
                  <Text style={styles.formLabel}>
                    {i18nService.t('services.list.invitationsTiktok')}
                  </Text>
                </View>
                <TextInput
                  mode="outlined"
                  value={formik.values.invitationTiktok}
                  onChangeText={formik.handleChange('invitationTiktok')}
                  onBlur={formik.handleBlur('invitationTiktok')}
                  keyboardType="numeric"
                  error={formik.touched.invitationTiktok && Boolean(formik.errors.invitationTiktok)}
                  style={styles.formInput}
                  placeholder="0"
                />
                {formik.touched.invitationTiktok && formik.errors.invitationTiktok && (
                  <Text style={styles.formError}>{formik.errors.invitationTiktok}</Text>
                )}
              </View>

              {/* Invitations - Instagram */}
              <View style={styles.formField}>
                <View style={styles.labelContainer}>
                  <MaterialIcons name="photo-camera" size={18} color="#662d91" style={styles.labelIcon} />
                  <Text style={styles.formLabel}>
                    {i18nService.t('services.list.invitationsInstagram')}
                  </Text>
                </View>
                <TextInput
                  mode="outlined"
                  value={formik.values.invitationInstagram}
                  onChangeText={formik.handleChange('invitationInstagram')}
                  onBlur={formik.handleBlur('invitationInstagram')}
                  keyboardType="numeric"
                  error={formik.touched.invitationInstagram && Boolean(formik.errors.invitationInstagram)}
                  style={styles.formInput}
                  placeholder="0"
                />
                {formik.touched.invitationInstagram && formik.errors.invitationInstagram && (
                  <Text style={styles.formError}>{formik.errors.invitationInstagram}</Text>
                )}
              </View>

              {/* Invitations - Physiques */}
              <View style={styles.formField}>
                <View style={styles.labelContainer}>
                  <MaterialIcons name="handshake" size={18} color="#662d91" style={styles.labelIcon} />
                  <Text style={styles.formLabel}>
                    {i18nService.t('services.list.invitationsPhysiques')}
                  </Text>
                </View>
                <TextInput
                  mode="outlined"
                  value={formik.values.invitationPhysique}
                  onChangeText={formik.handleChange('invitationPhysique')}
                  onBlur={formik.handleBlur('invitationPhysique')}
                  keyboardType="numeric"
                  error={formik.touched.invitationPhysique && Boolean(formik.errors.invitationPhysique)}
                  style={styles.formInput}
                  placeholder="0"
                />
                {formik.touched.invitationPhysique && formik.errors.invitationPhysique && (
                  <Text style={styles.formError}>{formik.errors.invitationPhysique}</Text>
                )}
              </View>
            </Card.Content>
          </Card>

          {/* Boutons d'action */}
          <Card style={styles.formActionsCard}>
            <Card.Content>
              <View style={styles.formActions}>
                <Button
                  mode="outlined"
                  onPress={() => formik.resetForm()}
                  style={styles.formButton}
                  contentStyle={styles.formButtonContent}
                  labelStyle={styles.formButtonLabel}
                  disabled={submitting}
                  icon="refresh"
                >
                  {i18nService.t('common.actions.reset')}
                </Button>
                <Button
                  mode="contained"
                  onPress={() => formik.handleSubmit()}
                  style={[styles.formButton, styles.formButtonPrimary]}
                  contentStyle={styles.formButtonContent}
                  labelStyle={styles.formButtonPrimaryLabel}
                  loading={submitting}
                  disabled={submitting}
                  buttonColor="#662d91"
                  icon="check"
                >
                  {submitting ? i18nService.t('common.actions.submitting') : i18nService.t('common.actions.save')}
                </Button>
              </View>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>

      {/* Dialog de succès */}
      <Portal>
        <Dialog
          visible={successDialogVisible}
          onDismiss={() => {
            setSuccessDialogVisible(false);
            onBack();
          }}
        >
          <Dialog.Title>{i18nService.t('success.success')}</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: '#11181C' }}>{i18nService.t('success.serviceCreated')}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => {
              setSuccessDialogVisible(false);
              onBack();
            }}>
              {i18nService.t('common.actions.ok')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Dialog pour créer un nouvel orateur */}
      <Portal>
        <Dialog
          visible={newSpeakerDialogVisible}
          onDismiss={() => {
            setNewSpeakerDialogVisible(false);
            setNewSpeakerName('');
            setNewSpeakerDescription('');
          }}
        >
          <Dialog.Title>Créer un nouvel orateur</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Nom de l'orateur *"
              value={newSpeakerName}
              onChangeText={setNewSpeakerName}
              style={{ marginBottom: 16 }}
              autoFocus
            />
            <TextInput
              mode="outlined"
              label="Description (optionnel)"
              value={newSpeakerDescription}
              onChangeText={setNewSpeakerDescription}
              multiline
              numberOfLines={3}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setNewSpeakerDialogVisible(false);
                setNewSpeakerName('');
                setNewSpeakerDescription('');
              }}
              disabled={creatingSpeaker}
            >
              Annuler
            </Button>
            <Button
              onPress={handleCreateSpeaker}
              disabled={creatingSpeaker || !newSpeakerName.trim()}
            >
              {creatingSpeaker ? 'Création...' : 'Créer'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </KeyboardAvoidingView>
  );
};

export default function ServicesScreen() {
  // Forcer le re-render quand la langue change
  useLanguageUpdate();
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  const { selectedChurch, churches, changeSelectedChurch } = useSelectedChurch();
  const permissions = usePermissions();
  const [view, setView] = useState<ServicesView>('menu');
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [churchMenuVisible, setChurchMenuVisible] = useState(false);
  const [filter, setFilter] = useState({
    type: '',
    date: '',
    collecteur: '',
    superviseur: '',
    orateur: '',
  });
  const [orderBy, setOrderBy] = useState<string | null>(null);
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [filterVisible, setFilterVisible] = useState(false);
  const [typeMenuVisible, setTypeMenuVisible] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [skip, setSkip] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const LIMIT = 15;

  // Charger les types de culte depuis l'API
  const [serviceTypes, setServiceTypes] = useState<Array<{ id: string; nom: string }>>([]);

  useEffect(() => {
    const fetchServiceTypes = async () => {
      try {
        const response = await apiService.referenceData.serviceTypes.getAll();
        const typesData = extractApiArray<{ id: string; nom: string }>(response);
        setServiceTypes(typesData);
      } catch (err: any) {
        console.error('Erreur lors du chargement des types de culte:', err);
        // En cas d'erreur, utiliser une liste par défaut
        setServiceTypes([
          { id: '1', nom: 'Culte 1' },
          { id: '2', nom: 'Culte 2' },
          { id: '3', nom: 'Culte 3' },
        ]);
      }
    };

    fetchServiceTypes();
  }, []);

  // Options pour les filtres (inclure "Tous")
  const TYPES_CULTE_OPTIONS_FILTER = useMemo(() => [
    { value: 'Tous', label: 'Tous' },
    ...serviceTypes.map(type => ({ value: type.nom, label: type.nom })),
  ], [serviceTypes]);

  const loadServices = useCallback(async (reset = true, skipValue?: number) => {
    try {
      if (reset) {
      setLoading(true);
        setSkip(0);
      } else {
        setLoadingMore(true);
      }

      let response;
      const currentSkip = reset ? 0 : (skipValue !== undefined ? skipValue : skip);

      const params: any = {
        limit: LIMIT,
        skip: currentSkip
      };

      if (permissions.isAdmin || permissions.isSuperAdmin || permissions.isManager) {
        if (selectedChurch) {
          const churchId = getId(selectedChurch);
          if (churchId) params.churchId = churchId;
          response = await apiService.services.getAll(params);
        } else {
          setServices([]);
          setTotalCount(0);
          setHasMore(false);
          setLoading(false);
          setLoadingMore(false);
          return;
        }
      } else if (user?.eglise_locale) {
        const userChurchId = getUserChurchId(user);
        if (userChurchId) params.churchId = userChurchId;
        response = await apiService.services.getAll(params);
      } else {
        response = await apiService.services.getAll(params);
      }

      const servicesData = extractApiArray<Service>(response);
      
      // Les services sont déjà triés par le backend (date desc)
      if (reset) {
        setServices(servicesData);
        const total = response.data?.total || servicesData.length;
        setTotalCount(total);
        const newSkip = LIMIT;
        const hasMoreData = response.data?.hasMore !== undefined ? response.data.hasMore : (newSkip < total);
        setHasMore(hasMoreData);
        setSkip(newSkip);
      } else {
        // Ajouter les nouveaux services à la liste existante
        setServices(prev => [...prev, ...servicesData]);
        const newSkip = currentSkip + LIMIT;
        
        // Mettre à jour totalCount et hasMore
        setTotalCount(prev => {
          const total = response.data?.total !== undefined ? response.data.total : prev;
          const hasMoreData = response.data?.hasMore !== undefined ? response.data.hasMore : (newSkip < total);
          setHasMore(hasMoreData);
          return total;
        });
        
        setSkip(newSkip);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des services:', error);
      if (reset) {
      setServices([]);
        setTotalCount(0);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [selectedChurch, user, permissions]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadServices();
  }, [loadServices]);

  // Filtrer et trier les services
  const filteredServices = useMemo(() => {
    let filtered = services;

    if (filter.type && filter.type !== 'Tous') {
      filtered = filtered.filter((s) => s.culte === filter.type);
    }

    if (filter.date) {
      filtered = filtered.filter((s) => {
        const filterDate = new Date(filter.date);
        const serviceDate = new Date(s.date);
        return (
          filterDate.getFullYear() === serviceDate.getFullYear() &&
          filterDate.getMonth() === serviceDate.getMonth() &&
          filterDate.getDate() === serviceDate.getDate()
        );
      });
    }

    if (filter.collecteur) {
      filtered = filtered.filter((s) => {
        const collecteurName = s.collecteur_culte?.username || '';
        return collecteurName.toLowerCase().includes(filter.collecteur.toLowerCase());
      });
    }

    if (filter.superviseur) {
      filtered = filtered.filter((s) => {
        const superviseurName =
          s.superviseur?.username || s.superviseur?.pseudo || '';
        return superviseurName.toLowerCase().includes(filter.superviseur.toLowerCase());
      });
    }

    if (filter.orateur) {
      filtered = filtered.filter((s) => {
        const orateurName = s.orateur || '';
        return orateurName.toLowerCase().includes(filter.orateur.toLowerCase());
      });
    }

    // Appliquer le tri
    if (orderBy) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any, bValue: any;

        switch (orderBy) {
          case 'culte':
            aValue = a.culte || '';
            bValue = b.culte || '';
            break;
          case 'orateur':
            aValue = a.orateur || '';
            bValue = b.orateur || '';
            break;
          case 'date':
            aValue = new Date(a.date).getTime();
            bValue = new Date(b.date).getTime();
            break;
          case 'total_adultes':
            aValue = a.total_adultes || 0;
            bValue = b.total_adultes || 0;
            break;
          case 'total_enfants':
            aValue = a.total_enfants || 0;
            bValue = b.total_enfants || 0;
            break;
          case 'collecteur':
            aValue = (a.collecteur_culte?.username || '').toLowerCase();
            bValue = (b.collecteur_culte?.username || '').toLowerCase();
            break;
          case 'superviseur':
            aValue = (a.superviseur?.username || a.superviseur?.pseudo || '').toLowerCase();
            bValue = (b.superviseur?.username || b.superviseur?.pseudo || '').toLowerCase();
            break;
          default:
            return 0;
        }

        let primaryResult;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          primaryResult = order === 'asc' 
            ? aValue.localeCompare(bValue, 'fr', { numeric: true, sensitivity: 'base' })
            : bValue.localeCompare(aValue, 'fr', { numeric: true, sensitivity: 'base' });
        } else {
          primaryResult = order === 'asc' ? aValue - bValue : bValue - aValue;
        }
        
        // Tri secondaire par culte en ordre alphabétique croissant
        if (primaryResult === 0 && orderBy !== 'culte') {
          const aCulte = (a.culte || '').toLowerCase();
          const bCulte = (b.culte || '').toLowerCase();
          return aCulte.localeCompare(bCulte, 'fr', { numeric: true, sensitivity: 'base' });
        }
        
        return primaryResult;
      });
    } else {
      // Tri par défaut : date décroissante, puis culte croissant
      filtered = [...filtered].sort((a, b) => {
        const aDate = new Date(a.date).getTime();
        const bDate = new Date(b.date).getTime();
        if (bDate !== aDate) {
          return bDate - aDate; // Décroissant
        }
        const aCulte = (a.culte || '').toLowerCase();
        const bCulte = (b.culte || '').toLowerCase();
        return aCulte.localeCompare(bCulte, 'fr', { numeric: true, sensitivity: 'base' });
      });
    }

    return filtered;
  }, [services, filter, orderBy, order]);

  // Réinitialiser quand les filtres ou le tri changent
  useEffect(() => {
    loadServices(true);
  }, [selectedChurch]);

  const handleLoadMore = () => {
    loadServices(false, skip);
  };

  // Permissions pour les actions
  const canUpdateServices = permissions.isSuperAdmin || permissions.isAdmin || permissions.isManager || permissions.isSuperviseur;
  const canDeleteServices = permissions.isSuperAdmin || permissions.isAdmin || permissions.isManager || permissions.isSuperviseur;

  const handleEditService = (service: Service) => {
    setServiceToEdit(service);
    setEditModalVisible(true);
  };

  const handleDeleteService = (service: Service) => {
    setServiceToDelete(service);
    setDeleteDialogVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!serviceToDelete) return;

    const serviceId = serviceToDelete?.id || serviceToDelete?._id;
    if (!serviceId) {
      Alert.alert(i18nService.t('errors.error'), 'ID du service manquant');
      return;
    }

    try {
      await apiService.services.delete(serviceId);
      Alert.alert(i18nService.t('success.success'), i18nService.t('success.serviceDeleted'));
      setDeleteDialogVisible(false);
      setServiceToDelete(null);
      loadServices();
    } catch (error: any) {
      console.error('Erreur lors de la suppression du service:', error);
      showApiError(error, 'errors.api.deleteService');
    }
  };

  const handleServiceUpdated = () => {
    loadServices();
  };

  const handleNewService = () => {
    setView('form');
  };

  const handleViewServices = () => {
    setView('list');
    loadServices();
  };

  const handleBackToMenu = () => {
    setView('menu');
  };

  const formatDate = (dateString: string) => {
    return dayjs(dateString).format('DD/MM/YYYY');
  };

  const calculateTotal = (service: Service) => {
    // Calculer le total des restants
    const totalRestants = (service.adultes_restants || 0) +
      (service.enfants_restants || 0) +
      (service.chantres_restants || 0) +
      (service.protocoles_restants || 0) +
      (service.multimedia_restants || 0) +
      (service.respo_ecodim_restants || 0) +
      (service.animateurs_ecodim_restants || 0) +
      (service.enfants_ecodim_restants || 0);
    
    // Calculer le total général
    const totalGeneral = (service.total_adultes || 0) +
      (service.total_enfants || 0) +
      (service.total_chantres || 0) +
      (service.total_protocoles || 0) +
      (service.total_multimedia || 0) +
      (service.total_respo_ecodim || 0) +
      (service.total_animateurs_ecodim || 0) +
      (service.total_enfants_ecodim || 0);
    
    // Total final
    const totalFinal = totalRestants + totalGeneral;
    
    // Retourner le format d'affichage
    if (totalRestants > 0) {
      if (totalFinal !== totalGeneral) {
        return `${totalRestants} + ${totalGeneral} = ${totalFinal}`;
      }
      return `${totalRestants} + ${totalGeneral}`;
    }
    return totalGeneral.toString();
  };

  // Afficher le menu de sélection
  if (view === 'menu') {
    return (
      <View style={styles.container}>
        <ScrollView style={styles.scrollView}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {i18nService.t('services.title')}
            </Text>
            <View style={styles.headerDivider} />
          </View>

          <View style={styles.menuContainer}>
            {/* Option 1: Voir les services */}
            {(permissions.isSuperviseur || 
              permissions.isAdmin || 
              permissions.isSuperAdmin || 
              permissions.isManager) && (
              <TouchableOpacity
                style={styles.menuCard}
                onPress={handleViewServices}
              >
                <LinearGradient
                  colors={['#FFFFFF', '#F5F3FF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.menuCardGradient}
                >
                  <MaterialIcons name="list" size={48} color="#662d91" />
                  <Text style={styles.menuCardTitle}>
                    {i18nService.t('navigation.services.view')}
                  </Text>
                  <Text style={styles.menuCardDescription}>
                    {i18nService.t('services.menu.viewDescription')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Option 2: Enregistrer un service */}
            {(permissions.isSuperviseur ||
              permissions.isCollecteurCulte || 
              permissions.isAdmin || 
              permissions.isSuperAdmin || 
              permissions.isManager) && (
              <TouchableOpacity
                style={styles.menuCard}
                onPress={handleNewService}
              >
                <LinearGradient
                  colors={['#FFFFFF', '#F5F3FF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.menuCardGradient}
                >
                  <MaterialIcons name="add-circle" size={48} color="#662d91" />
                  <Text style={styles.menuCardTitle}>
                    {i18nService.t('navigation.services.add')}
                  </Text>
                  <Text style={styles.menuCardDescription}>
                    {i18nService.t('services.menu.addDescription')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Formulaire de création de service
  if (view === 'form') {
    return <ServiceFormView 
      onBack={handleBackToMenu}
      selectedChurch={selectedChurch}
      user={user}
    />;
  }

  // Afficher la liste des services
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header avec bouton retour */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackToMenu} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#662d91" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {i18nService.t('services.list.title')}
          </Text>
          <View style={styles.headerDivider} />
          {selectedChurch && (
            <Text style={styles.headerSubtitle}>
              {i18nService.t('services.list.church')}: {selectedChurch.nom}
            </Text>
          )}
        </View>

        {/* Filtre d'église */}
        {(permissions.isAdmin || permissions.isSuperAdmin || permissions.isManager) &&
          churches.length > 0 && (
            <View style={styles.churchFilter}>
              <View style={styles.filterContainer}>
                <MaterialIcons name="church" size={20} color="#662d91" style={styles.filterIcon} />
                <Text style={styles.churchFilterLabel}>
                  {i18nService.t('services.list.filterByChurch')}
                </Text>
              </View>
              <Button
                mode="contained"
                onPress={() => setChurchMenuVisible(true)}
                style={styles.churchButton}
                contentStyle={styles.churchButtonContent}
                labelStyle={styles.churchButtonLabel}
                buttonColor="#662d91"
                icon="chevron-down"
              >
                {selectedChurch?.nom || i18nService.t('services.list.filterByChurch')}
              </Button>
              <BottomSheet
                visible={churchMenuVisible}
                onClose={() => setChurchMenuVisible(false)}
                items={churches.map((church) => ({
                  label: church.nom,
                  value: church.id || church._id || '',
                  selected: (selectedChurch?.id || selectedChurch?._id) === (church.id || church._id),
                }))}
                onSelect={(item) => {
                  const churchId = item.value as string | null;
                  changeSelectedChurch(churchId);
                  setChurchMenuVisible(false);
                }}
                title={i18nService.t('services.list.filterByChurch')}
              />
            </View>
          )}

        {/* Filtres et tri de services */}
        <View style={styles.filtersContainer}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <Button
              mode="outlined"
              onPress={() => setFilterVisible(!filterVisible)}
              icon={filterVisible ? 'chevron-up' : 'chevron-down'}
              style={[styles.filterToggleButton, { flex: 1 }]}
            >
              {i18nService.t('common.actions.filter')}
            </Button>
            <Button
              mode="outlined"
              onPress={() => setSortMenuVisible(true)}
              icon="sort"
              style={[styles.filterToggleButton, { flex: 1 }]}
            >
              {orderBy 
                ? `${i18nService.t('common.actions.sort')}: ${orderBy} (${order === 'asc' ? '↑' : '↓'})`
                : i18nService.t('common.actions.sort')}
            </Button>
          </View>
          
          {/* Menu de tri */}
          <BottomSheet
            visible={sortMenuVisible}
            onClose={() => setSortMenuVisible(false)}
            items={[
              { label: 'Date (décroissant)', value: 'date-desc' },
              { label: 'Date (croissant)', value: 'date-asc' },
              { label: 'Type de culte (A-Z)', value: 'culte-asc' },
              { label: 'Type de culte (Z-A)', value: 'culte-desc' },
              { label: 'Orateur (A-Z)', value: 'orateur-asc' },
              { label: 'Orateur (Z-A)', value: 'orateur-desc' },
              { label: 'Total adultes (croissant)', value: 'total_adultes-asc' },
              { label: 'Total adultes (décroissant)', value: 'total_adultes-desc' },
              { label: 'Total enfants (croissant)', value: 'total_enfants-asc' },
              { label: 'Total enfants (décroissant)', value: 'total_enfants-desc' },
              { label: 'Collecteur (A-Z)', value: 'collecteur-asc' },
              { label: 'Collecteur (Z-A)', value: 'collecteur-desc' },
              { label: 'Superviseur (A-Z)', value: 'superviseur-asc' },
              { label: 'Superviseur (Z-A)', value: 'superviseur-desc' },
              { label: 'Par défaut (date décroissante)', value: 'default' },
            ]}
            onSelect={(item) => {
              if (item.value === 'default') {
                setOrderBy(null);
                setOrder('asc');
              } else {
                const [column, direction] = (item.value as string).split('-');
                setOrderBy(column);
                setOrder(direction as 'asc' | 'desc');
              }
              setSortMenuVisible(false);
            }}
            title={i18nService.t('common.actions.sort')}
          />

          {filterVisible && (
            <View style={styles.filtersContent}>
              {/* Filtre Type */}
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>
                  {i18nService.t('services.list.typeCulte')}
                </Text>
                <Button
                  mode="outlined"
                  onPress={() => setTypeMenuVisible(true)}
                  style={styles.filterSelectButton}
                >
                  {filter.type || 'Tous'}
                </Button>
                <BottomSheet
                  visible={typeMenuVisible}
                  onClose={() => setTypeMenuVisible(false)}
                  items={TYPES_CULTE_OPTIONS_FILTER.map((option: any) => ({
                    label: option.label,
                    value: option.value,
                  }))}
                  onSelect={(item) => {
                    setFilter({ ...filter, type: item.value as string });
                    setTypeMenuVisible(false);
                  }}
                  title={i18nService.t('services.list.typeCulte')}
                />
              </View>

              {/* Filtre Date */}
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>
                  {i18nService.t('common.time.days')}
                </Text>
                <TextInput
                  mode="outlined"
                  value={filter.date}
                  onChangeText={(text) => setFilter({ ...filter, date: text })}
                  placeholder="YYYY-MM-DD"
                  style={styles.filterInput}
                />
              </View>

              {/* Filtre Collecteur */}
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>
                  {i18nService.t('services.list.collecteur')}
                </Text>
                <TextInput
                  mode="outlined"
                  value={filter.collecteur}
                  onChangeText={(text) => setFilter({ ...filter, collecteur: text })}
                  placeholder={i18nService.t('services.list.collecteur')}
                  style={styles.filterInput}
                />
              </View>

              {/* Filtre Superviseur */}
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>
                  {i18nService.t('services.list.superviseur')}
                </Text>
                <TextInput
                  mode="outlined"
                  value={filter.superviseur}
                  onChangeText={(text) => setFilter({ ...filter, superviseur: text })}
                  placeholder={i18nService.t('services.list.superviseur')}
                  style={styles.filterInput}
                />
              </View>

              {/* Filtre Orateur */}
              <View style={styles.filterRow}>
                <Text style={styles.filterLabel}>
                  {i18nService.t('services.list.orateur')}
                </Text>
                <TextInput
                  mode="outlined"
                  value={filter.orateur}
                  onChangeText={(text) => setFilter({ ...filter, orateur: text })}
                  placeholder={i18nService.t('services.list.orateur')}
                  style={styles.filterInput}
                />
              </View>

              {/* Chips pour les filtres actifs */}
              {(filter.type || filter.date || filter.collecteur || filter.superviseur || filter.orateur) && (
                <View style={styles.activeFiltersContainer}>
                  {filter.type && filter.type !== 'Tous' && (
                    <Chip
                      onClose={() => setFilter({ ...filter, type: '' })}
                      style={styles.filterChip}
                    >
                      Type: {filter.type}
                    </Chip>
                  )}
                  {filter.date && (
                    <Chip
                      onClose={() => setFilter({ ...filter, date: '' })}
                      style={styles.filterChip}
                    >
                      Date: {filter.date}
                    </Chip>
                  )}
                  {filter.collecteur && (
                    <Chip
                      onClose={() => setFilter({ ...filter, collecteur: '' })}
                      style={styles.filterChip}
                    >
                      Collecteur: {filter.collecteur}
                    </Chip>
                  )}
                  {filter.superviseur && (
                    <Chip
                      onClose={() => setFilter({ ...filter, superviseur: '' })}
                      style={styles.filterChip}
                    >
                      Superviseur: {filter.superviseur}
                    </Chip>
                  )}
                  {filter.orateur && (
                    <Chip
                      onClose={() => setFilter({ ...filter, orateur: '' })}
                      style={styles.filterChip}
                    >
                      Orateur: {filter.orateur}
                    </Chip>
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Contenu */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#662d91" />
          </View>
        ) : (
          <View style={styles.content}>
            {filteredServices.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  {i18nService.t('services.list.noServices')}
                </Text>
              </Card>
            ) : (
              filteredServices.map((service) => {
                const total = calculateTotal(service);
                const serviceId = service.id || service._id || '';
                if (!serviceId) return null;
                
                return (
                    <Card key={serviceId} style={styles.serviceCard}>
                      <LinearGradient
                        colors={['#FFFFFF', '#F5F3FF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.cardGradient}
                      >
                        <Card.Content style={styles.cardContent}>
                          <View style={styles.serviceHeader}>
                            <View style={styles.serviceTitleContainer}>
                              <Text style={styles.serviceCulte}>{service.culte}</Text>
                              <Text style={styles.serviceDate}>
                                {formatDate(service.date)}
                              </Text>
                            </View>
                            <View style={styles.serviceActions}>
                              {canUpdateServices && (
                                <TouchableOpacity
                                  onPress={() => handleEditService(service)}
                                  style={styles.actionButton}
                                >
                                  <MaterialIcons name="edit" size={20} color="#662d91" />
                                </TouchableOpacity>
                              )}
                              {canDeleteServices && (
                                <TouchableOpacity
                                  onPress={() => handleDeleteService(service)}
                                  style={styles.actionButton}
                                >
                                  <MaterialIcons name="delete" size={20} color="#d32f2f" />
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>

                          {service.orateur && (
                            <View style={styles.serviceInfo}>
                              <MaterialIcons name="person" size={16} color="#662d91" />
                              <Text style={styles.serviceInfoText}>{service.orateur}</Text>
                            </View>
                          )}

                          {service.superviseur && (
                            <View style={styles.serviceInfo}>
                              <MaterialIcons name="supervisor-account" size={16} color="#662d91" />
                              <Text style={styles.serviceInfoText}>
                                {service.superviseur.username || service.superviseur.pseudo}
                              </Text>
                            </View>
                          )}

                          <View style={styles.statsContainer}>
                            <View style={styles.statRow}>
                              <View style={styles.statItem}>
                                <Text style={styles.statLabel}>
                                  {i18nService.t('services.form.totalAdultes')}
                                </Text>
                                <View style={styles.statValueContainer}>
                                  {(service.adultes_restants ?? 0) > 0 && (
                                    <>
                                      <Text style={styles.statValueRed}>{service.adultes_restants ?? 0}</Text>
                                      <Text style={styles.statValue}> + </Text>
                                    </>
                                  )}
                                  <Text style={styles.statValue}>
                                    {service.total_adultes || 0}
                                  </Text>
                                </View>
                              </View>
                              <View style={styles.statItem}>
                                <Text style={styles.statLabel}>
                                  {i18nService.t('services.form.totalEnfants')}
                                </Text>
                                <View style={styles.statValueContainer}>
                                  {(service.enfants_restants ?? 0) > 0 && (
                                    <>
                                      <Text style={styles.statValueRed}>{service.enfants_restants ?? 0}</Text>
                                      <Text style={styles.statValue}> + </Text>
                                    </>
                                  )}
                                  <Text style={styles.statValue}>
                                    {service.total_enfants || 0}
                                  </Text>
                                </View>
                              </View>
                            </View>
                            <View style={styles.statRow}>
                              <View style={styles.statItem}>
                                <Text style={styles.statLabel}>
                                  {i18nService.t('services.form.totalChantres')}
                                </Text>
                                <View style={styles.statValueContainer}>
                                  {(service.chantres_restants ?? 0) > 0 && (
                                    <>
                                      <Text style={styles.statValueRed}>{service.chantres_restants ?? 0}</Text>
                                      <Text style={styles.statValue}> + </Text>
                                    </>
                                  )}
                                  <Text style={styles.statValue}>
                                    {service.total_chantres || 0}
                                  </Text>
                                </View>
                              </View>
                              <View style={styles.statItem}>
                                <Text style={styles.statLabel}>
                                  {i18nService.t('services.form.totalProtocoles')}
                                </Text>
                                <View style={styles.statValueContainer}>
                                  {(service.protocoles_restants ?? 0) > 0 && (
                                    <>
                                      <Text style={styles.statValueRed}>{service.protocoles_restants ?? 0}</Text>
                                      <Text style={styles.statValue}> + </Text>
                                    </>
                                  )}
                                  <Text style={styles.statValue}>
                                    {service.total_protocoles || 0}
                                  </Text>
                                </View>
                              </View>
                            </View>
                            <View style={styles.statRow}>
                              <View style={styles.statItem}>
                                <Text style={styles.statLabel}>
                                  {i18nService.t('services.list.multimedia')}
                                </Text>
                                <View style={styles.statValueContainer}>
                                  {(service.multimedia_restants ?? 0) > 0 && (
                                    <>
                                      <Text style={styles.statValueRed}>{service.multimedia_restants ?? 0}</Text>
                                      <Text style={styles.statValue}> + </Text>
                                    </>
                                  )}
                                  <Text style={styles.statValue}>
                                    {service.total_multimedia || 0}
                                  </Text>
                                </View>
                              </View>
                              <View style={styles.statItem}>
                                <Text style={styles.statLabel}>
                                  {i18nService.t('services.list.respEcodim')}
                                </Text>
                                <View style={styles.statValueContainer}>
                                  {(service.respo_ecodim_restants ?? 0) > 0 && (
                                    <>
                                      <Text style={styles.statValueRed}>{service.respo_ecodim_restants ?? 0}</Text>
                                      <Text style={styles.statValue}> + </Text>
                                    </>
                                  )}
                                  <Text style={styles.statValue}>
                                    {service.total_respo_ecodim || 0}
                                  </Text>
                                </View>
                              </View>
                            </View>
                            <View style={styles.statRow}>
                              <View style={styles.statItem}>
                                <Text style={styles.statLabel}>
                                  {i18nService.t('services.list.animEcodim')}
                                </Text>
                                <View style={styles.statValueContainer}>
                                  {(service.animateurs_ecodim_restants ?? 0) > 0 && (
                                    <>
                                      <Text style={styles.statValueRed}>{service.animateurs_ecodim_restants ?? 0}</Text>
                                      <Text style={styles.statValue}> + </Text>
                                    </>
                                  )}
                                  <Text style={styles.statValue}>
                                    {service.total_animateurs_ecodim || 0}
                                  </Text>
                                </View>
                              </View>
                              <View style={styles.statItem}>
                                <Text style={styles.statLabel}>
                                  {i18nService.t('services.list.enfEcodim')}
                                </Text>
                                <View style={styles.statValueContainer}>
                                  {(service.enfants_ecodim_restants ?? 0) > 0 && (
                                    <>
                                      <Text style={styles.statValueRed}>{service.enfants_ecodim_restants ?? 0}</Text>
                                      <Text style={styles.statValue}> + </Text>
                                    </>
                                  )}
                                  <Text style={styles.statValue}>
                                    {service.total_enfants_ecodim || 0}
                                  </Text>
                                </View>
                              </View>
                            </View>
                            {((service.nouvelle_naissance ?? 0) > 0 || (service.invitationYoutube ?? 0) > 0 || (service.invitationTiktok ?? 0) > 0 || (service.invitationInstagram ?? 0) > 0 || (service.invitationPhysique ?? 0) > 0) && (
                              <View style={styles.statRow}>
                                {(service.nouvelle_naissance ?? 0) > 0 && (
                                  <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>{i18nService.t('services.list.nouvelleNaissance')}</Text>
                                    <Text style={styles.statValue}>{service.nouvelle_naissance ?? 0}</Text>
                                  </View>
                                )}
                                {((service.invitationYoutube ?? 0) > 0 || (service.invitationTiktok ?? 0) > 0 || (service.invitationInstagram ?? 0) > 0 || (service.invitationPhysique ?? 0) > 0) && (
                                  <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>{i18nService.t('services.list.invitations')}</Text>
                                    <Text style={styles.statValue}>
                                      {(service.invitationYoutube ?? 0) + (service.invitationTiktok ?? 0) + (service.invitationInstagram ?? 0) + (service.invitationPhysique ?? 0)}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            )}
                            {service.collecteur_culte && (
                              <View style={styles.infoRow}>
                                <MaterialIcons name="person" size={16} color="#662d91" />
                                <Text style={styles.infoText}>
                                  {i18nService.t('services.list.collecteur')}: {service.collecteur_culte.username}
                                </Text>
                              </View>
                            )}
                            <View style={styles.totalContainer}>
                              <Text style={styles.totalLabel}>
                                {i18nService.t('services.list.total')}
                              </Text>
                              <View style={styles.totalValueContainer}>
                                {(() => {
                                  const totalRestants = (service.adultes_restants || 0) +
                                    (service.enfants_restants || 0) +
                                    (service.chantres_restants || 0) +
                                    (service.protocoles_restants || 0) +
                                    (service.multimedia_restants || 0) +
                                    (service.respo_ecodim_restants || 0) +
                                    (service.animateurs_ecodim_restants || 0) +
                                    (service.enfants_ecodim_restants || 0);
                                  const totalGeneral = (service.total_adultes || 0) +
                                    (service.total_enfants || 0) +
                                    (service.total_chantres || 0) +
                                    (service.total_protocoles || 0) +
                                    (service.total_multimedia || 0) +
                                    (service.total_respo_ecodim || 0) +
                                    (service.total_animateurs_ecodim || 0) +
                                    (service.total_enfants_ecodim || 0);
                                  const totalFinal = totalRestants + totalGeneral;
                                  
                                  if (totalRestants > 0) {
                                    return (
                                      <>
                                        <Text style={[styles.totalValue, styles.totalValueRed, { fontWeight: '500' }]}>
                                          {totalRestants}
                                        </Text>
                                        <Text style={styles.totalValue}> + </Text>
                                        <Text style={[styles.totalValue, { fontWeight: '700' }]}>
                                          {totalGeneral}
                                        </Text>
                                        {totalFinal !== totalGeneral && (
                                          <>
                                            <Text style={styles.totalValue}> = </Text>
                                            <Text style={[styles.totalValue, { fontWeight: '400' }]}>
                                              {totalFinal}
                                            </Text>
                                          </>
                                        )}
                                      </>
                                    );
                                  }
                                  return (
                                    <Text style={[styles.totalValue, { fontWeight: '700' }]}>
                                      {totalGeneral}
                                    </Text>
                                  );
                                })()}
                              </View>
                            </View>
                          </View>
                        </Card.Content>
                      </LinearGradient>
                    </Card>
                );
              })
            )}
            
            {/* Bouton "Voir plus" - Afficher seulement si pas de filtres actifs */}
            {hasMore && !filter.type && !filter.date && !filter.collecteur && !filter.superviseur && !filter.orateur && (
              <View style={styles.loadMoreContainer}>
                <Button
                  mode="outlined"
                  onPress={handleLoadMore}
                  loading={loadingMore}
                  disabled={loadingMore}
                  style={styles.loadMoreButton}
                  contentStyle={styles.loadMoreButtonContent}
                  icon="chevron-down"
                >
                  {loadingMore 
                    ? i18nService.t('common.actions.loading') 
                    : i18nService.t('common.actions.loadMore', { 
                        count: Math.min(LIMIT, totalCount - services.length)
                      })}
                </Button>
                <Text style={styles.loadMoreText}>
                  {i18nService.t('services.list.displayedCount', {
                    displayed: services.length,
                    total: totalCount
                  })}
                </Text>
              </View>
            )}
            
            {/* Indicateur si tous les services sont affichés */}
            {!hasMore && services.length > 0 && !filter.type && !filter.date && !filter.collecteur && !filter.superviseur && !filter.orateur && (
              <View style={styles.allServicesDisplayed}>
                <Text style={styles.allServicesDisplayedText}>
                  {i18nService.t('services.list.allServicesDisplayed', {
                    count: totalCount
                  })}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal d'édition */}
      <EditServiceModal
        visible={editModalVisible}
        onClose={() => {
          setEditModalVisible(false);
          setServiceToEdit(null);
        }}
        onUpdate={handleServiceUpdated}
        service={serviceToEdit}
        selectedChurch={selectedChurch}
        user={user}
        canUpdateServices={canUpdateServices}
      />

      {/* Dialog de confirmation de suppression */}
      <Portal>
        <Dialog
          visible={deleteDialogVisible}
          onDismiss={() => {
            setDeleteDialogVisible(false);
            setServiceToDelete(null);
          }}
        >
          <Dialog.Title>{i18nService.t('services.list.deleteService')}</Dialog.Title>
          <Dialog.Content>
            <Text>
              {serviceToDelete
                ? i18nService.t('services.list.deleteServiceConfirmDate').replace('{date}', formatDate(serviceToDelete.date))
                : i18nService.t('services.list.deleteServiceConfirm')}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => {
              setDeleteDialogVisible(false);
              setServiceToDelete(null);
            }}>
              {i18nService.t('common.actions.cancel')}
            </Button>
            <Button onPress={handleConfirmDelete} textColor="#d32f2f">
              {i18nService.t('common.actions.delete')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
    backgroundColor: '#f0f2f5',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: '#662d91',
    marginBottom: 12,
  },
  headerDivider: {
    width: 100,
    height: 4,
    backgroundColor: '#662d91',
    borderRadius: 2,
    marginBottom: 12,
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    fontWeight: '600',
    marginTop: 8,
  },
  churchFilter: {
    marginBottom: 16,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  filterIcon: {
    marginRight: 0,
  },
  churchFilterLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#662d91',
    letterSpacing: 0.3,
  },
  churchButton: {
    minWidth: 280,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  churchButtonContent: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    height: 48,
  },
  churchButtonLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  churchItemTitle: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  selectedChurchItem: {
    color: '#662d91',
    fontWeight: '700',
    fontSize: 15,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterToggleButton: {
    borderColor: '#662d91',
    backgroundColor: '#fff',
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filtersContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(102, 45, 145, 0.15)',
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  filterRow: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#662d91',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  filterSelectButton: {
    borderColor: '#662d91',
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  filterInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(102, 45, 145, 0.1)',
  },
  filterChip: {
    backgroundColor: '#F5F3FF',
    borderColor: '#662d91',
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
    gap: 10,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#662d91',
    fontWeight: '600',
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 0,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyCard: {
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: 'rgba(102, 45, 145, 0.1)',
    marginHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  serviceCard: {
    marginBottom: 20,
    borderRadius: 24,
    elevation: 8,
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(102, 45, 145, 0.15)',
    overflow: 'hidden',
  },
  cardGradient: {
    borderRadius: 24,
  },
  cardContent: {
    padding: 20,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(102, 45, 145, 0.1)',
  },
  serviceTitleContainer: {
    flex: 1,
  },
  serviceCulte: {
    fontSize: 20,
    fontWeight: '700',
    color: '#662d91',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  serviceDate: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  serviceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(102, 45, 145, 0.1)',
  },
  loadMoreContainer: {
    padding: 20,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  loadMoreButton: {
    borderColor: '#662d91',
    borderRadius: 16,
    minWidth: 200,
    elevation: 4,
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  loadMoreButtonContent: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  loadMoreText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  allServicesDisplayed: {
    padding: 20,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  allServicesDisplayedText: {
    fontSize: 14,
    color: '#662d91',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  serviceInfoText: {
    fontSize: 14,
    color: '#662d91',
    flex: 1,
    fontWeight: '600',
  },
  statsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(102, 45, 145, 0.1)',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(102, 45, 145, 0.1)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#662d91',
    textAlign: 'center',
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValueRed: {
    fontSize: 18,
    fontWeight: '600',
    color: '#d32f2f',
    textAlign: 'center',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 2,
    borderTopColor: 'rgba(102, 45, 145, 0.2)',
    backgroundColor: '#F5F3FF',
    borderRadius: 16,
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#662d91',
    letterSpacing: -0.3,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#662d91',
    letterSpacing: -0.5,
  },
  totalValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  totalValueRed: {
    fontSize: 24,
    fontWeight: '500',
    color: '#d32f2f',
    letterSpacing: -0.5,
  },
  menuContainer: {
    padding: 20,
    gap: 20,
  },
  menuCard: {
    borderRadius: 24,
    elevation: 8,
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(102, 45, 145, 0.15)',
    overflow: 'hidden',
    marginBottom: 20,
  },
  menuCardGradient: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#662d91',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  menuCardDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  backButton: {
    marginBottom: 12,
    padding: 8,
    alignSelf: 'flex-start',
  },
  formContainer: {
    padding: 20,
    paddingBottom: 40,
    gap: 20,
  },
  formSectionCard: {
    marginBottom: 20,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(102, 45, 145, 0.15)',
    backgroundColor: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(102, 45, 145, 0.1)',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#662d91',
    letterSpacing: -0.3,
  },
  formField: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginHorizontal: 4,
    gap: 8,
    flexWrap: 'wrap',
  },
  labelIcon: {
    marginRight: 0,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#662d91',
    letterSpacing: -0.2,
    flex: 1,
    flexShrink: 1,
  },
  formInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    fontSize: 15,
  },
  formSelectButton: {
    borderColor: '#662d91',
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  formSelectButtonContent: {
    paddingVertical: 8,
  },
  formSelectButtonLabel: {
    color: '#662d91',
    fontSize: 14,
    fontWeight: '600',
  },
  formError: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    marginLeft: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#662d91',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  dateButtonText: {
    fontSize: 14,
    color: '#662d91',
    fontWeight: '600',
  },
  formActionsCard: {
    marginTop: 20,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(102, 45, 145, 0.15)',
    backgroundColor: '#fff',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  formButton: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#662d91',
  },
  formButtonContent: {
    paddingVertical: 12,
    minHeight: 56,
  },
  formButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#662d91',
    letterSpacing: 0.3,
  },
  formButtonPrimary: {
    backgroundColor: '#662d91',
    borderWidth: 0,
  },
  formButtonPrimaryLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '400',
  },
});
