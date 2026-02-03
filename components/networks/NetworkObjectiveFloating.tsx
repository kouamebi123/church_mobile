import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Text, Card, Button, TextInput, Chip, Divider } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import BaseModal from './BaseModal';
import i18nService from '../../services/i18nService';
import { apiService } from '../../services/apiService';

interface NetworkObjectiveFloatingProps {
  networkId: string;
  currentMembersCount: number;
}

export default function NetworkObjectiveFloating({
  networkId,
  currentMembersCount,
}: NetworkObjectiveFloatingProps) {
  const [visible, setVisible] = useState(false);
  const [objective, setObjective] = useState<any>(null);
  const [shortTermObjectives, setShortTermObjectives] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [color, setColor] = useState('#662d91');
  const [formVisible, setFormVisible] = useState(false);
  const [editingObjective, setEditingObjective] = useState<any>(null);
  const [formData, setFormData] = useState({
    objectif: '',
    date_fin: new Date(),
    description: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (networkId) {
      loadObjective();
    }
  }, [networkId]);

  const loadObjective = async () => {
    if (!networkId) {
      console.warn('NetworkObjectiveFloating: networkId is missing');
      setObjective(null);
      return;
    }

    try {
      setLoading(true);
      
      // Gérer les erreurs 404 comme des cas normaux (objectif n'existe pas)
      const [objectiveRes, objectivesRes] = await Promise.allSettled([
        apiService.networks.getObjective(networkId).catch((err: any) => {
          // Si c'est une erreur 404, ce n'est pas grave, l'objectif n'existe simplement pas
          if (err.response?.status === 404) {
            return { data: null };
          }
          throw err;
        }),
        apiService.networks.getObjectives(networkId).catch((err: any) => {
          // Si c'est une erreur 404, retourner un tableau vide
          if (err.response?.status === 404) {
            return { data: [] };
          }
          throw err;
        }),
      ]);

      // Extraire les données des résultats
      const objectiveData = 
        objectiveRes.status === 'fulfilled' 
          ? (objectiveRes.value.data?.data || objectiveRes.value.data || null)
          : null;
      
      const allObjectives = 
        objectivesRes.status === 'fulfilled'
          ? (objectivesRes.value.data?.data || objectivesRes.value.data || [])
          : [];

      setObjective(objectiveData);
      
      const shortTerm = Array.isArray(allObjectives) 
        ? allObjectives.filter((obj: any) => !obj.is_main && obj.active)
        : [];
      setShortTermObjectives(shortTerm);

      if (objectiveData) {
        const progress = objectiveData.progress || 0;
        if (progress >= 100) {
          setColor('#4caf50');
        } else if (progress >= 80) {
          setColor('#8bc34a');
        } else if (progress >= 50) {
          setColor('#ff9800');
        } else {
          setColor('#f44336');
        }
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des objectifs:', error);
      // En cas d'erreur, on définit l'objectif à null pour ne pas afficher le composant
      setObjective(null);
      setShortTermObjectives([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (objectiveItem: any = null) => {
    try {
      // Fermer le modal principal d'abord
      setVisible(false);
      
      // Préparer les données du formulaire
      if (objectiveItem) {
        setEditingObjective(objectiveItem);
        let dateFin = new Date();
        if (objectiveItem.date_fin) {
          const parsedDate = new Date(objectiveItem.date_fin);
          if (!isNaN(parsedDate.getTime())) {
            dateFin = parsedDate;
          }
        }
        setFormData({
          objectif: objectiveItem.objectif?.toString() || '',
          date_fin: dateFin,
          description: objectiveItem.description || '',
        });
      } else {
        setEditingObjective(null);
        setFormData({
          objectif: '',
          date_fin: new Date(),
          description: '',
        });
      }
      setShowDatePicker(false);
      
      // Ouvrir le modal du formulaire après un court délai pour laisser le modal principal se fermer
      setTimeout(() => {
        setFormVisible(true);
      }, 100);
    } catch (error) {
      console.error('Erreur lors de l\'ouverture du formulaire:', error);
      Alert.alert('Erreur', 'Impossible d\'ouvrir le formulaire');
    }
  };

  const handleSubmit = async () => {
    if (!networkId) {
      Alert.alert('Erreur', 'ID du réseau manquant');
      return;
    }

    try {
      if (!formData.objectif || !formData.date_fin) {
        Alert.alert('Erreur', 'L\'objectif et la date sont requis');
        return;
      }

      const objectifNum = parseInt(formData.objectif);
      if (isNaN(objectifNum) || objectifNum <= 0) {
        Alert.alert('Erreur', 'L\'objectif doit être un nombre positif');
        return;
      }

      // Vérifier que la date est valide
      if (!(formData.date_fin instanceof Date) || isNaN(formData.date_fin.getTime())) {
        Alert.alert('Erreur', 'La date de fin n\'est pas valide');
        return;
      }

      // Vérifier que la date est dans le futur
      if (formData.date_fin < new Date()) {
        Alert.alert('Erreur', 'La date de fin doit être dans le futur');
        return;
      }

      setLoading(true);

      if (editingObjective) {
        await apiService.networks.updateObjective(editingObjective.id, {
          objectif: objectifNum,
          date_fin: formData.date_fin.toISOString(),
          description: formData.description || null,
          is_main: false,
        });
        Alert.alert('Succès', 'Objectif modifié avec succès');
      } else {
        await apiService.networks.createObjective(networkId, {
          objectif: objectifNum,
          date_fin: formData.date_fin.toISOString(),
          description: formData.description || null,
          is_main: false,
        });
        Alert.alert('Succès', 'Objectif créé avec succès');
      }

      setFormVisible(false);
      await loadObjective();
      // Rouvrir le modal principal après la mise à jour
      setTimeout(() => {
        setVisible(true);
      }, 300);
    } catch (error: any) {
      console.error('Erreur lors de la gestion de l\'objectif:', error);
      let errorMessage = 'Erreur lors de la gestion de l\'objectif';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Erreur', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (objectiveId: string) => {
    Alert.alert(
      'Confirmer la suppression',
      'Êtes-vous sûr de vouloir supprimer cet objectif ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.networks.deleteObjective(objectiveId);
              Alert.alert('Succès', 'Objectif supprimé avec succès');
              await loadObjective();
            } catch (error: any) {
              Alert.alert('Erreur', error.message || 'Erreur lors de la suppression');
            }
          },
        },
      ]
    );
  };

  // Ne pas afficher le composant si l'objectif principal n'existe pas
  // Le bouton FAB ne sera donc pas affiché dans ce cas
  if (!objective || loading) {
    return null;
  }

  const progress = objective.progress || 0;
  const currentCount = objective.currentCount || currentMembersCount || 0;
  const target = objective.objectif || 0;

  return (
    <>
      {/* FAB Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: color }]}
        onPress={() => setVisible(true)}
      >
        <MaterialIcons name="gps-fixed" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Main Modal */}
      <BaseModal
        visible={visible}
        onClose={() => setVisible(false)}
        title={i18nService.t('labels.networkObjective') || 'Objectif du réseau'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#662d91" />
            </View>
          ) : (
            <>
              <Card style={styles.mainCard}>
                <LinearGradient
                  colors={['rgba(102, 45, 145, 0.08)', 'rgba(158, 0, 93, 0.05)']}
                  style={styles.mainCardContent}
                >
                  <View style={styles.progressContainer}>
                    <Text style={styles.progressLabel}>
                      {i18nService.t('labels.progress') || 'Progression'}
                    </Text>
                    <Chip
                      mode="flat"
                      style={[styles.progressChip, { backgroundColor: color }]}
                      textStyle={{ color: '#fff', fontWeight: '700' }}
                    >
                      {Math.round(progress)}%
                    </Chip>
                  </View>
                  
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%`, backgroundColor: color }]} />
                  </View>

                  <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                      <Text style={styles.statValue}>{currentCount}</Text>
                      <Text style={styles.statLabel}>
                        {i18nService.t('labels.currentMembers') || 'Actuels'}
                      </Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statValue}>{target}</Text>
                      <Text style={styles.statLabel}>Objectif</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statValue}>{target - currentCount > 0 ? target - currentCount : 0}</Text>
                      <Text style={styles.statLabel}>
                        {i18nService.t('labels.remaining') || 'Restant'}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </Card>

              <Divider style={styles.divider} />

              <View style={styles.shortTermHeader}>
                <Text style={styles.shortTermTitle}>
                  {i18nService.t('labels.shortTermObjectives') || 'Objectifs à court terme'}
                </Text>
                <Button
                  mode="contained"
                  onPress={() => handleOpenForm()}
                  icon="plus"
                  buttonColor="#662d91"
                  style={styles.addButton}
                >
                  {i18nService.t('labels.add') || 'Ajouter'}
                </Button>
              </View>

              {(!shortTermObjectives || shortTermObjectives.length === 0) ? (
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="gps-fixed" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>
                    {i18nService.t('labels.noShortTermObjective') || 'Aucun objectif à court terme'}
                  </Text>
                </View>
              ) : (
                (Array.isArray(shortTermObjectives) ? shortTermObjectives : []).map((obj: any) => (
                  <Card key={obj.id} style={styles.objectiveCard}>
                    <Card.Content>
                      <View style={styles.objectiveHeader}>
                        <Text style={styles.objectiveValue}>
                          {obj.objectif} {i18nService.t('labels.members') || 'membres'}
                        </Text>
                        <View style={styles.objectiveActions}>
                          <TouchableOpacity onPress={() => handleOpenForm(obj)}>
                            <MaterialIcons name="edit" size={20} color="#662d91" />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDelete(obj.id)}>
                            <MaterialIcons name="delete" size={20} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <Text style={styles.objectiveDate}>
                        {i18nService.t('labels.endDate') || 'Date fin'}: {new Date(obj.date_fin).toLocaleDateString('fr-FR')}
                      </Text>
                      {obj.description && (
                        <Text style={styles.objectiveDescription}>{obj.description}</Text>
                      )}
                    </Card.Content>
                  </Card>
                ))
              )}
            </>
          )}
        </ScrollView>
      </BaseModal>

      {/* Form Modal */}
      <BaseModal
        visible={formVisible}
        onClose={() => {
          setFormVisible(false);
          // Rouvrir le modal principal après fermeture du formulaire
          setTimeout(() => {
            setVisible(true);
          }, 100);
        }}
        title={editingObjective ? (i18nService.t('labels.editShortTermObjective') || 'Modifier l\'objectif') : (i18nService.t('labels.newShortTermObjective') || 'Nouvel objectif')}
        actions={
          <>
            <Button 
              onPress={() => {
                setFormVisible(false);
                // Rouvrir le modal principal après annulation
                setTimeout(() => {
                  setVisible(true);
                }, 100);
              }} 
              mode="outlined" 
              style={styles.formButton}
            >
              {i18nService.t('common.actions.cancel')}
            </Button>
            <Button onPress={handleSubmit} mode="contained" buttonColor="#662d91" style={styles.formButton}>
              {editingObjective ? i18nService.t('labels.modify') : i18nService.t('labels.create')}
            </Button>
          </>
        }
      >
        <View style={styles.formContainer}>
          <TextInput
            label={i18nService.t('labels.objective') || 'Objectif'}
            value={formData.objectif}
            onChangeText={(text) => setFormData(prev => ({ ...prev, objectif: text }))}
            keyboardType="numeric"
            mode="outlined"
            style={styles.formInput}
          />

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateLabel}>
              {i18nService.t('labels.endDate') || 'Date de fin'}
            </Text>
            <Text style={styles.dateValue}>
              {formData.date_fin && formData.date_fin instanceof Date && !isNaN(formData.date_fin.getTime())
                ? formData.date_fin.toLocaleDateString('fr-FR')
                : new Date().toLocaleDateString('fr-FR')}
            </Text>
          </TouchableOpacity>

          <TextInput
            label={i18nService.t('labels.description') || 'Description'}
            value={formData.description}
            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
            multiline
            numberOfLines={3}
            mode="outlined"
            style={styles.formInput}
          />

          {showDatePicker && (
            <DateTimePicker
              value={formData.date_fin}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (event.type === 'set' && selectedDate) {
                  setFormData(prev => ({ ...prev, date_fin: selectedDate }));
                }
              }}
            />
          )}
        </View>
      </BaseModal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scrollView: {
    maxHeight: 500,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  mainCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  mainCardContent: {
    padding: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#662d91',
  },
  progressChip: {
    paddingHorizontal: 8,
  },
  progressBar: {
    height: 16,
    backgroundColor: 'rgba(102, 45, 145, 0.12)',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 24,
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(102, 45, 145, 0.04)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(102, 45, 145, 0.2)',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#662d91',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  divider: {
    marginVertical: 16,
  },
  shortTermHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  shortTermTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#662d91',
  },
  addButton: {
    borderRadius: 8,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
  objectiveCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  objectiveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  objectiveValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#662d91',
  },
  objectiveActions: {
    flexDirection: 'row',
    gap: 12,
  },
  objectiveDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  objectiveDescription: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  formContainer: {
    gap: 16,
  },
  formInput: {
    marginBottom: 8,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#f9f9f9',
    marginBottom: 8,
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
  formButton: {
    minWidth: 100,
  },
});

