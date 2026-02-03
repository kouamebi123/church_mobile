import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Card, Button, Chip, Divider, ActivityIndicator, IconButton } from 'react-native-paper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import BaseModal from './BaseModal';
import i18nService from '../../services/i18nService';
import previsionnelService from '../../services/previsionnelService';
import assistanceService from '../../services/assistanceService';

interface HistoriqueCulteModalProps {
  visible: boolean;
  onClose: () => void;
  networkData: any;
  onEditPrevisionnel?: (item: any) => void;
  onEditAssistance?: (item: any) => void;
}

export default function HistoriqueCulteModal({
  visible,
  onClose,
  networkData,
  onEditPrevisionnel,
  onEditAssistance,
}: HistoriqueCulteModalProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [previsionnels, setPrevisionnels] = useState<any[]>([]);
  const [assistances, setAssistances] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && networkData?.reseau?.id) {
      loadHistorique();
    }
  }, [visible, networkData]);

  const loadHistorique = async () => {
    if (!networkData?.reseau?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [previsionnelsRes, assistancesRes] = await Promise.all([
        previsionnelService.getStats({
          network_id: networkData.reseau.id,
          limit: 50,
        }).catch(() => ({ details: [], data: [] })),
        assistanceService.getStats({
          network_id: networkData.reseau.id,
          limit: 50,
        }).catch(() => ({ details: [], data: [] })),
      ]);
      
      // Extraire les données de manière sécurisée (comme dans le frontend)
      // previsionnelService.getStats retourne response.data, donc on accède directement
      const previsionnelsData = previsionnelsRes?.details || previsionnelsRes?.data?.details || previsionnelsRes?.data?.data || (Array.isArray(previsionnelsRes) ? previsionnelsRes : []);
      const assistancesData = assistancesRes?.details || assistancesRes?.data?.details || assistancesRes?.data?.data || (Array.isArray(assistancesRes) ? assistancesRes : []);
      
      // S'assurer que ce sont toujours des tableaux
      setPrevisionnels(Array.isArray(previsionnelsData) ? previsionnelsData : []);
      setAssistances(Array.isArray(assistancesData) ? assistancesData : []);
    } catch (error: any) {
      setError(i18nService.t('history.loadingError') || 'Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (type: 'previsionnel' | 'assistance', itemId: string) => {
    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer ce ${type === 'previsionnel' ? 'prévisionnel' : 'assistance'} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              if (type === 'previsionnel') {
                await previsionnelService.delete(itemId);
                setPrevisionnels(prev => prev.filter(p => p.id !== itemId));
                Alert.alert('Succès', 'Prévisionnel supprimé avec succès');
              } else {
                await assistanceService.delete(itemId);
                setAssistances(prev => prev.filter(a => a.id !== itemId));
                Alert.alert('Succès', 'Assistance supprimée avec succès');
              }
            } catch (error: any) {
              Alert.alert('Erreur', i18nService.t('history.deleteError') || 'Erreur lors de la suppression');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-FR');
    } catch {
      return dateString;
    }
  };

  const getTypeCulteLabel = (type: string) => {
    const types: Record<string, string> = {
      'CULTE_DIMANCHE': 'Culte Dimanche',
      'CULTE_MERCREDI': 'Culte Mercredi',
      'CULTE_VENDREDI': 'Culte Vendredi',
      'CULTE_SPECIAL': 'Culte Spécial',
      'REUNION_PRIERE': 'Réunion de prière',
      'ETUDE_BIBLIQUE': 'Étude biblique',
    };
    return types[type] || type;
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#662d91" />
        </View>
      );
    }

    if (error) {
      return <Text style={styles.errorText}>{error}</Text>;
    }

    const items = activeTab === 0 ? (previsionnels || []) : (assistances || []);

    if (!items || items.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialIcons name={activeTab === 0 ? "trending-up" : "check-circle"} size={48} color="#ccc" />
          <Text style={styles.emptyText}>
            {activeTab === 0 ? 'Aucun prévisionnel' : 'Aucune assistance'}
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.itemsContainer}>
        {items.map((item: any, index: number) => (
          <Card key={item.id || index} style={styles.itemCard}>
            <Card.Content>
              <View style={styles.itemHeader}>
                <View style={styles.itemInfo}>
                  <MaterialIcons name="calendar-today" size={20} color="#662d91" />
                  <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
                </View>
                <View style={styles.itemActions}>
                  <IconButton
                    icon="pencil"
                    iconColor="#662d91"
                    size={20}
                    onPress={() => {
                      if (activeTab === 0 && onEditPrevisionnel) {
                        onEditPrevisionnel(item);
                        onClose();
                      } else if (activeTab === 1 && onEditAssistance) {
                        onEditAssistance(item);
                        onClose();
                      }
                    }}
                  />
                  <IconButton
                    icon="delete"
                    iconColor="#ef4444"
                    size={20}
                    onPress={() => handleDelete(activeTab === 0 ? 'previsionnel' : 'assistance', item.id)}
                  />
                </View>
              </View>
              <View style={styles.chipRow}>
                <Chip mode="outlined" style={styles.chip}>
                  {getTypeCulteLabel(item.type_culte)}
                </Chip>
                <Chip mode="outlined" style={styles.chip}>
                  Total: {item.previsionnel || item.total_previsionnel || item.assistance || item.total_presents || 0}
                </Chip>
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    );
  };

  return (
    <BaseModal
      visible={visible}
      onClose={onClose}
      title={i18nService.t('home.historyOfCultes') || 'Historique des cultes'}
    >
      <View style={styles.container}>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 0 && styles.activeTab]}
            onPress={() => setActiveTab(0)}
          >
            <MaterialIcons name="trending-up" size={20} color={activeTab === 0 ? '#662d91' : '#666'} />
            <Text style={[styles.tabText, activeTab === 0 && styles.activeTabText]}>
              {i18nService.t('home.previsions') || 'Prévisionnels'} ({previsionnels.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 1 && styles.activeTab]}
            onPress={() => setActiveTab(1)}
          >
            <MaterialIcons name="check-circle" size={20} color={activeTab === 1 ? '#10b981' : '#666'} />
            <Text style={[styles.tabText, activeTab === 1 && styles.activeTabText]}>
              {i18nService.t('home.assistance') || 'Assistance'} ({assistances.length})
            </Text>
          </TouchableOpacity>
        </View>
        
        {renderContent()}

        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={onClose}
            buttonColor="#662d91"
            style={styles.closeButton}
          >
            {i18nService.t('common.actions.close') || 'Fermer'}
          </Button>
        </View>
      </View>
    </BaseModal>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 400,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#662d91',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#662d91',
    fontWeight: '700',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    padding: 16,
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
  itemsContainer: {
    maxHeight: 400,
  },
  itemCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    marginTop: 4,
  },
  footer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  closeButton: {
    marginTop: 8,
  },
});

