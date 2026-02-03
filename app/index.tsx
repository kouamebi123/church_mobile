import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { getMe } from '../store/slices/authSlice';
import { authService } from '../services/authService';
import { View, ActivityIndicator, Text } from 'react-native';

export default function Index() {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, user, token, isLoading } = useSelector((state: RootState) => state.auth);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    // Vérifier si l'utilisateur a un token dans AsyncStorage
    const checkAuth = async () => {
      try {
        const storedToken = await authService.getToken();
        if (storedToken && !token) {
          // Si on a un token stocké mais pas dans Redux, récupérer les infos utilisateur
          try {
            await dispatch(getMe()).unwrap();
          } catch (error: any) {
            // Si getMe échoue, le token est probablement invalide, le supprimer
            console.warn('Erreur lors de la récupération des données utilisateur:', error?.message || error);
            // Ne pas supprimer le token ici car getMe.rejected dans authSlice le gère déjà
          }
        }
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'authentification:', error);
      } finally {
        setAuthInitialized(true);
      }
    };
    checkAuth();
  }, [dispatch, token]);

  // Afficher un loader pendant la vérification
  if (!authInitialized || isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#662d91" />
        <Text style={{ marginTop: 10, color: '#666' }}>Chargement...</Text>
      </View>
    );
  }

  // Si l'utilisateur est connecté, rediriger vers les tabs
  if (isAuthenticated && user && token) {
    return <Redirect href="/(tabs)" />;
  }

  // Sinon, rediriger vers la page de login
  return <Redirect href="/(auth)/login" />;
}

