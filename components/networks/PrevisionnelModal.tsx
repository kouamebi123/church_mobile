import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput, Button, Card, Divider } from 'react-native-paper';
import BaseModal from './BaseModal';
import BottomSheet from '../BottomSheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import i18nService from '../../services/i18nService';
import { TYPES_CULTE_OPTIONS } from '../../constants/enums';
import previsionnelService from '../../services/previsionnelService';
import { getNetworkChurchId } from '../../utils/idHelper';
import { showApiError } from '../../utils/errorHandler';

interface GroupPrevision {
  id: string;
  nom: string;
  effectif_actuel: number;
  valeur_previsionnelle: number;
}

interface PrevisionnelModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  networkData: any;
  isLoading?: boolean;
  initialData?: any;
  editMode?: boolean;
}

export default function PrevisionnelModal({
  visible,
  onClose,
  onSave,
  networkData,
  isLoading = false,
  initialData = null,
  editMode = false,
}: PrevisionnelModalProps) {
  const [formData, setFormData] = useState({
    date: new Date(),
    type_culte: '',
    groupes_previsions: {} as Record<string, GroupPrevision>,
    responsables_reseau: 0,
    compagnons_oeuvre: 0,
    invites: 0,
  });
  const [totalPrevisionnel, setTotalPrevisionnel] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [typeCulteSheetVisible, setTypeCulteSheetVisible] = useState(false);

  const cultesOptions = TYPES_CULTE_OPTIONS.filter(option => option.value !== 'Tous');

  useEffect(() => {
    if (editMode && initialData && networkData?.grs && Array.isArray(networkData.grs)) {
      const groupesPrevisions: Record<string, GroupPrevision> = {};
      const existingGroupesPrevisions: Record<string, any> = {};
      
      if (initialData.groupes_previsions && Array.isArray(initialData.groupes_previsions)) {
        initialData.groupes_previsions.forEach((gp: any) => {
          existingGroupesPrevisions[gp.group_id] = gp;
        });
      }
      
      networkData.grs.forEach((gr: any) => {
        const effectifActuel = gr.members?.length || 0;
        const nom = gr.nom || `GR ${gr.responsable1?.username?.split(' ')[0] || i18nService.t('common_text.unknownName')}${gr.responsable2?.username ? ` & ${gr.responsable2?.username?.split(' ')[0]}` : ''}`;
        const existingPrevision = existingGroupesPrevisions[gr.id];
        
        groupesPrevisions[gr.id] = {
          id: gr.id,
          nom: nom,
          effectif_actuel: existingPrevision?.effectif_actuel || effectifActuel,
          valeur_previsionnelle: existingPrevision?.valeur_previsionnelle || effectifActuel,
        };
      });
      
      setFormData({
        date: initialData.date ? new Date(initialData.date) : new Date(),
        type_culte: initialData.type_culte || '',
        responsables_reseau: initialData.responsables_reseau || 0,
        compagnons_oeuvre: initialData.compagnons_oeuvre || 0,
        invites: initialData.invites || 0,
        groupes_previsions: groupesPrevisions,
      });
    } else if (!editMode && networkData?.grs && Array.isArray(networkData.grs)) {
      const groupesPrevisions: Record<string, GroupPrevision> = {};
      const lastPrevisionnelGroupes: Record<string, any> = {};
      
      if (initialData?.groupes_previsions && Array.isArray(initialData.groupes_previsions)) {
        initialData.groupes_previsions.forEach((gp: any) => {
          lastPrevisionnelGroupes[gp.group_id] = gp;
        });
      }
      
      networkData.grs.forEach((gr: any) => {
        const effectifActuel = gr.members?.length || 0;
        const nom = gr.nom || `GR ${gr.responsable1?.username?.split(' ')[0] || i18nService.t('common_text.unknownName')}${gr.responsable2?.username ? ` & ${gr.responsable2?.username?.split(' ')[0]}` : ''}`;
        const lastPrevision = lastPrevisionnelGroupes[gr.id];
        
        groupesPrevisions[gr.id] = {
          id: gr.id,
          nom: nom,
          effectif_actuel: effectifActuel,
          valeur_previsionnelle: lastPrevision?.valeur_previsionnelle || effectifActuel,
        };
      });
      
      setFormData({
        date: new Date(),
        type_culte: initialData?.type_culte || '',
        responsables_reseau: initialData?.responsables_reseau || 0,
        compagnons_oeuvre: initialData?.compagnons_oeuvre || 0,
        invites: initialData?.invites || 0,
        groupes_previsions: groupesPrevisions,
      });
    }
  }, [networkData, editMode, initialData, visible]);

  useEffect(() => {
    const totalGroupes = Object.values(formData.groupes_previsions).reduce((sum, groupe) => {
      return sum + (parseInt(groupe.valeur_previsionnelle.toString()) || 0);
    }, 0);
    
    const total = totalGroupes + (parseInt(formData.responsables_reseau.toString()) || 0) + (parseInt(formData.compagnons_oeuvre.toString()) || 0) + (parseInt(formData.invites.toString()) || 0);
    setTotalPrevisionnel(total);
  }, [formData.groupes_previsions, formData.responsables_reseau, formData.compagnons_oeuvre, formData.invites]);

  const handleGroupPrevisionChange = (groupId: string, value: string) => {
    const numericValue = parseInt(value) || 0;
    setFormData(prev => ({
      ...prev,
      groupes_previsions: {
        ...prev.groupes_previsions,
        [groupId]: {
          ...prev.groupes_previsions[groupId],
          valeur_previsionnelle: numericValue,
        },
      },
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.date) {
      newErrors.date = i18nService.t('errors.validation.dateRequired');
    }
    
    if (!formData.type_culte) {
      newErrors.type_culte = i18nService.t('errors.validation.typeCulteRequired');
    }
    
    const hasValidPrevision = Object.values(formData.groupes_previsions).some(
      groupe => (parseInt(groupe.valeur_previsionnelle.toString()) || 0) > 0
    );
    
    if (!hasValidPrevision) {
      newErrors.previsions = i18nService.t('previsionnel.errors.noPrevision') || 'Au moins un groupe doit avoir une prévision > 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    const totalAvecInvites = totalPrevisionnel + (formData.invites || 0);

    const payload = {
      date: formData.date.toISOString(),
      type_culte: formData.type_culte,
      total_prevu: totalAvecInvites,
      invites: formData.invites || 0,
      network_id: networkData.reseau.id,
      church_id: getNetworkChurchId(networkData.reseau) || '',
      responsables_reseau: formData.responsables_reseau || 0,
      compagnons_oeuvre: formData.compagnons_oeuvre || 0,
      groupes_previsions: Object.values(formData.groupes_previsions).map(groupe => ({
        group_id: groupe.id,
        effectif_actuel: groupe.effectif_actuel,
        valeur_previsionnelle: groupe.valeur_previsionnelle,
      })),
    };

    if (editMode && initialData?.id) {
      (payload as any).id = initialData.id;
    }

    try {
      await onSave(payload);
      handleClose();
    } catch (error: any) {
      showApiError(error, 'errors.api.save');
    }
  };

  const handleClose = () => {
    setFormData({
      date: new Date(),
      type_culte: '',
      groupes_previsions: {},
      responsables_reseau: 0,
      compagnons_oeuvre: 0,
      invites: 0,
    });
    setErrors({});
    onClose();
  };

  const typeCulteItems = cultesOptions.map(option => ({
    label: option.label,
    value: option.value,
  }));

  const selectedTypeCulte = cultesOptions.find(opt => opt.value === formData.type_culte);

  const actions = (
    <>
      <Button onPress={handleClose} mode="outlined" disabled={isLoading} style={styles.button}>
        {i18nService.t('common.actions.cancel')}
      </Button>
      <Button
        mode="contained"
        onPress={handleSubmit}
        disabled={isLoading || totalPrevisionnel === 0}
        buttonColor="#662d91"
        style={styles.button}
      >
        {isLoading ? i18nService.t('common.actions.submitting') : (editMode ? i18nService.t('common.actions.save') : i18nService.t('previsionnel.form.save'))}
      </Button>
    </>
  );

  return (
    <>
      <BaseModal
        visible={visible}
        onClose={handleClose}
        title={editMode ? (i18nService.t('previsionnel.modal.editTitle') || 'Modifier le prévisionnel') : (i18nService.t('previsionnel.modal.title') || 'Nouveau prévisionnel')}
        actions={actions}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>
            {i18nService.t('previsionnel.modal.subtitle') || 'Réseau'} - {networkData?.reseau?.nom}
          </Text>

          <View style={styles.formRow}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateLabel}>
                {i18nService.t('previsionnel.form.date') || 'Date'}
              </Text>
              <Text style={styles.dateValue}>
                {formData.date.toLocaleDateString('fr-FR')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setTypeCulteSheetVisible(true)}
            >
              <Text style={styles.selectLabel}>
                {i18nService.t('previsionnel.form.typeCulteLabel') || 'Type de culte'}
              </Text>
              <Text style={styles.selectValue}>
                {selectedTypeCulte?.label || i18nService.t('common.actions.select') || 'Sélectionner'}
              </Text>
            </TouchableOpacity>
          </View>

          {errors.date && <Text style={styles.errorText}>{errors.date}</Text>}
          {errors.type_culte && <Text style={styles.errorText}>{errors.type_culte}</Text>}

          <Divider style={styles.divider} />

          <Text style={styles.sectionTitle}>
            {i18nService.t('previsionnel.form.responsablesEtCO') || 'Responsables et Compagnons'}
          </Text>

          <View style={styles.formRow}>
            <TextInput
              label={i18nService.t('previsionnel.form.responsablesReseau') || 'Responsables réseau'}
              value={formData.responsables_reseau.toString()}
              onChangeText={(text) => setFormData(prev => ({ ...prev, responsables_reseau: parseInt(text) || 0 }))}
              keyboardType="numeric"
              style={styles.input}
              mode="outlined"
            />

            <TextInput
              label={i18nService.t('previsionnel.form.compagnonsOeuvre') || 'Compagnons d\'œuvre'}
              value={formData.compagnons_oeuvre.toString()}
              onChangeText={(text) => setFormData(prev => ({ ...prev, compagnons_oeuvre: parseInt(text) || 0 }))}
              keyboardType="numeric"
              style={styles.input}
              mode="outlined"
            />
          </View>

          <Divider style={styles.divider} />

          <Text style={styles.sectionTitle}>
            {i18nService.t('previsionnel.form.groupes') || 'Groupes'}
          </Text>

          {Object.values(formData.groupes_previsions).map((groupe) => (
            <Card key={groupe.id} style={styles.groupCard}>
              <Card.Content>
                <Text style={styles.groupName}>{groupe.nom}</Text>
                <Text style={styles.groupEffectif}>
                  {i18nService.t('previsionnel.form.totalMembres') || 'Effectif actuel'} : {groupe.effectif_actuel}
                </Text>
                <TextInput
                  label={i18nService.t('previsionnel.form.valeurPrevisionnelle') || 'Valeur prévisionnelle'}
                  value={groupe.valeur_previsionnelle.toString()}
                  onChangeText={(text) => handleGroupPrevisionChange(groupe.id, text)}
                  keyboardType="numeric"
                  style={styles.input}
                  mode="outlined"
                />
              </Card.Content>
            </Card>
          ))}

          <Divider style={styles.divider} />

          <Text style={styles.sectionTitle}>
            {i18nService.t('previsionnel.form.invites') || 'Invités'}
          </Text>

          <TextInput
            label={i18nService.t('previsionnel.form.nombreInvites') || 'Nombre d\'invités'}
            value={formData.invites.toString()}
            onChangeText={(text) => setFormData(prev => ({ ...prev, invites: parseInt(text) || 0 }))}
            keyboardType="numeric"
            style={styles.input}
            mode="outlined"
          />

          {errors.previsions && (
            <Text style={styles.errorText}>{errors.previsions}</Text>
          )}

          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>
              {i18nService.t('previsionnel.form.totalPrevisionnel') || 'Total prévisionnel'} :
            </Text>
            <Text style={styles.totalValue}>
              {totalPrevisionnel + (formData.invites || 0)}
            </Text>
          </View>
        </ScrollView>

        {showDatePicker && (
          <DateTimePicker
            value={formData.date}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setFormData(prev => ({ ...prev, date: selectedDate }));
              }
            }}
          />
        )}

        <BottomSheet
          visible={typeCulteSheetVisible}
          onClose={() => setTypeCulteSheetVisible(false)}
          items={typeCulteItems}
          onSelect={(item) => {
            setFormData(prev => ({ ...prev, type_culte: item.value as string }));
            setTypeCulteSheetVisible(false);
          }}
          title={i18nService.t('previsionnel.form.typeCulteLabel') || 'Type de culte'}
        />
      </BaseModal>
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    maxHeight: 500,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'column',
    gap: 16,
    marginBottom: 16,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  dateLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  dateValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  selectButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#f9f9f9',
  },
  selectLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  selectValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  input: {
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#662d91',
    marginBottom: 16,
  },
  groupCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  groupEffectif: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#662d91',
  },
  button: {
    minWidth: 100,
  },
});

