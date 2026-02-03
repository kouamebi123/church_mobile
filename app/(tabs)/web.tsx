import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { Linking, Alert } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import i18nService from '../../services/i18nService';

const WEB_PLATFORM_URL = 'https://multitudeszno.up.railway.app/login';

export default function WebTab() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [opening, setOpening] = useState(false);

  const openWebPlatform = async () => {
    try {
      setOpening(true);
      const canOpen = await Linking.canOpenURL(WEB_PLATFORM_URL);
      if (canOpen) {
        await Linking.openURL(WEB_PLATFORM_URL);
      } else {
        Alert.alert(
          i18nService.t('errors.error'),
          i18nService.t('common.actions.openLinkError')
        );
      }
    } catch (error) {
      console.error('Erreur lors de l\'ouverture du lien:', error);
      Alert.alert(
        i18nService.t('errors.error'),
        i18nService.t('common.actions.openPlatformError')
      );
    } finally {
      setOpening(false);
    }
  };

  useEffect(() => {
    // Ouvrir le lien web automatiquement quand l'onglet est sélectionné
    openWebPlatform();
  }, []);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFFFFF', '#F5F3FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <MaterialIcons name="language" size={64} color="#662d91" />
        <Text style={styles.title}>
          {i18nService.t('navigation.webPlatform.title')}
        </Text>
        <Text style={styles.description}>
          {i18nService.t('navigation.webPlatform.description')}
        </Text>
        
        {opening ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#662d91" />
            <Text style={styles.loadingText}>
              {i18nService.t('navigation.webPlatform.opening')}
            </Text>
          </View>
        ) : (
          <Button
            mode="contained"
            onPress={openWebPlatform}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
            icon="open-in-new"
          >
            {i18nService.t('navigation.webPlatform.openButton')}
          </Button>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(102, 45, 145, 0.15)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#662d91',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  button: {
    borderRadius: 12,
    backgroundColor: '#662d91',
    width: '100%',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});

