import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput, Button, Card, Divider, Chip } from 'react-native-paper';
import BaseModal from './BaseModal';
import BottomSheet from '../BottomSheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import i18nService from '../../services/i18nService';
import { TYPES_CULTE_OPTIONS } from '../../constants/enums';
import assistanceService from '../../services/assistanceService';
import previsionnelService from '../../services/previsionnelService';
import { getNetworkChurchId } from '../../utils/idHelper';
import { getApiErrorMessage, showApiError } from '../../utils/errorHandler';

interface GroupAssistance {
  id: string;
  nom: string;
  effectif_actuel: number;
  nombre_presents: number;
}

interface AssistanceModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  networkData: any;
  isLoading?: boolean;
  initialData?: any;
  editMode?: boolean;
}

export default function AssistanceModal({
  visible,
  onClose,
  onSave,
  networkData,
  isLoading = false,
  initialData = null,
  editMode = false,
}: AssistanceModalProps) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    type_culte: '',
    groupes_assistance: {} as Record<string, GroupAssistance>,
    invites: 0,
    responsables_reseau: 0,
    compagnons_oeuvre: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previsionnel, setPrevisionnel] = useState<any>(null);
  const [totalPresents, setTotalPresents] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [typeCulteSheetVisible, setTypeCulteSheetVisible] = useState(false);

  const cultesOptions = TYPES_CULTE_OPTIONS.filter(option => option.value !== 'Tous');

  useEffect(() => {
    if (editMode && initialData && networkData?.grs && Array.isArray(networkData.grs)) {
      const groupesAssistance: Record<string, GroupAssistance> = {};
      const existingGroupesAssistance: Record<string, any> = {};
      
      if (initialData.groupes_assistance && Array.isArray(initialData.groupes_assistance)) {
        initialData.groupes_assistance.forEach((ga: any) => {
          existingGroupesAssistance[ga.group_id] = ga;
        });
      }
      
      networkData.grs.forEach((groupe: any) => {
        const effectifActuel = groupe.members?.length || 0;
        const nom = groupe.nom || `GR ${groupe.responsable1?.username?.split(' ')[0] || i18nService.t('common_text.unknownName')}${groupe.responsable2?.username ? ` & ${groupe.responsable2?.username?.split(' ')[0]}` : ''}`;
        const existingAssistance = existingGroupesAssistance[groupe.id];
        
        groupesAssistance[groupe.id] = {
          id: groupe.id,
          nom: nom,
          effectif_actuel: existingAssistance?.effectif_actuel || effectifActuel,
          nombre_presents: existingAssistance?.nombre_presents || effectifActuel,
        };
      });
      
      const assistanceDate = initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      
      setFormData({
        date: assistanceDate,
        type_culte: initialData.type_culte || '',
        responsables_reseau: initialData.responsables_reseau || 0,
        compagnons_oeuvre: initialData.compagnons_oeuvre || 0,
        invites: initialData.invites || 0,
        groupes_assistance: groupesAssistance,
      });
    } else if (!editMode && visible && networkData?.grs && Array.isArray(networkData.grs)) {
      const groupesAssistance: Record<string, GroupAssistance> = {};
      const lastAssistanceGroupes: Record<string, any> = {};
      
      if (initialData?.groupes_assistance && Array.isArray(initialData.groupes_assistance)) {
        initialData.groupes_assistance.forEach((ga: any) => {
          lastAssistanceGroupes[ga.group_id] = ga;
        });
      }
      
      networkData.grs.forEach((groupe: any) => {
        const effectifActuel = groupe.members?.length || 0;
        const nom = groupe.nom || `GR ${groupe.responsable1?.username?.split(' ')[0] || i18nService.t('common_text.unknownName')}${groupe.responsable2?.username ? ` & ${groupe.responsable2?.username?.split(' ')[0]}` : ''}`;
        const lastAssistance = lastAssistanceGroupes[groupe.id];
        
        groupesAssistance[groupe.id] = {
          id: groupe.id,
          nom: nom,
          effectif_actuel: effectifActuel,
          nombre_presents: lastAssistance?.nombre_presents || effectifActuel,
        };
      });
      
      setFormData({
        date: new Date().toISOString().split('T')[0],
        type_culte: initialData?.type_culte || '',
        responsables_reseau: initialData?.responsables_reseau || 0,
        compagnons_oeuvre: initialData?.compagnons_oeuvre || 0,
        invites: initialData?.invites || 0,
        groupes_assistance: groupesAssistance,
      });
    }
  }, [visible, networkData, editMode, initialData]);

  useEffect(() => {
    const loadPrevisionnel = async () => {
      if (formData.date && formData.type_culte && networkData?.reseau?.id) {
        try {
          const response = await previsionnelService.getStats({
            network_id: networkData.reseau.id,
            date_from: formData.date,
            date_to: formData.date,
            type_culte: formData.type_culte,
          });
          
          // previsionnelService.getStats retourne response.data, donc on accède directement
          const details = response?.details || response?.data?.details || response?.data?.data || [];
          if (Array.isArray(details) && details.length > 0) {
            setPrevisionnel(details[0]);
          } else {
            setPrevisionnel(null);
          }
        } catch (error) {
          setPrevisionnel(null);
        }
      }
    };

    loadPrevisionnel();
  }, [formData.date, formData.type_culte, networkData?.reseau?.id]);

  useEffect(() => {
    const totalGroupes = Object.values(formData.groupes_assistance).reduce(
      (sum, groupe) => sum + (groupe.nombre_presents || 0), 0
    );
    const total = totalGroupes + (parseInt(formData.responsables_reseau.toString()) || 0) + (parseInt(formData.compagnons_oeuvre.toString()) || 0);
    setTotalPresents(total);
  }, [formData.groupes_assistance, formData.responsables_reseau, formData.compagnons_oeuvre]);

  const handleGroupeChange = (groupeId: string, value: string) => {
    const numericValue = parseInt(value) || 0;
    setFormData(prev => ({
      ...prev,
      groupes_assistance: {
        ...prev.groupes_assistance,
        [groupeId]: {
          ...prev.groupes_assistance[groupeId],
          nombre_presents: numericValue,
        },
      },
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!formData.date || !formData.type_culte) {
        throw new Error(i18nService.t('errors.validation.allFieldsRequired'));
      }

      if (totalPresents === 0) {
        throw new Error(i18nService.t('errors.assistance.atLeastOnePresent') || 'Au moins une personne doit être présente');
      }

      const totalAvecInvites = totalPresents + (formData.invites || 0);

      const payload = {
        date: new Date(formData.date).toISOString(),
        type_culte: formData.type_culte,
        total_presents: totalAvecInvites,
        invites: formData.invites || 0,
        responsables_reseau: formData.responsables_reseau || 0,
        compagnons_oeuvre: formData.compagnons_oeuvre || 0,
        network_id: networkData.reseau.id,
        church_id: getNetworkChurchId(networkData.reseau) || '',
        groupes_assistance: Object.values(formData.groupes_assistance).map(groupe => ({
          group_id: groupe.id,
          effectif_actuel: groupe.effectif_actuel,
          nombre_presents: groupe.nombre_presents,
        })),
      };

      if (editMode && initialData?.id) {
        (payload as any).id = initialData.id;
      }

      await onSave(payload);
      handleClose();
    } catch (error: any) {
      const errorMessage = getApiErrorMessage(error, 'errors.api.save');
      setError(errorMessage);
      Alert.alert(
        i18nService.t('errors.api.title') || 'Erreur',
        errorMessage
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      type_culte: '',
      groupes_assistance: {},
      invites: 0,
      responsables_reseau: 0,
      compagnons_oeuvre: 0,
    });
    setError(null);
    setPrevisionnel(null);
    onClose();
  };

  const ecart = previsionnel ? totalPresents - previsionnel.previsionnel : null;

  const typeCulteItems = cultesOptions.map(option => ({
    label: option.label,
    value: option.value,
  }));

  const selectedTypeCulte = cultesOptions.find(opt => opt.value === formData.type_culte);

  const actions = (
    <>
      <Button onPress={handleClose} mode="outlined" disabled={loading || isLoading} style={styles.button}>
        {i18nService.t('common.actions.cancel')}
      </Button>
      <Button
        mode="contained"
        onPress={handleSubmit}
        disabled={loading || isLoading || totalPresents === 0}
        buttonColor="#662d91"
        style={styles.button}
      >
        {loading || isLoading ? i18nService.t('common.actions.submitting') : (editMode ? i18nService.t('common.actions.save') : i18nService.t('assistance.form.save'))}
      </Button>
    </>
  );

  return (
    <>
      <BaseModal
        visible={visible}
        onClose={handleClose}
        title={editMode ? (i18nService.t('assistance.form.editTitle') || 'Modifier l\'assistance') : (i18nService.t('assistance.form.title') || 'Nouvelle assistance')}
        actions={actions}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>
            {i18nService.t('assistance.form.subtitle') || 'Réseau'} - {networkData?.reseau?.nom}
          </Text>

          <View style={styles.formRow}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateLabel}>
                {i18nService.t('assistance.form.date') || 'Date'}
              </Text>
              <Text style={styles.dateValue}>
                {new Date(formData.date).toLocaleDateString('fr-FR')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setTypeCulteSheetVisible(true)}
            >
              <Text style={styles.selectLabel}>
                {i18nService.t('assistance.form.typeCulte') || 'Type de culte'}
              </Text>
              <Text style={styles.selectValue}>
                {selectedTypeCulte?.label || i18nService.t('common.actions.select') || 'Sélectionner'}
              </Text>
            </TouchableOpacity>
          </View>

          <Divider style={styles.divider} />

          <Text style={styles.sectionTitle}>
            {i18nService.t('assistance.form.responsablesEtCO') || 'Responsables et Compagnons'}
          </Text>

          <View style={styles.formRow}>
            <TextInput
              label={i18nService.t('assistance.form.responsablesReseau') || 'Responsables réseau'}
              value={formData.responsables_reseau.toString()}
              onChangeText={(text) => setFormData(prev => ({ ...prev, responsables_reseau: parseInt(text) || 0 }))}
              keyboardType="numeric"
              style={styles.input}
              mode="outlined"
            />

            <TextInput
              label={i18nService.t('assistance.form.compagnonsOeuvre') || 'Compagnons d\'œuvre'}
              value={formData.compagnons_oeuvre.toString()}
              onChangeText={(text) => setFormData(prev => ({ ...prev, compagnons_oeuvre: parseInt(text) || 0 }))}
              keyboardType="numeric"
              style={styles.input}
              mode="outlined"
            />
          </View>

          <Divider style={styles.divider} />

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <Text style={styles.sectionTitle}>
            {i18nService.t('assistance.form.groupes') || 'Groupes'}
          </Text>

          {Object.values(formData.groupes_assistance).map((groupe) => (
            <Card key={groupe.id} style={styles.groupCard}>
              <Card.Content>
                <Text style={styles.groupName}>{groupe.nom}</Text>
                <Text style={styles.groupEffectif}>
                  {i18nService.t('assistance.form.totalMembres') || 'Effectif actuel'} : {groupe.effectif_actuel}
                </Text>
                <TextInput
                  label={i18nService.t('assistance.form.nombrePresents') || 'Nombre de présents'}
                  value={groupe.nombre_presents.toString()}
                  onChangeText={(text) => handleGroupeChange(groupe.id, text)}
                  keyboardType="numeric"
                  style={styles.input}
                  mode="outlined"
                />
                {groupe.nombre_presents > groupe.effectif_actuel && (
                  <Text style={styles.helperText}>
                    {groupe.nombre_presents - groupe.effectif_actuel} {groupe.nombre_presents - groupe.effectif_actuel === 1 ? 'personne supplémentaire' : 'personnes supplémentaires'}
                  </Text>
                )}
              </Card.Content>
            </Card>
          ))}

          <Divider style={styles.divider} />

          <Text style={styles.sectionTitle}>
            {i18nService.t('assistance.form.invites') || 'Invités'}
          </Text>

          <TextInput
            label={i18nService.t('assistance.form.nombreInvites') || 'Nombre d\'invités'}
            value={formData.invites.toString()}
            onChangeText={(text) => setFormData(prev => ({ ...prev, invites: parseInt(text) || 0 }))}
            keyboardType="numeric"
            style={styles.input}
            mode="outlined"
          />

          <Divider style={styles.divider} />

          {previsionnel && (
            <View style={styles.comparisonContainer}>
              <Text style={styles.sectionTitle}>
                {i18nService.t('assistance.form.comparisonTitle') || 'Comparaison'}
              </Text>
              <View style={styles.comparisonRow}>
                <Card style={styles.comparisonCard}>
                  <Card.Content style={styles.comparisonCardContent}>
                    <Text style={styles.comparisonLabel}>
                      {i18nService.t('assistance.form.previsionnel') || 'Prévisionnel'}
                    </Text>
                    <Text style={styles.comparisonValue}>{previsionnel.previsionnel}</Text>
                  </Card.Content>
                </Card>

                <Card style={styles.comparisonCard}>
                  <Card.Content style={styles.comparisonCardContent}>
                    <Text style={styles.comparisonLabel}>
                      {i18nService.t('assistance.form.presents') || 'Présents'}
                    </Text>
                    <Text style={[styles.comparisonValue, { color: '#10b981' }]}>{totalPresents}</Text>
                  </Card.Content>
                </Card>

                <Card style={styles.comparisonCard}>
                  <Card.Content style={styles.comparisonCardContent}>
                    <Text style={styles.comparisonLabel}>
                      {i18nService.t('assistance.form.ecart') || 'Écart'}
                    </Text>
                    <Chip
                      mode="flat"
                      style={[styles.ecartChip, { backgroundColor: ecart !== null && ecart >= 0 ? '#10b981' : '#ef4444' }]}
                      textStyle={{ color: '#fff', fontWeight: '700' }}
                    >
                      {ecart !== null && ecart >= 0 ? `+${ecart}` : ecart}
                    </Chip>
                  </Card.Content>
                </Card>
              </View>
            </View>
          )}

          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>
              {i18nService.t('assistance.form.totalPresents') || 'Total présents'} :
            </Text>
            <Text style={styles.totalValue}>
              {totalPresents + (formData.invites || 0)}
            </Text>
          </View>
        </ScrollView>

        {showDatePicker && (
          <DateTimePicker
            value={new Date(formData.date)}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setFormData(prev => ({ ...prev, date: selectedDate.toISOString().split('T')[0] }));
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
          title={i18nService.t('assistance.form.typeCulte') || 'Type de culte'}
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
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  comparisonContainer: {
    marginBottom: 16,
  },
  comparisonRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  comparisonCard: {
    flex: 1,
    minWidth: '30%',
    borderRadius: 12,
  },
  comparisonCardContent: {
    alignItems: 'center',
    padding: 12,
  },
  comparisonLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  comparisonValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#662d91',
  },
  ecartChip: {
    marginTop: 4,
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

