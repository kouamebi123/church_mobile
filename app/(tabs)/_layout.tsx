import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Tabs, Stack, useRouter } from 'expo-router';
import React from 'react';
import { useSelector } from 'react-redux';
import { usePermissions } from '../../hooks/usePermissions';
import { useLanguage } from '../../contexts/LanguageContext';
import i18nService from '../../services/i18nService';
import { RootState } from '../../store';
import { LinearGradient } from 'expo-linear-gradient';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import useNavbarMessaging from '../../hooks/useNavbarMessaging';
import MessageModal from '../../components/MessageModal';
import { getImageUrl, DEFAULT_PROFILE_IMAGE } from '../../config/apiConfig';

// Composant d'en-tête personnalisé avec dégradé
const GradientHeader = React.memo(({ title }: { title: string }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const router = useRouter();
  const {
    messageStats,
    messageModalOpen,
    handleMessageModalOpen,
    handleMessageModalClose,
  } = useNavbarMessaging(user);

  const handleMessagePress = React.useCallback(() => {
    handleMessageModalOpen();
  }, [handleMessageModalOpen]);

  const handleWebPress = React.useCallback(() => {
    router.push('/(tabs)/web' as any);
  }, [router]);

  // Mémoriser le badge pour éviter les re-renders inutiles
  const badge = React.useMemo(() => {
    if (messageStats.unread_count <= 0) return null;
    return (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {messageStats.unread_count > 99 ? '99+' : messageStats.unread_count}
        </Text>
      </View>
    );
  }, [messageStats.unread_count]);

  return (
    <LinearGradient
      colors={['rgb(59, 20, 100)', '#662d91', '#9e005d']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.headerGradient}
    >
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>{title}</Text>
        {user && (
          <View style={styles.headerActions}>
            <TouchableOpacity 
              onPress={handleWebPress}
              style={styles.headerButton}
            >
              <Ionicons name="globe" size={24} color="rgba(255, 255, 255, 0.9)" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleMessagePress}
              style={styles.messageButton}
            >
              <View style={styles.messageIconContainer}>
                <Ionicons name="chatbubbles" size={24} color="rgba(255, 255, 255, 0.9)" />
                {badge}
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
      {user && (
        <MessageModal
          visible={messageModalOpen}
          onClose={handleMessageModalClose}
          messageStats={messageStats}
        />
      )}
    </LinearGradient>
  );
});

export default function TabLayout() {
  const { user, isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);
  const permissions = usePermissions();
  const { language } = useLanguage(); // Utiliser la langue du contexte pour déclencher les re-renders

  // Initialiser i18n si nécessaire - une seule fois au montage
  // Ne pas le faire ici car cela peut causer des re-renders infinis
  // L'initialisation se fait dans _layout.tsx ou au démarrage de l'app

  // Créer une fonction header stable qui lit TOUJOURS la valeur actuelle depuis i18nService
  // Cette fonction ne change JAMAIS de référence, elle lit la valeur à jour à chaque appel
  const renderHeader = React.useCallback(
    () => <GradientHeader title={i18nService.t('home.welcome.title')} />,
    [] // Fonction complètement stable, lit toujours la valeur à jour
  );

  // Toutes les fonctions tabBarIcon sont stables (ne changent jamais de référence)
  const homeIcon = React.useCallback(
    ({ color, focused }: { color: string; focused: boolean }) => (
      <IconSymbol 
        size={focused ? 26 : 24} 
        name="home" 
        color={color} 
      />
    ),
    []
  );

  const networksIcon = React.useCallback(
    ({ color, focused }: { color: string; focused: boolean }) => (
      <IconSymbol 
        size={focused ? 26 : 24} 
        name="people" 
        color={color} 
      />
    ),
    []
  );

  const servicesIcon = React.useCallback(
    ({ color, focused }: { color: string; focused: boolean }) => (
      <Ionicons 
        name={focused ? 'briefcase' : 'briefcase-outline'} 
        size={focused ? 26 : 24} 
        color={color} 
      />
    ),
    []
  );

  // Créer un composant pour l'icône du menu avec photo de profil
  const MenuIconComponent: React.FC<{ color: string; focused: boolean; user: any }> = React.memo(({ color, focused, user }) => {
    if (user?.image) {
      const imageUrl = getImageUrl(user.image) || DEFAULT_PROFILE_IMAGE;
      return (
        <View style={{ 
          width: focused ? 26 : 24, 
          height: focused ? 26 : 24, 
          borderRadius: focused ? 13 : 12, 
          overflow: 'hidden', 
          borderWidth: 2, 
          borderColor: color 
        }}>
          <Image 
            source={{ uri: imageUrl }} 
            style={{ width: '100%', height: '100%' }}
          />
        </View>
      );
    }
    return (
      <IconSymbol 
        size={focused ? 26 : 24} 
        name="person" 
        color={color} 
      />
    );
  });

  const menuIcon = React.useCallback(
    ({ color, focused }: { color: string; focused: boolean }) => (
      <MenuIconComponent color={color} focused={focused} user={user} />
    ),
    [user]
  );

  const testimoniesIcon = React.useCallback(
    ({ color, focused }: { color: string; focused: boolean }) => (
      <Ionicons 
        name={focused ? 'chatbox-ellipses' : 'chatbox-ellipses-outline'} 
        size={focused ? 26 : 24} 
        color={color} 
      />
    ),
    []
  );

  // Les options doivent être COMPLÈTEMENT STABLES - objets statiques sans traductions
  // pour éviter les boucles infinies causées par i18nService.t()
  const indexOptions = React.useMemo(
    () => ({
      title: 'Accueil', // Chaîne statique
      tabBarIcon: homeIcon,
    }),
    [homeIcon]
  );

  const networksOptions = React.useMemo(
    () => ({
      title: 'Réseaux', // Chaîne statique
      tabBarIcon: networksIcon,
    }),
    [networksIcon]
  );

  const servicesOptions = React.useMemo(
    () => ({
      title: 'Services', // Chaîne statique
      tabBarIcon: servicesIcon,
    }),
    [servicesIcon]
  );

  const menuOptions = React.useMemo(
    () => ({
      title: 'Menu', // Chaîne statique
      tabBarIcon: menuIcon,
    }),
    [menuIcon]
  );

  const testimoniesOptions = React.useMemo(
    () => ({
      title: 'Témoignages', // Chaîne statique
      tabBarIcon: testimoniesIcon,
    }),
    [testimoniesIcon]
  );

  // screenOptions doit être COMPLÈTEMENT STABLE (sans dépendances) pour éviter les boucles infinies
  // renderHeader est stable (useCallback avec []), donc on peut l'inclure sans problème
  // Mais pour être sûr, on le rend complètement statique
  const screenOptions = React.useMemo(
    () => ({
      tabBarActiveTintColor: '#662d91',
      tabBarInactiveTintColor: '#999',
      headerShown: true,
      header: renderHeader,
      tabBarButton: HapticTab,
      tabBarStyle: {
        backgroundColor: '#fff',
        borderTopWidth: 0,
        height: 70,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '600' as const,
        marginTop: 4,
      },
      tabBarIconStyle: {
        marginTop: 0,
        marginBottom: 2,
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // Dépendances vides - renderHeader est stable donc pas besoin de l'inclure
  );

  // Afficher un loader pendant le chargement de l'authentification
  // Ne pas retourner null car cela peut causer des problèmes avec Expo Router
  // Utiliser un composant vide à la place
  if (isLoading) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    );
  }

  // Ne pas afficher les tabs si l'utilisateur n'est pas connecté
  // Retourner un Stack minimal au lieu de null
  if (!isAuthenticated || !user) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    );
  }

  // Déterminer la visibilité des tabs basée sur les permissions
  const showNetworks = permissions.isAdmin || 
    permissions.isSuperAdmin || 
    permissions.isCollecteurReseaux || 
    permissions.isManager;

  const showServices = permissions.isSuperviseur || 
    permissions.isAdmin || 
    permissions.isSuperAdmin || 
    permissions.isCollecteurCulte || 
    permissions.isManager;

  const showTestimonies = permissions.isAdmin || 
    permissions.isSuperAdmin || 
    permissions.isManager;

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={indexOptions}
      />
      
      {/* Réseaux - Visible pour certains rôles */}
      <Tabs.Screen
        name="networks"
        options={showNetworks ? networksOptions : { href: null }}
      />

      {/* Services - Visible pour certains rôles */}
      <Tabs.Screen
        name="services"
        options={showServices ? servicesOptions : { href: null }}
      />

      {/* Témoignages - Visible uniquement pour les admins et managers */}
      <Tabs.Screen
        name="testimonies"
        options={showTestimonies ? testimoniesOptions : { href: null }}
      />

      {/* Masquer contact */}
      <Tabs.Screen
        name="contact"
        options={{
          href: null, // Masquer cet onglet
        }}
      />

      {/* Masquer calendar */}
      <Tabs.Screen
        name="calendar"
        options={{
          href: null, // Masquer cet onglet
        }}
      />

      {/* Masquer web (déplacé dans le header) */}
      <Tabs.Screen
        name="web"
        options={{
          href: null, // Masquer cet onglet
        }}
      />

      {/* Menu - Visible pour les utilisateurs connectés */}
      <Tabs.Screen
        name="menu"
        options={menuOptions}
      />

      {/* Masquer profile (redirigé vers menu) */}
      <Tabs.Screen
        name="profile"
        options={{
          href: null, // Masquer cet onglet
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerGradient: {
    height: 100,
    paddingTop: 50,
    paddingBottom: 10,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '700',
    fontSize: 18,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  messageButton: {
    padding: 8,
  },
  messageIconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
