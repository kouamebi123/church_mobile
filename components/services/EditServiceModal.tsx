import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { Text, Button, Dialog, Portal, TextInput } from 'react-native-paper';
import BaseModal from '../networks/BaseModal';
import BottomSheet from '../BottomSheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { apiService } from '../../services/apiService';
import i18nService from '../../services/i18nService';
import { extractApiArray } from '../../utils/apiResponse';
import { showApiError } from '../../utils/errorHandler';
import { getId } from '../../utils/idHelper';
import dayjs from 'dayjs';

interface EditServiceModalProps {
  visible: boolean;
  onClose: () => void;
  onUpdate: () => void;
  service: any;
  selectedChurch: any;
  user: any;
  canUpdateServices: boolean;
}

export default function EditServiceModal({
  visible,
  onClose,
  onUpdate,
  service,
  selectedChurch,
  user,
  canUpdateServices,
}: EditServiceModalProps) {
  const [loading, setLoading] = useState(false);
  const [superviseurs, setSuperviseurs] = useState<any[]>([]);
  const [serviceTypes, setServiceTypes] = useState<Array<{ id: string; nom: string }>>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [showSuperviseurMenu, setShowSuperviseurMenu] = useState(false);

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

  // Stabiliser l'ID du service pour éviter les re-renders infinis
  const serviceId = useMemo(() => getId(service), [service?.id, service?._id]);

  // Charger les superviseurs
  useEffect(() => {
    if (!visible) return;

    const fetchSuperviseurs = async () => {
      try {
        const response = await apiService.users.getAll({ role: 'SUPERVISEUR' });
        const superviseursData = extractApiArray<any>(response);
        setSuperviseurs(superviseursData);
      } catch (err: any) {
        console.error('Erreur lors du chargement des superviseurs:', err);
      }
    };

    fetchSuperviseurs();
  }, [visible]);

  // Charger les types de culte
  useEffect(() => {
    if (!visible) return;

    const fetchServiceTypes = async () => {
      try {
        const response = await apiService.referenceData.serviceTypes.getAll();
        const typesData = extractApiArray<{ id: string; nom: string }>(response);
        setServiceTypes(typesData);
      } catch (err: any) {
        console.error('Erreur lors du chargement des types de culte:', err);
      }
    };

    fetchServiceTypes();
  }, [visible]);

  // Stabiliser les valeurs initiales avec useMemo
  const initialValues = useMemo(() => {
    if (!service) {
      return {
        culte: '',
        orateur: '',
        date: new Date(),
        total_adultes: '0',
        total_enfants: '0',
        total_chantres: '0',
        total_protocoles: '0',
        total_multimedia: '0',
        total_respo_ecodim: '0',
        total_animateurs_ecodim: '0',
        total_enfants_ecodim: '0',
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
      };
    }

    return {
      culte: service.culte || '',
      orateur: service.orateur || '',
      date: service.date ? new Date(service.date) : new Date(),
      total_adultes: (service.total_adultes ?? 0).toString(),
      total_enfants: (service.total_enfants ?? 0).toString(),
      total_chantres: (service.total_chantres ?? 0).toString(),
      total_protocoles: (service.total_protocoles ?? 0).toString(),
      total_multimedia: (service.total_multimedia ?? 0).toString(),
      total_respo_ecodim: (service.total_respo_ecodim ?? 0).toString(),
      total_animateurs_ecodim: (service.total_animateurs_ecodim ?? 0).toString(),
      total_enfants_ecodim: (service.total_enfants_ecodim ?? 0).toString(),
      nouvelle_naissance: (service.nouvelle_naissance ?? 0).toString(),
      adultes_restants: (service.adultes_restants ?? 0).toString(),
      enfants_restants: (service.enfants_restants ?? 0).toString(),
      chantres_restants: (service.chantres_restants ?? 0).toString(),
      protocoles_restants: (service.protocoles_restants ?? 0).toString(),
      multimedia_restants: (service.multimedia_restants ?? 0).toString(),
      respo_ecodim_restants: (service.respo_ecodim_restants ?? 0).toString(),
      animateurs_ecodim_restants: (service.animateurs_ecodim_restants ?? 0).toString(),
      enfants_ecodim_restants: (service.enfants_ecodim_restants ?? 0).toString(),
      superviseur: getId(service.superviseur) || service.superviseur_id || '',
      invitationYoutube: (service.invitationYoutube ?? 0).toString(),
      invitationTiktok: (service.invitationTiktok ?? 0).toString(),
      invitationInstagram: (service.invitationInstagram ?? 0).toString(),
      invitationPhysique: (service.invitationPhysique ?? 0).toString(),
    };
  }, [serviceId, service?.date, service?.culte, service?.orateur]);

  const formik = useFormik({
    initialValues,
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      if (!canUpdateServices) {
        Alert.alert(i18nService.t('errors.error'), i18nService.t('errors.permissions.insufficient'));
        return;
      }

      try {
        setLoading(true);

        if (!getId(selectedChurch)) {
          Alert.alert(
            i18nService.t('errors.error'),
            i18nService.t('errors.api.selectChurch')
          );
          return;
        }

        if (!getId(user)) {
          Alert.alert(
            i18nService.t('errors.error'),
            i18nService.t('errors.user.notConnected')
          );
          return;
        }

        // Formater la date au format ISO pour le backend
        const formattedDate = values.date instanceof Date 
          ? values.date.toISOString() 
          : values.date;

        // Préparer les données avec les champs autorisés uniquement
        const updateData: any = {
          date: formattedDate,
          culte: values.culte,
          orateur: values.orateur,
          total_adultes: Number(values.total_adultes) || 0,
          total_enfants: Number(values.total_enfants) || 0,
          total_chantres: Number(values.total_chantres) || 0,
          total_protocoles: Number(values.total_protocoles) || 0,
          total_multimedia: Number(values.total_multimedia) || 0,
          total_respo_ecodim: Number(values.total_respo_ecodim) || 0,
          total_animateurs_ecodim: Number(values.total_animateurs_ecodim) || 0,
          total_enfants_ecodim: Number(values.total_enfants_ecodim) || 0,
          nouvelle_naissance: Number(values.nouvelle_naissance) || 0,
          adultes_restants: Number(values.adultes_restants) || 0,
          enfants_restants: Number(values.enfants_restants) || 0,
          chantres_restants: Number(values.chantres_restants) || 0,
          protocoles_restants: Number(values.protocoles_restants) || 0,
          multimedia_restants: Number(values.multimedia_restants) || 0,
          respo_ecodim_restants: Number(values.respo_ecodim_restants) || 0,
          animateurs_ecodim_restants: Number(values.animateurs_ecodim_restants) || 0,
          enfants_ecodim_restants: Number(values.enfants_ecodim_restants) || 0,
          superviseur_id: values.superviseur || null,
          invitationYoutube: Number(values.invitationYoutube) || 0,
          invitationTiktok: Number(values.invitationTiktok) || 0,
          invitationInstagram: Number(values.invitationInstagram) || 0,
          invitationPhysique: Number(values.invitationPhysique) || 0,
        };

        if (!serviceId) {
          Alert.alert(i18nService.t('errors.error'), 'ID du service manquant');
          setLoading(false);
          return;
        }

        await apiService.services.update(serviceId, updateData);
        Alert.alert(i18nService.t('success.success'), i18nService.t('success.serviceUpdated'));
        onUpdate();
        onClose();
      } catch (error: any) {
        console.error('Erreur lors de la mise à jour du service:', error);
        showApiError(error, 'errors.api.updateService');
      } finally {
        setLoading(false);
      }
    },
  });

  const handleClose = () => {
    formik.resetForm();
    onClose();
  };

  const selectedServiceType = serviceTypes.find(st => st.nom === formik.values.culte);
  const selectedSuperviseur = superviseurs.find(s => getId(s) === formik.values.superviseur);

  return (
    <BaseModal
      visible={visible}
      onClose={handleClose}
      title={i18nService.t('services.list.editService')}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.scrollContent}>
          {/* Type de culte */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{i18nService.t('services.list.typeCulte')} *</Text>
            <Button
              mode="outlined"
              onPress={() => setShowTypeMenu(true)}
              style={styles.selectButton}
              contentStyle={styles.selectButtonContent}
            >
              {selectedServiceType ? selectedServiceType.nom : i18nService.t('services.list.typeCulte')}
            </Button>
            {formik.touched.culte && formik.errors.culte && (
              <Text style={styles.errorText}>{formik.errors.culte}</Text>
            )}
            <BottomSheet
              visible={showTypeMenu}
              onClose={() => setShowTypeMenu(false)}
              items={serviceTypes.map((type) => ({
                label: type.nom,
                value: type.nom,
                selected: formik.values.culte === type.nom,
              }))}
              onSelect={(item) => {
                formik.setFieldValue('culte', item.value as string);
                setShowTypeMenu(false);
              }}
              title={i18nService.t('services.list.typeCulte')}
            />
          </View>

          {/* Orateur */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{i18nService.t('services.list.orateur')} *</Text>
            <TextInput
              mode="outlined"
              value={formik.values.orateur}
              onChangeText={formik.handleChange('orateur')}
              onBlur={formik.handleBlur('orateur')}
              error={formik.touched.orateur && Boolean(formik.errors.orateur)}
              style={styles.input}
            />
            {formik.touched.orateur && formik.errors.orateur && (
              <Text style={styles.errorText}>{formik.errors.orateur}</Text>
            )}
          </View>

          {/* Date */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{i18nService.t('services.list.dateCulte')} *</Text>
            <Button
              mode="outlined"
              onPress={() => setShowDatePicker(true)}
              style={styles.selectButton}
              contentStyle={styles.selectButtonContent}
            >
              {dayjs(formik.values.date).format('DD/MM/YYYY')}
            </Button>
            {formik.touched.date && formik.errors.date && (
              <Text style={styles.errorText}>{formik.errors.date}</Text>
            )}
            {showDatePicker && (
              <DateTimePicker
                value={formik.values.date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selectedDate) {
                    formik.setFieldValue('date', selectedDate);
                  }
                }}
              />
            )}
          </View>

          {/* Superviseur */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{i18nService.t('services.list.superviseur')} *</Text>
            <Button
              mode="outlined"
              onPress={() => setShowSuperviseurMenu(true)}
              style={styles.selectButton}
              contentStyle={styles.selectButtonContent}
            >
              {selectedSuperviseur ? (selectedSuperviseur.username || selectedSuperviseur.pseudo) : i18nService.t('services.list.superviseur')}
            </Button>
            {formik.touched.superviseur && formik.errors.superviseur && (
              <Text style={styles.errorText}>{formik.errors.superviseur}</Text>
            )}
            <BottomSheet
              visible={showSuperviseurMenu}
              onClose={() => setShowSuperviseurMenu(false)}
              items={superviseurs.map((superviseur) => ({
                label: superviseur.username || superviseur.pseudo || '',
                value: superviseur.id || superviseur._id || '',
                selected: formik.values.superviseur === (superviseur.id || superviseur._id),
              }))}
              onSelect={(item) => {
                formik.setFieldValue('superviseur', item.value as string);
                setShowSuperviseurMenu(false);
              }}
              title={i18nService.t('services.list.superviseur')}
            />
          </View>

          {/* Totaux */}
          <Text style={styles.sectionTitle}>{i18nService.t('services.form.totals')}</Text>

          {/* Total Adultes */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{i18nService.t('services.form.totalAdultes')} *</Text>
            <TextInput
              mode="outlined"
              value={formik.values.total_adultes}
              onChangeText={formik.handleChange('total_adultes')}
              onBlur={formik.handleBlur('total_adultes')}
              keyboardType="numeric"
              error={formik.touched.total_adultes && Boolean(formik.errors.total_adultes)}
              style={styles.input}
            />
            {formik.touched.total_adultes && formik.errors.total_adultes && (
              <Text style={styles.errorText}>{formik.errors.total_adultes}</Text>
            )}
          </View>

          {/* Adultes restants */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{i18nService.t('services.list.adultesRestants')}</Text>
            <TextInput
              mode="outlined"
              value={formik.values.adultes_restants}
              onChangeText={formik.handleChange('adultes_restants')}
              onBlur={formik.handleBlur('adultes_restants')}
              keyboardType="numeric"
              error={formik.touched.adultes_restants && Boolean(formik.errors.adultes_restants)}
              style={styles.input}
            />
          </View>

          {/* Total Enfants */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{i18nService.t('services.form.totalEnfants')} *</Text>
            <TextInput
              mode="outlined"
              value={formik.values.total_enfants}
              onChangeText={formik.handleChange('total_enfants')}
              onBlur={formik.handleBlur('total_enfants')}
              keyboardType="numeric"
              error={formik.touched.total_enfants && Boolean(formik.errors.total_enfants)}
              style={styles.input}
            />
          </View>

          {/* Enfants restants */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{i18nService.t('services.list.enfantsRestants')}</Text>
            <TextInput
              mode="outlined"
              value={formik.values.enfants_restants}
              onChangeText={formik.handleChange('enfants_restants')}
              onBlur={formik.handleBlur('enfants_restants')}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          {/* Total Chantres */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{i18nService.t('services.form.totalChantres')} *</Text>
            <TextInput
              mode="outlined"
              value={formik.values.total_chantres}
              onChangeText={formik.handleChange('total_chantres')}
              onBlur={formik.handleBlur('total_chantres')}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          {/* Chantres restants */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{i18nService.t('services.list.chantresRestants')}</Text>
            <TextInput
              mode="outlined"
              value={formik.values.chantres_restants}
              onChangeText={formik.handleChange('chantres_restants')}
              onBlur={formik.handleBlur('chantres_restants')}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          {/* Total Protocoles */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{i18nService.t('services.form.totalProtocoles')} *</Text>
            <TextInput
              mode="outlined"
              value={formik.values.total_protocoles}
              onChangeText={formik.handleChange('total_protocoles')}
              onBlur={formik.handleBlur('total_protocoles')}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          {/* Protocoles restants */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{i18nService.t('services.list.protocolesRestants')}</Text>
            <TextInput
              mode="outlined"
              value={formik.values.protocoles_restants}
              onChangeText={formik.handleChange('protocoles_restants')}
              onBlur={formik.handleBlur('protocoles_restants')}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          {/* Total Multimedia */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{i18nService.t('services.list.multimedia')} *</Text>
            <TextInput
              mode="outlined"
              value={formik.values.total_multimedia}
              onChangeText={formik.handleChange('total_multimedia')}
              onBlur={formik.handleBlur('total_multimedia')}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          {/* Multimedia restants */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{i18nService.t('services.list.multimediaRestants')}</Text>
            <TextInput
              mode="outlined"
              value={formik.values.multimedia_restants}
              onChangeText={formik.handleChange('multimedia_restants')}
              onBlur={formik.handleBlur('multimedia_restants')}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          {/* Total Responsable Ecodim */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Responsable {i18nService.t('services.list.respEcodim')} *</Text>
            <TextInput
              mode="outlined"
              value={formik.values.total_respo_ecodim}
              onChangeText={formik.handleChange('total_respo_ecodim')}
              onBlur={formik.handleBlur('total_respo_ecodim')}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          {/* Responsable Ecodim restants */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{i18nService.t('services.list.respoEcodimRestants')}</Text>
            <TextInput
              mode="outlined"
              value={formik.values.respo_ecodim_restants}
              onChangeText={formik.handleChange('respo_ecodim_restants')}
              onBlur={formik.handleBlur('respo_ecodim_restants')}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          {/* Total Animateurs Ecodim */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{i18nService.t('services.list.animEcodim')} *</Text>
            <TextInput
              mode="outlined"
              value={formik.values.total_animateurs_ecodim}
              onChangeText={formik.handleChange('total_animateurs_ecodim')}
              onBlur={formik.handleBlur('total_animateurs_ecodim')}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          {/* Animateurs Ecodim restants */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{i18nService.t('services.list.animateursEcodimRestants')}</Text>
            <TextInput
              mode="outlined"
              value={formik.values.animateurs_ecodim_restants}
              onChangeText={formik.handleChange('animateurs_ecodim_restants')}
              onBlur={formik.handleBlur('animateurs_ecodim_restants')}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          {/* Total Enfants Ecodim */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{i18nService.t('services.list.enfants')} {i18nService.t('services.list.enfEcodim')} *</Text>
            <TextInput
              mode="outlined"
              value={formik.values.total_enfants_ecodim}
              onChangeText={formik.handleChange('total_enfants_ecodim')}
              onBlur={formik.handleBlur('total_enfants_ecodim')}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          {/* Enfants Ecodim restants */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{i18nService.t('services.list.enfantsEcodimRestants')}</Text>
            <TextInput
              mode="outlined"
              value={formik.values.enfants_ecodim_restants}
              onChangeText={formik.handleChange('enfants_ecodim_restants')}
              onBlur={formik.handleBlur('enfants_ecodim_restants')}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          {/* Nouvelle naissance */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{i18nService.t('services.list.nouvelleNaissance')}</Text>
            <TextInput
              mode="outlined"
              value={formik.values.nouvelle_naissance}
              onChangeText={formik.handleChange('nouvelle_naissance')}
              onBlur={formik.handleBlur('nouvelle_naissance')}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          {/* Invitations */}
          <Text style={styles.sectionTitle}>{i18nService.t('services.form.invitations')}</Text>

          {/* Invitation YouTube */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{i18nService.t('services.list.invitationsYoutube')}</Text>
            <TextInput
              mode="outlined"
              value={formik.values.invitationYoutube}
              onChangeText={formik.handleChange('invitationYoutube')}
              onBlur={formik.handleBlur('invitationYoutube')}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          {/* Invitation TikTok */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{i18nService.t('services.list.invitationsTiktok')}</Text>
            <TextInput
              mode="outlined"
              value={formik.values.invitationTiktok}
              onChangeText={formik.handleChange('invitationTiktok')}
              onBlur={formik.handleBlur('invitationTiktok')}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          {/* Invitation Instagram */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{i18nService.t('services.list.invitationsInstagram')}</Text>
            <TextInput
              mode="outlined"
              value={formik.values.invitationInstagram}
              onChangeText={formik.handleChange('invitationInstagram')}
              onBlur={formik.handleBlur('invitationInstagram')}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          {/* Invitation Physique */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>{i18nService.t('services.list.invitationsPhysiques')}</Text>
            <TextInput
              mode="outlined"
              value={formik.values.invitationPhysique}
              onChangeText={formik.handleChange('invitationPhysique')}
              onBlur={formik.handleBlur('invitationPhysique')}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          {/* Boutons d'action */}
          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={handleClose}
              style={[styles.button, styles.cancelButton]}
              disabled={loading}
            >
              {i18nService.t('common.actions.cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={formik.handleSubmit}
              style={[styles.button, styles.submitButton]}
              loading={loading}
              disabled={loading || !canUpdateServices}
            >
              {i18nService.t('common.actions.save')}
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
  },
  selectButton: {
    borderColor: '#662d91',
  },
  selectButtonContent: {
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 16,
    color: '#662d91',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 16,
    gap: 12,
  },
  button: {
    flex: 1,
  },
  cancelButton: {
    borderColor: '#662d91',
  },
  submitButton: {
    backgroundColor: '#662d91',
  },
});
