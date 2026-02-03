import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, ActivityIndicator, Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { apiService } from '../services/apiService';
import { useSelectedChurch } from '../hooks/useSelectedChurch';
import { usePermissions } from '../hooks/usePermissions';
import { useLanguageUpdate } from '../hooks/useLanguageUpdate';
import Carousel from '../components/Carousel';
import BottomSheet from '../components/BottomSheet';
import i18nService from '../services/i18nService';
import { extractApiObject } from '../utils/apiResponse';
import { getId, getUserChurchId } from '../utils/idHelper';

// Type pour les noms d'icônes Material Icons valides
type MaterialIconName = 
  | 'admin-panel-settings'
  | 'account-tree'
  | 'supervisor-account'
  | 'group-work'
  | 'emoji-people'
  | 'meeting-room'
  | 'person'
  | 'apps'
  | 'star'
  | 'people'
  | 'diversity-3'
  | 'person-add-alt-1'
  | 'sentiment-dissatisfied'
  | 'child-care';

interface Stats {
  total_gouvernance?: number;
  total_reseaux?: number;
  total_resp_reseaux?: number;
  total_gr?: number;
  total_resp_gr?: number;
  total_sessions?: number;
  total_resp_sessions?: number;
  total_unites?: number;
  total_resp_unites?: number;
  total_membres_session?: number;
  total_leaders?: number;
  total_companions?: number;
  total_network_members?: number;
  total_leaders_all?: number;
  total_reguliers?: number;
  total_integration?: number;
  total_irreguliers?: number;
  total_ecodim?: number;
  total_all?: number;
}

