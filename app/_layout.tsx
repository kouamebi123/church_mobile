import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import 'react-native-reanimated';
import { Provider, useDispatch } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { SelectedChurchProvider } from '../hooks/useSelectedChurch';
import { AppDispatch, store } from '../store';
import { initializeAuth } from '../store/slices/authSlice';
import { LanguageProvider } from '../contexts/LanguageContext';
import { customPaperTheme } from '../constants/paperTheme';

import { useColorScheme } from '@/hooks/use-color-scheme';

// Composant pour initialiser l'authentification
function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Initialiser l'authentification au démarrage
    dispatch(initializeAuth());
  }, [dispatch]);

  return <>{children}</>;
}

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  // Appeler tous les hooks en premier, avant tout retour conditionnel
  // useColorScheme doit être appelé de manière inconditionnelle
  const colorScheme = useColorScheme() || 'light';

  // S'assurer que tous les hooks sont appelés avant tout rendu conditionnel
  return (
    <Provider store={store}>
      <PaperProvider theme={customPaperTheme}>
        <LanguageProvider>
          <AuthInitializer>
            <SelectedChurchProvider>
              <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
                </Stack>
                <StatusBar style="auto" />
              </ThemeProvider>
            </SelectedChurchProvider>
          </AuthInitializer>
        </LanguageProvider>
      </PaperProvider>
    </Provider>
  );
}
