import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Text, Card, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { logout } from '../../store/slices/authSlice';
import { getImageUrl, DEFAULT_PROFILE_IMAGE } from '../../config/apiConfig';
import i18nService from '../../services/i18nService';
import roleService from '../../services/roleService';
import { getMe } from '../../store/slices/authSlice';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import BottomSheet from '../../components/BottomSheet';

export default function MenuTab() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [roleMenuVisible, setRoleMenuVisible] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [isChangingRole, setIsChangingRole] = useState(false);

  // Obtenir l'URL de l'image de profil
  const getProfileImageUrl = useCallback(() => {
    if (!user) return DEFAULT_PROFILE_IMAGE;
    if (user.image) {
      return getImageUrl(user.image);
    }
    return DEFAULT_PROFILE_IMAGE;
  }, [user]);

  // Charger les rôles disponibles
  const loadAvailableRoles = useCallback(async () => {
    try {
      if (user && (user.available_roles?.length > 1 || user.role_assignments?.length > 1)) {
        if (user.available_roles && user.available_roles.length > 0) {
          // Filtrer le rôle MEMBRE
          const filteredRoles = user.available_roles.filter((role: string) => role !== 'MEMBRE');
          setAvailableRoles(filteredRoles);
          return;
        }
        
        // Sinon, charger depuis l'API
        const response = await roleService.getAvailableRoles();
        const roles = response.data?.available_roles || [];
        const filteredRoles = roles.filter((role: string) => role !== 'MEMBRE');
        setAvailableRoles(filteredRoles);
      } else {
        // Si l'utilisateur n'a plus plusieurs rôles, vider la liste
        setAvailableRoles([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des rôles:', error);
      // Fallback: utiliser les rôles de l'utilisateur
      if (user?.available_roles) {
        const filteredRoles = user.available_roles.filter((role: string) => role !== 'MEMBRE');
        setAvailableRoles(filteredRoles);
      } else {
        setAvailableRoles([]);
      }
    }
  }, [user]);
  
  // Recharger les rôles disponibles quand user change
  useEffect(() => {
    if (user) {
      loadAvailableRoles();
    } else {
      setAvailableRoles([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.available_roles?.length, user?.role_assignments?.length, user?.id]);

  // Ouvrir le menu de changement de rôle
  const handleRoleMenuOpen = useCallback(() => {
    loadAvailableRoles();
    setRoleMenuVisible(true);
  }, [loadAvailableRoles]);

  // Fermer le menu de changement de rôle
  const handleRoleMenuClose = useCallback(() => {
    setRoleMenuVisible(false);
  }, []);

  // Formater le nom du rôle
  const formatRole = useCallback((role: string): string => {
    const roleMap: Record<string, string> = {
      'SUPER_ADMIN': 'Super-admin',
      'ADMIN': 'Administrateur',
      'MANAGER': 'Manager',
      'SUPERVISEUR': 'Superviseur',
      'COLLECTEUR_RESEAUX': 'Collecteur de réseaux',
      'COLLECTEUR_CULTE': 'Collecteur de culte',
      'MEMBRE': 'Membre',
    };
    return roleMap[role] || role;
  }, []);

  // Changer de rôle
  const handleRoleChange = useCallback(async (newRole: string) => {
    try {
      setIsChangingRole(true);
      await roleService.changeRole(newRole);
      
      // Recharger les données utilisateur
      await dispatch(getMe()).unwrap();
      
      // Attendre un court délai pour que les données soient mises à jour dans le state
      // Le menu restera ouvert et se mettra à jour automatiquement avec le nouveau rôle actif
      setTimeout(() => {
        setIsChangingRole(false);
        // Fermer le menu après la mise à jour pour que l'utilisateur voie le changement
        handleRoleMenuClose();
        
        // Afficher un message de succès
        Alert.alert(
          i18nService.t('success.success'),
          i18nService.t('success.roleChanged', { role: formatRole(newRole) })
        );
      }, 300);
    } catch (error: any) {
      console.error('Erreur lors du changement de rôle:', error);
      const errorMessage = error.response?.data?.message || error.message || i18nService.t('common.actions.roleChangeError');
      Alert.alert(i18nService.t('errors.error'), errorMessage);
      setIsChangingRole(false);
    }
  }, [dispatch, handleRoleMenuClose, formatRole]);

  // Calculer les items du BottomSheet avec le rôle actuel
  const roleItems = useMemo(() => {
    const currentRole = user?.current_role || user?.role;
    return availableRoles.map((role) => ({
      label: formatRole(role),
      value: role,
      selected: currentRole === role,
      disabled: isChangingRole,
      icon: currentRole === role ? 'check' : undefined,
    }));
  }, [availableRoles, user?.current_role, user?.role, isChangingRole, formatRole]);

  // Naviguer vers le profil
  const handleProfile = useCallback(() => {
    router.push('/profile' as any);
  }, [router]);

  // Déconnexion
  const handleLogout = useCallback(() => {
    Alert.alert(
      i18nService.t('navigation.logout'),
      i18nService.t('common.actions.confirmLogout'),
      [
        {
          text: i18nService.t('common.actions.cancel'),
          style: 'cancel',
        },
        {
          text: i18nService.t('navigation.logout'),
          style: 'destructive',
          onPress: () => {
            dispatch(logout());
            router.replace('/(auth)/login' as any);
          },
        },
      ]
    );
  }, [dispatch, router]);

  if (!user) {
    return null;
  }

  const profileImageUrl = getProfileImageUrl();
  const hasMultipleRoles = (user.available_roles?.length > 1 || user.role_assignments?.length > 1);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* En-tête avec photo de profil */}
        <View style={styles.headerSection}>
          <Image
            source={{ uri: profileImageUrl }}
            style={styles.profileImage}
          />
          <Text style={styles.profileName}>{user.username || ''}</Text>
          {user.pseudo && (
            <Text style={styles.profilePseudo}>{user.pseudo}</Text>
          )}
          <Text style={styles.profileRole}>
            {formatRole(user.current_role || user.role || 'MEMBRE')}
          </Text>
        </View>

        {/* Options du menu */}
        <View style={styles.optionsSection}>
          {/* Mon profil */}
          <TouchableOpacity
            onPress={handleProfile}
            style={styles.optionCard}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['rgba(102, 45, 145, 0.1)', 'rgba(102, 45, 145, 0.05)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.optionGradient}
            >
              <View style={styles.optionContent}>
                <View style={styles.optionIconContainer}>
                  <MaterialIcons name="account-circle" size={28} color="#662d91" />
                </View>
                <Text style={styles.optionTitle}>
                  {i18nService.t('navigation.profile')}
                </Text>
                <MaterialIcons name="chevron-right" size={24} color="#999" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Changer de rôle */}
          {hasMultipleRoles && (
            <>
              <TouchableOpacity
                onPress={handleRoleMenuOpen}
                style={styles.optionCard}
                activeOpacity={0.7}
                disabled={isChangingRole}
              >
                <LinearGradient
                  colors={['rgba(102, 45, 145, 0.1)', 'rgba(102, 45, 145, 0.05)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.optionGradient}
                >
                  <View style={styles.optionContent}>
                    <View style={styles.optionIconContainer}>
                      {isChangingRole ? (
                        <ActivityIndicator size="small" color="#662d91" />
                      ) : (
                        <MaterialIcons name="swap-horiz" size={28} color="#662d91" />
                      )}
                    </View>
                    <Text style={styles.optionTitle}>
                      {isChangingRole ? "Changement de rôle..." : "Changer de rôle"}
                    </Text>
                    <MaterialIcons name="chevron-right" size={24} color="#999" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
              <BottomSheet
                visible={roleMenuVisible}
                onClose={handleRoleMenuClose}
                items={roleItems}
                onSelect={(item) => handleRoleChange(item.value as string)}
                title="Changer de rôle"
              />
            </>
          )}

          {/* Déconnexion */}
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.optionCard}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['rgba(239, 68, 68, 0.1)', 'rgba(239, 68, 68, 0.05)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.optionGradient}
            >
              <View style={styles.optionContent}>
                <View style={styles.optionIconContainer}>
                  <MaterialIcons name="logout" size={28} color="#EF4444" />
                </View>
                <Text style={[styles.optionTitle, styles.logoutTitle]}>
                  {i18nService.t('navigation.logout')}
                </Text>
                <MaterialIcons name="chevron-right" size={24} color="#999" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
  scrollContent: {
    padding: 20,
  },
  headerSection: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(102, 45, 145, 0.1)',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#662d91',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#662d91',
    marginBottom: 4,
  },
  profilePseudo: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  optionsSection: {
    gap: 16,
  },
  optionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(102, 45, 145, 0.1)',
  },
  optionGradient: {
    padding: 16,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(102, 45, 145, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#662d91',
  },
  logoutTitle: {
    color: '#EF4444',
  },
  selectedRoleItem: {
    color: '#662d91',
    fontWeight: '700',
  },
});