const StatCard = ({ label, value, iconName }: { label: string; value: number | undefined; iconName: MaterialIconName }) => (
  <Card style={styles.statCard}>
    <View style={styles.cardContentWrapper}>
      <LinearGradient
        colors={['#FFFFFF', '#F5F3FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <Card.Content style={styles.statContent}>
          <LinearGradient
            colors={['rgb(59, 20, 100)', '#662d91', '#9e005d']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconContainer}
          >
            <MaterialIcons name={iconName} size={30} color="#fff" />
          </LinearGradient>
          <Text style={styles.statLabel}>{label}</Text>
          <Text style={styles.statValue}>{value || 0}</Text>
        </Card.Content>
      </LinearGradient>
    </View>
  </Card>
);

export default function HomeScreen() {
  const { user } = useSelector((state: RootState) => state.auth);
  // Forcer le re-render quand la langue change
  useLanguageUpdate();
  const { selectedChurch, churches, changeSelectedChurch } = useSelectedChurch();
  const { isAdmin, isSuperAdmin } = usePermissions();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [churchBottomSheetVisible, setChurchBottomSheetVisible] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      let churchId: string | null = null;
      
      if (isAdmin || isSuperAdmin) {
        churchId = getId(selectedChurch) || getUserChurchId(user);
      } else {
        churchId = getUserChurchId(user);
      }
      
      const res = churchId 
        ? await apiService.stats.getOverview({ churchId })
        : await apiService.stats.getOverview();
      
      setStats(extractApiObject(res, {}));
    } catch (err) {
      console.error('Erreur lors du chargement des statistiques:', err);
      setStats({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, selectedChurch, isAdmin, isSuperAdmin]);

  const handleChurchChange = (churchId: string | undefined) => {
    if (churchId) {
      changeSelectedChurch(churchId);
      setChurchBottomSheetVisible(false);
    }
  };

  // Préparer les items pour le BottomSheet
  const churchItems = churches.map((church) => ({
    label: church.nom,
    value: getId(church) || '',
    selected: getId(selectedChurch) === getId(church),
  }));

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#662d91" />
        <Text style={styles.loadingText}>{i18nService.t('home.statsLoading')}</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: '#666' }}>{i18nService.t('common.noData')}</Text>
      </View>
    );
  }

  const statsConfig: Array<{ label: string; value: number | undefined; iconName: MaterialIconName }> = [
    { label: i18nService.t('home.gouvernance'), value: stats.total_gouvernance, iconName: 'admin-panel-settings' },
    { label: i18nService.t('home.totalReseaux'), value: stats.total_reseaux, iconName: 'account-tree' },
    { label: i18nService.t('home.responsablesReseaux'), value: stats.total_resp_reseaux, iconName: 'supervisor-account' },
    { label: i18nService.t('home.totalGr'), value: stats.total_gr, iconName: 'group-work' },
    { label: i18nService.t('home.responsablesGr'), value: stats.total_resp_gr, iconName: 'emoji-people' },
    { label: i18nService.t('home.totalSections'), value: stats.total_sessions, iconName: 'meeting-room' },
    { label: i18nService.t('home.responsablesSections'), value: stats.total_resp_sessions, iconName: 'person' },
    { label: i18nService.t('home.totalUnites'), value: stats.total_unites, iconName: 'apps' },
    { label: i18nService.t('home.responsablesUnites'), value: stats.total_resp_unites, iconName: 'admin-panel-settings' },
    { label: i18nService.t('home.membresSection'), value: stats.total_membres_session, iconName: 'person' },
    { label: i18nService.t('home.leaders'), value: stats.total_leaders, iconName: 'star' },
    { label: i18nService.t('home.companions'), value: stats.total_companions, iconName: 'people' },
    { label: i18nService.t('home.membresReseaux'), value: stats.total_network_members, iconName: 'people' },
    { label: i18nService.t('home.leadersTous'), value: stats.total_leaders_all, iconName: 'star' },
    { label: i18nService.t('home.membresReguliers'), value: stats.total_reguliers, iconName: 'diversity-3' },
    { label: i18nService.t('home.membresEnIntegration'), value: stats.total_integration, iconName: 'person-add-alt-1' },
    { label: i18nService.t('home.membresIrréguliers'), value: stats.total_irreguliers, iconName: 'sentiment-dissatisfied' },
    { label: i18nService.t('home.ecodim'), value: stats.total_ecodim, iconName: 'child-care' },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      

      <Carousel />

      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          {i18nService.t('home.title')}
        </Text>

        {(isAdmin || isSuperAdmin) && churches.length > 0 && (
          <View style={styles.churchFilter}>
            <View style={styles.filterContainer}>
              <MaterialIcons name="church" size={20} color="#662d91" style={styles.filterIcon} />
              <Text style={styles.filterLabel}>
                {i18nService.t('home.filterByChurch')}
              </Text>
            </View>
            <Button
              mode="contained"
              onPress={() => setChurchBottomSheetVisible(true)}
              style={styles.churchButton}
              contentStyle={styles.churchButtonContent}
              labelStyle={styles.churchButtonLabel}
              buttonColor="#662d91"
              icon="chevron-down"
            >
              {selectedChurch?.nom || i18nService.t('home.selectChurch')}
            </Button>
            <BottomSheet
              visible={churchBottomSheetVisible}
              onClose={() => setChurchBottomSheetVisible(false)}
              items={churchItems}
              onSelect={(item) => handleChurchChange(item.value as string)}
              title={i18nService.t('home.filterByChurch')}
            />
          </View>
        )}

        <View style={styles.statsGrid}>
          {statsConfig.map((stat, index) => (
            <StatCard
              key={index}
              label={stat.label}
              value={stat.value || 0}
              iconName={stat.iconName}
            />
          ))}
          
          {/* Carte totale avec dégradé */}
          <Card style={[styles.statCard, styles.totalCard]}>
            <View style={styles.cardContentWrapper}>
              <LinearGradient
                colors={['rgb(59, 20, 100)', '#662d91', '#9e005d']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.totalGradient}
              >
                <Card.Content style={styles.statContent}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.1)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.totalIconContainer}
                  >
                    <MaterialIcons name="people" size={30} color="#fff" />
                  </LinearGradient>
                  <Text style={[styles.statLabel, styles.totalLabel]}>
                    {i18nService.t('home.totalEffectif')}
                  </Text>
                  <Text style={[styles.statValue, styles.totalValue]}>
                    {stats.total_all || 0}
                  </Text>
                </Card.Content>
              </LinearGradient>
            </View>
          </Card>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  platformTitleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
    backgroundColor: '#f0f2f5',
  },
  platformTitle: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    color: '#662d91',
    marginBottom: 12,
  },
  titleDivider: {
    width: 80,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  content: {
    padding: 20,
    paddingBottom: 30,
  },
  title: {
    textAlign: 'center',
    fontWeight: '800',
    marginBottom: 24,
    color: '#662d91',
    fontSize: 28,
    letterSpacing: 0.5,
  },
  churchFilter: {
    marginBottom: 16,
    alignItems: 'center',
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 14,
  },
  statCard: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 24,
    backgroundColor: '#fff',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  cardContentWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardGradient: {
    borderRadius: 24,
    flex: 1,
  },
  totalCard: {
    width: '100%',
    borderRadius: 24,
    elevation: 8,
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  totalGradient: {
    borderRadius: 24,
    flex: 1,
  },
  statContent: {
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  totalIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    elevation: 4,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
    color: '#555',
    lineHeight: 14,
  },
  totalLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: '#662d91',
  },
  totalValue: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
});

