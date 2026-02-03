import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  ActivityIndicator,
  Button,
  Divider,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../store';
import { useSelectedChurch } from '../../../../hooks/useSelectedChurch';
import { usePermissions } from '../../../../hooks/usePermissions';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { apiService } from '../../../../services/apiService';
import i18nService from '../../../../services/i18nService';
import { extractApiData, extractApiArray, extractApiObject } from '../../../../utils/apiResponse';
import { getApiErrorMessage } from '../../../../utils/errorHandler';

const STATUS_OPTIONS = ['Past.', 'MC.', 'PE.', 'CE.', 'Resp.', 'Diacre'];

const formatResponsableName = (username: string) => {
  if (!username) return '';
  const words = username.split(' ');
  const firstWord = words[0];
  const isStatusPrefix = STATUS_OPTIONS.includes(firstWord);
  
  if (isStatusPrefix) {
    return words.length >= 2 ? `${firstWord} ${words[1]}` : firstWord;
  } else {
    return firstWord;
  }
};

export default function SessionDetailsScreen() {
  const { language } = useLanguage();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { selectedChurch } = useSelectedChurch();
  const permissions = usePermissions();

  const [sessionData, setSessionData] = useState<any>({
    session: {},
    stats: {},
    units: [],
    members: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    if (!id) {
      setError('ID de session manquant');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [sessionRes, statsRes, unitsRes] = await Promise.all([
        apiService.sessions.getById(id),
        apiService.sessions.getStatsById(id),
        apiService.sessions.getUnits(id),
      ]);

      const session = extractApiObject(sessionRes, {});
      const stats = extractApiObject(statsRes, {});
      const units = extractApiArray(unitsRes);

      // Récupérer les membres de toutes les unités
      const allMembers: any[] = [];
      for (const unit of units) {
        if (unit.members && Array.isArray(unit.members)) {
          allMembers.push(...unit.members);
        }
      }

      setSessionData({
        session,
        stats,
        units,
        members: allMembers,
      });

      setLoading(false);
    } catch (err: any) {
      const errorMessage = getApiErrorMessage(err, 'networks.details.errors.loadData');
      setError(errorMessage);
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  }, [fetchData]);

  const toggleUnit = (unitId: string) => {
    setExpandedUnits(prev => {
      const newSet = new Set(prev);
      if (newSet.has(unitId)) {
        newSet.delete(unitId);
      } else {
        newSet.add(unitId);
      }
      return newSet;
    });
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#662d91" />
        <Text style={styles.loadingText}>
          {i18nService.t('sections.loading') || 'Chargement...'}
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={48} color="#d32f2f" />
        <Text style={styles.errorText}>{error}</Text>
        <Button
          mode="contained"
          onPress={fetchData}
          style={styles.retryButton}
        >
          {i18nService.t('common.actions.refresh')}
        </Button>
      </View>
    );
  }

  const { session, stats, units } = sessionData;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color="#662d91" />
          </TouchableOpacity>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>
              {session?.nom || i18nService.t('sections.details.title') || 'Détails de la Section'}
            </Text>
            <TouchableOpacity
              onPress={onRefresh}
              style={styles.refreshButton}
            >
              <MaterialIcons name="refresh" size={24} color="#662d91" />
            </TouchableOpacity>
          </View>
          <View style={styles.headerDivider} />
        </View>

        {/* Responsables */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="people" size={24} color="#662d91" />
            <Text style={styles.sectionTitle}>
              {i18nService.t('sections.details.responsables') || 'Responsables'}
            </Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.responsablesContainer}>
            {session?.responsable1 && (
              <View style={styles.responsableItem}>
                <MaterialIcons name="person" size={20} color="#662d91" />
                <Text style={styles.responsableLabel}>
                  {i18nService.t('sections.details.responsable1') || 'Responsable 1'}:
                </Text>
                <Text style={styles.responsableName}>
                  {formatResponsableName(session.responsable1.username || session.responsable1.pseudo || '')}
                </Text>
              </View>
            )}
            {session?.responsable2 && (
              <View style={styles.responsableItem}>
                <MaterialIcons name="person" size={20} color="#662d91" />
                <Text style={styles.responsableLabel}>
                  {i18nService.t('sections.details.responsable2') || 'Responsable 2'}:
                </Text>
                <Text style={styles.responsableName}>
                  {formatResponsableName(session.responsable2.username || session.responsable2.pseudo || '')}
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Statistiques */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="assessment" size={24} color="#662d91" />
            <Text style={styles.sectionTitle}>
              {i18nService.t('sections.details.statistics') || 'Statistiques'}
            </Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.statsGrid}>
            {(stats.nb_units !== undefined || stats.units !== undefined) && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.nb_units || stats.units || 0}</Text>
                <Text style={styles.statLabel}>
                  {i18nService.t('networks.sessions.units') || 'Unités'}
                </Text>
              </View>
            )}
            {(stats.nb_membres !== undefined || stats.members !== undefined) && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.nb_membres || stats.members || 0}</Text>
                <Text style={styles.statLabel}>
                  {i18nService.t('networks.sessions.members') || 'Membres'}
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Unités */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="group" size={24} color="#662d91" />
            <Text style={styles.sectionTitle}>
              {i18nService.t('sections.details.units') || 'Unités'}
            </Text>
            <Text style={styles.sectionCount}>({units?.length || 0})</Text>
          </View>
          <Divider style={styles.divider} />
          {units && units.length > 0 ? (
            <View style={styles.unitsContainer}>
              {units.map((unit: any, index: number) => {
                const unitId = (unit.id || unit._id || `unit-${index}`).toString();
                const membersCount = unit.members?.length || 0;
                const isExpanded = expandedUnits.has(unitId);
                const unitMembers = unit.members || [];

                return (
                  <View key={unitId} style={styles.unitItem}>
                    <TouchableOpacity
                      onPress={() => toggleUnit(unitId)}
                      style={styles.unitHeaderTouchable}
                    >
                      <View style={styles.unitHeader}>
                        <View style={styles.unitHeaderLeft}>
                          <MaterialIcons 
                            name={isExpanded ? "expand-less" : "expand-more"} 
                            size={24} 
                            color="#662d91" 
                          />
                          <Text style={styles.unitName}>{unit.nom || `Unité ${index + 1}`}</Text>
                        </View>
                        <View style={styles.unitBadge}>
                          <Text style={styles.unitBadgeText}>{membersCount}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                    <View style={styles.unitDetails}>
                      {unit.responsable1 && (
                        <View style={styles.unitResponsable}>
                          <MaterialIcons name="person" size={16} color="#666" />
                          <Text style={styles.unitResponsableText}>
                            {formatResponsableName(unit.responsable1.username || unit.responsable1.pseudo || '')}
                          </Text>
                        </View>
                      )}
                      {unit.responsable2 && (
                        <View style={styles.unitResponsable}>
                          <MaterialIcons name="person" size={16} color="#666" />
                          <Text style={styles.unitResponsableText}>
                            {formatResponsableName(unit.responsable2.username || unit.responsable2.pseudo || '')}
                          </Text>
                        </View>
                      )}
                    </View>
                    {isExpanded && unitMembers.length > 0 && (
                      <View style={styles.membersList}>
                        <Divider style={styles.membersDivider} />
                        <Text style={styles.membersListTitle}>
                          {i18nService.t('sections.details.totalMembers') || 'Membres'} ({unitMembers.length})
                        </Text>
                        {unitMembers.map((member: any, memberIndex: number) => {
                          const memberId = member.id || member._id || member.user?.id || member.user?._id || `member-${memberIndex}`;
                          const memberData = member.user || member;
                          const qualification = memberData.qualification || '';
                          return (
                            <View key={memberId} style={styles.memberItem}>
                              <MaterialIcons name="person" size={18} color="#662d91" />
                              <View style={styles.memberInfo}>
                                <Text style={styles.memberName}>
                                  {memberData.username || memberData.pseudo || i18nService.t('common_text.unknownName')}
                                </Text>
                                {qualification && (
                                  <Text style={styles.memberQualification}>
                                    {qualification}
                                  </Text>
                                )}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                    {isExpanded && unitMembers.length === 0 && (
                      <View style={styles.membersList}>
                        <Divider style={styles.membersDivider} />
                        <Text style={styles.emptyMembersText}>
                          {i18nService.t('sections.details.noMembers') || 'Aucun membre'}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="group-off" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                {i18nService.t('sections.details.noUnits') || 'Aucune unité'}
              </Text>
            </View>
          )}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
    backgroundColor: '#f0f2f5',
  },
  backButton: {
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: '#662d91',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 12,
  },
  headerDivider: {
    width: 100,
    height: 4,
    backgroundColor: '#662d91',
    borderRadius: 2,
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  refreshButton: {
    padding: 8,
  },
  sectionCard: {
    margin: 20,
    marginTop: 0,
    borderRadius: 16,
    backgroundColor: '#fff',
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  sectionCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  divider: {
    marginHorizontal: 16,
  },
  responsablesContainer: {
    padding: 16,
    gap: 12,
  },
  responsableItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  responsableLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  responsableName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statItem: {
    width: '47%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#662d91',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  unitsContainer: {
    padding: 16,
    gap: 12,
  },
  unitItem: {
    padding: 16,
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(102, 45, 145, 0.1)',
  },
  unitHeaderTouchable: {
    width: '100%',
  },
  unitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  unitHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  unitName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  unitBadge: {
    backgroundColor: '#662d91',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  unitBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  unitDetails: {
    gap: 6,
  },
  unitResponsable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unitResponsableText: {
    fontSize: 14,
    color: '#666',
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
  membersList: {
    marginTop: 12,
    paddingTop: 12,
  },
  membersDivider: {
    marginBottom: 12,
  },
  membersListTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#662d91',
    marginBottom: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(102, 45, 145, 0.1)',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  memberQualification: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  emptyMembersText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 16,
  },
});

