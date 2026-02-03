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
import i18nService from '../services/i18nService';

interface Network {
  id: string;
  nom: string;
  responsables: string;
  nb_gr: number;
  nb_12: number;
  nb_144: number;
  nb_1728: number;
  nb_respo_gr: number;
  nb_companion: number;
  nb_leader: number;
  nb_leader_tous: number;
  nb_membre: number;
}

interface Session {
  id: string;
  nom: string;
  responsables: string;
  nb_units: number;
  nb_membres: number;
}

export default function NetworksScreen() {
  // Forcer le re-render quand la langue change
  useLanguageUpdate();
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  const { selectedChurch, churches, changeSelectedChurch } = useSelectedChurch();
  const permissions = usePermissions();
  const [networks, setNetworks] = useState<Network[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [churchMenuVisible, setChurchMenuVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'networks' | 'sessions'>('networks');

  // Options de statut pour le formatage des noms
  const STATUS_OPTIONS = ['Past.', 'MC.', 'PE.', 'CE.', 'Resp.', 'Diacre'];

  const formatResponsableName = (username: string) => {
    if (!username) return '';
    const words = username.split(' ');
    const firstWord = words[0];
    const isStatusPrefix = STATUS_OPTIONS.includes(firstWord);
    
    if (isStatusPrefix) {
      // Avec préfixe : préfixe + nom suivant (si disponible)
      return words.length >= 2 ? `${firstWord} ${words[1]}` : firstWord;
    } else {
      // Sans préfixe : premier mot seulement
      return firstWord;
    }
  };

  const calculateTotal = (network: Network) => {
    return (
      (network.nb_12 || 0) +
      (network.nb_144 || 0) +
      (network.nb_1728 || 0) +
      (network.nb_leader || 0) +
      (network.nb_membre || 0) +
      (network.nb_companion || 0) +
      (network.responsables ? network.responsables.split('&').length : 0)
    );
  };

  const calculateSessionTotal = (session: { nb_membres?: number; responsables?: string }) => {
    const nbResponsables = session.responsables ? session.responsables.split('&').length : 1;
    return (session.nb_membres || 0) + nbResponsables;
  };

  const loadNetworks = useCallback(async () => {
    try {
      setLoading(true);
      let response;
      let churchIdForStats = null;

      if (permissions.isAdmin || permissions.isSuperAdmin || permissions.isManager) {
        if (selectedChurch) {
          const churchId = selectedChurch.id || selectedChurch._id;
          response = await apiService.networks.getAll({ churchId });
          churchIdForStats = churchId;
        } else {
          setNetworks([]);
          setLoading(false);
          return;
        }
      } else if (user?.eglise_locale) {
        const userChurchId =
          typeof user.eglise_locale === 'object'
            ? user.eglise_locale.id || user.eglise_locale._id
            : user.eglise_locale;
        response = await apiService.networks.getAll({ churchId: userChurchId });
        churchIdForStats = userChurchId;
      } else {
        response = await apiService.networks.getAll();
      }

      const networksData = response.data?.data || response.data || [];

      // Charger les stats
      let allStatsData: any[] = [];
      if (churchIdForStats) {
        try {
          const statsResponse = await apiService.networks.getStats({ churchId: churchIdForStats });
          allStatsData = statsResponse.data?.data || statsResponse.data || [];
        } catch (err: any) {
          // Ne pas afficher d'erreur si c'est une erreur 403 (permissions insuffisantes)
          // ou si l'utilisateur n'a simplement pas accès aux stats
          if (err?.response?.status !== 403) {
            console.error('Erreur lors du chargement des stats:', err);
          }
          // Continuer sans les stats si l'erreur est 403
          allStatsData = [];
        }
      }

      const statsMap: Record<string, any> = {};
      allStatsData.forEach((networkStats) => {
        if (networkStats.id) {
          statsMap[networkStats.id] = networkStats.stats || {};
        }
      });

      const transformedNetworks = networksData.map((network: any) => {
        const networkId = network.id || network._id;
        const d = statsMap[networkId] || {};

        return {
          id: networkId,
          nom: network.nom,
          responsables: network.responsable2?.username
            ? `${formatResponsableName(network.responsable1?.username)} & ${formatResponsableName(network.responsable2?.username)}`
            : formatResponsableName(network.responsable1?.username),
          nb_gr: d.totalGroups ?? 0,
          nb_12: d[12] ?? 0,
          nb_144: d[144] ?? 0,
          nb_1728: d[1728] ?? 0,
          nb_respo_gr: d['Responsables de GR'] ?? 0,
          nb_companion: d["Compagnon d'œuvre"] ?? 0,
          nb_leader: d['Leader'] ?? 0,
          nb_leader_tous: d['Leader (Tous)'] ?? 0,
          nb_membre: d['Membre simple'] ?? 0,
        };
      });

      const sortedNetworks = transformedNetworks.sort((a: Network, b: Network) => {
        const totalA = calculateTotal(a);
        const totalB = calculateTotal(b);
        return totalB - totalA;
      });

      setNetworks(sortedNetworks);
    } catch (error) {
      console.error('Erreur lors du chargement des réseaux:', error);
      setNetworks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedChurch, user, permissions]);

  const loadSessions = useCallback(async () => {
    try {
      let sessionResponse;
      let churchIdUsed = null;

      if (permissions.isAdmin || permissions.isSuperAdmin || permissions.isManager) {
        if (selectedChurch) {
          churchIdUsed = selectedChurch.id || selectedChurch._id;
          sessionResponse = await apiService.sessions.getAll({ churchId: churchIdUsed });
        } else {
          setSessions([]);
          return;
        }
      } else if (user?.eglise_locale) {
        churchIdUsed =
          typeof user.eglise_locale === 'object'
            ? user.eglise_locale.id || user.eglise_locale._id
            : user.eglise_locale;
        sessionResponse = await apiService.sessions.getAll({ churchId: churchIdUsed });
      } else {
        sessionResponse = await apiService.sessions.getAll();
      }

      const sessionsData = sessionResponse?.data?.data || sessionResponse?.data || [];

      const transformedSessions = sessionsData.map((session: any) => {
        const responsables = session.responsable2?.username
          ? `${formatResponsableName(session.responsable1?.username)} & ${formatResponsableName(session.responsable2?.username)}`
          : formatResponsableName(session.responsable1?.username);

        const nbUnits = Array.isArray(session.units) ? session.units.length : 0;
        const nbMembres =
          session.units?.reduce((total: number, unit: any) => {
            return total + (unit._count?.members || 0);
          }, 0) || 0;

        const sessionData = {
          id: session.id || session._id,
          nom: session.nom,
          responsables,
          nb_units: nbUnits,
          nb_membres: nbMembres,
        };

        return {
          ...sessionData,
          total: calculateSessionTotal({ nb_membres: nbMembres, responsables }),
        };
      });

      setSessions(transformedSessions);
    } catch (error) {
      console.error('Erreur lors du chargement des sessions:', error);
      setSessions([]);
    }
  }, [selectedChurch, user, permissions]);

  useEffect(() => {
    loadNetworks();
    loadSessions();
  }, [loadNetworks, loadSessions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNetworks();
    loadSessions();
  }, [loadNetworks, loadSessions]);

  const handleNetworkPress = (networkId: string) => {
    router.push(`/networks/${networkId}` as any);
  };

  const handleSessionPress = (sessionId: string) => {
    router.push(`/networks/sessions/${sessionId}` as any);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {i18nService.t('navigation.networks')}
          </Text>
          <View style={styles.headerDivider} />
        </View>

        {/* Filtre d'église */}
        {(permissions.isAdmin || permissions.isSuperAdmin || permissions.isManager) &&
          churches.length > 0 && (
            <View style={styles.churchFilter}>
              <View style={styles.filterContainer}>
                <MaterialIcons name="church" size={20} color="#662d91" style={styles.filterIcon} />
                <Text style={styles.filterLabel}>
                  {i18nService.t('networks.filterByChurch')}
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
                {selectedChurch?.nom || i18nService.t('networks.filterByChurch')}
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
                title={i18nService.t('networks.filterByChurch')}
              />
            </View>
          )}

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'networks' && styles.tabActive]}
            onPress={() => setActiveTab('networks')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'networks' && styles.tabTextActive,
              ]}
            >
              {i18nService.t('networks.title')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'sessions' && styles.tabActive]}
            onPress={() => setActiveTab('sessions')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'sessions' && styles.tabTextActive,
              ]}
            >
              {i18nService.t('networks.sessions.title')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contenu */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#662d91" />
          </View>
        ) : (
          <>
            {activeTab === 'networks' && (
              <View style={styles.content}>
                {networks.length === 0 ? (
                  <Card style={styles.emptyCard}>
                    <Text style={styles.emptyText}>
                      {i18nService.t('networks.noNetworks')}
                    </Text>
                  </Card>
                ) : (
                  networks.map((network) => {
                    const total = calculateTotal(network);
                    return (
                      <TouchableOpacity
                        key={network.id}
                        onPress={() => handleNetworkPress(network.id)}
                      >
                        <Card style={styles.networkCard}>
                          <View style={styles.cardGradient}>
                            <LinearGradient
                              colors={['#FFFFFF', '#F5F3FF']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={styles.cardGradientInner}
                            >
                              <Card.Content style={styles.cardContent}>
                              <View style={styles.networkHeader}>
                                <Text style={styles.networkName}>{network.nom}</Text>
                                <MaterialIcons name="chevron-right" size={24} color="#662d91" />
                              </View>
                              <Text style={styles.networkResponsables}>
                                {network.responsables}
                              </Text>
                              <View style={styles.statsContainer}>
                                <View style={styles.statRow}>
                                  <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>
                                      {i18nService.t('networks.list.gr')}
                                    </Text>
                                    <Text style={styles.statValue}>{network.nb_gr}</Text>
                                  </View>
                                  <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>
                                      {i18nService.t('networks.list.group12')}
                                    </Text>
                                    <Text style={styles.statValue}>{network.nb_12}</Text>
                                  </View>
                                </View>
                                <View style={styles.statRow}>
                                  <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>
                                      {i18nService.t('networks.list.group144')}
                                    </Text>
                                    <Text style={styles.statValue}>{network.nb_144}</Text>
                                  </View>
                                  <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>
                                      {i18nService.t('networks.list.group1728')}
                                    </Text>
                                    <Text style={styles.statValue}>{network.nb_1728}</Text>
                                  </View>
                                </View>
                                <View style={styles.statRow}>
                                  <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>
                                      {i18nService.t('networks.list.responsableGR')}
                                    </Text>
                                    <Text style={styles.statValue}>{network.nb_respo_gr}</Text>
                                  </View>
                                  <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>
                                      {i18nService.t('networks.list.companion')}
                                    </Text>
                                    <Text style={styles.statValue}>{network.nb_companion}</Text>
                                  </View>
                                </View>
                                <View style={styles.statRow}>
                                  <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>
                                      {i18nService.t('networks.list.leader')}
                                    </Text>
                                    <Text style={styles.statValue}>{network.nb_leader}</Text>
                                  </View>
                                  <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>
                                      {i18nService.t('networks.list.member')}
                                    </Text>
                                    <Text style={styles.statValue}>{network.nb_membre}</Text>
                                  </View>
                                </View>
                                <View style={styles.totalContainer}>
                                  <Text style={styles.totalLabel}>
                                    {i18nService.t('networks.list.total')}
                                  </Text>
                                  <Text style={styles.totalValue}>{total}</Text>
                                </View>
                              </View>
                              </Card.Content>
                            </LinearGradient>
                          </View>
                        </Card>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}

            {activeTab === 'sessions' && (
              <View style={styles.content}>
                {sessions.length === 0 ? (
                  <Card style={styles.emptyCard}>
                    <Text style={styles.emptyText}>
                      {i18nService.t('networks.sessions.noSessions')}
                    </Text>
                  </Card>
                ) : (
                  sessions.map((session) => (
                    <TouchableOpacity
                      key={session.id}
                      onPress={() => handleSessionPress(session.id)}
                    >
                      <Card style={styles.sessionCard}>
                        <View style={styles.cardGradient}>
                          <LinearGradient
                            colors={['#FFFFFF', '#F5F3FF']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.cardGradientInner}
                          >
                            <Card.Content style={styles.cardContent}>
                            <View style={styles.sessionHeader}>
                              <Text style={styles.sessionName}>{session.nom}</Text>
                              <MaterialIcons name="chevron-right" size={24} color="#662d91" />
                            </View>
                            <Text style={styles.sessionResponsables}>
                              {session.responsables}
                            </Text>
                            <View style={styles.sessionStats}>
                              <View style={styles.sessionStatItem}>
                                <MaterialIcons name="group" size={20} color="#662d91" />
                                <Text style={styles.sessionStatText}>
                                  {session.nb_units} {i18nService.t('networks.sessions.units')}
                                </Text>
                              </View>
                              <View style={styles.sessionStatItem}>
                                <MaterialIcons name="people" size={20} color="#662d91" />
                                <Text style={styles.sessionStatText}>
                                  {session.nb_membres} {i18nService.t('networks.sessions.members')}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.sessionTotalContainer}>
                              <Text style={styles.sessionTotalLabel}>
                                {i18nService.t('networks.list.total') || 'Total'}
                              </Text>
                              <Text style={styles.sessionTotalValue}>
                                {session.total || 0}
                              </Text>
                            </View>
                          </Card.Content>
                          </LinearGradient>
                        </View>
                      </Card>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
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
    marginBottom: 12,
    color: '#662d91',
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
  filterLabel: {
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
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 4,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: '#662d91',
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '700',
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
  networkCard: {
    marginBottom: 20,
    borderRadius: 24,
    elevation: 8,
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(102, 45, 145, 0.15)',
  },
  sessionCard: {
    marginBottom: 20,
    borderRadius: 24,
    elevation: 8,
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(102, 45, 145, 0.15)',
  },
  cardGradient: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardGradientInner: {
    borderRadius: 24,
  },
  cardContent: {
    padding: 20,
  },
  networkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(102, 45, 145, 0.1)',
  },
  networkName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#662d91',
    flex: 1,
    letterSpacing: -0.3,
  },
  networkResponsables: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  statsContainer: {
    marginTop: 8,
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
  totalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#662d91',
    letterSpacing: -0.5,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(102, 45, 145, 0.1)',
  },
  sessionName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#662d91',
    flex: 1,
    letterSpacing: -0.3,
  },
  sessionResponsables: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  sessionStats: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
    paddingTop: 8,
  },
  sessionStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flex: 1,
  },
  sessionStatText: {
    fontSize: 14,
    color: '#662d91',
    fontWeight: '600',
  },
  sessionTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(102, 45, 145, 0.2)',
  },
  sessionTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#662d91',
  },
  sessionTotalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#662d91',
    letterSpacing: -0.5,
  },
});
