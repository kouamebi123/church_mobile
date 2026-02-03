import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter, Redirect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { login, getMe } from '../../store/slices/authSlice';
import { RootState, AppDispatch } from '../../store';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const { isLoading, isAuthenticated, user, token } = useSelector((state: RootState) => state.auth);
  
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ pseudo?: string; password?: string }>({});
  
  // Animations - TOUS les hooks doivent être appelés avant tout retour conditionnel
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animation d'entrée
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Animation de pulsation pour le logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotation subtile du logo
    Animated.loop(
      Animated.timing(logoRotate, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  // Rediriger automatiquement après la connexion réussie
  useEffect(() => {
    if (isAuthenticated && user && token && !isLoading) {
      console.log('Redirection vers /(tabs) - isAuthenticated:', isAuthenticated, 'user:', !!user, 'token:', !!token);
      // Utiliser replace pour éviter de pouvoir revenir en arrière
      // Petit délai pour s'assurer que l'état est bien mis à jour
      setTimeout(() => {
        router.replace('/(tabs)' as any);
      }, 100);
    }
  }, [isAuthenticated, user, token, isLoading, router]);

  const logoRotation = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const validate = () => {
    const newErrors: { pseudo?: string; password?: string } = {};
    if (!pseudo.trim()) {
      newErrors.pseudo = 'Le pseudo est requis';
    }
    if (!password.trim()) {
      newErrors.password = 'Le mot de passe est requis';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    
    try {
      await dispatch(login({ pseudo, password })).unwrap();
      // Récupérer les données complètes de l'utilisateur après la connexion
      try {
        await dispatch(getMe()).unwrap();
      } catch (getMeError) {
        console.error('Erreur lors de la récupération des données utilisateur:', getMeError);
        // Ne pas bloquer la connexion si getMe échoue
      }
      // La redirection se fera automatiquement via le useEffect ci-dessus
      // car isAuthenticated sera mis à jour par Redux
    } catch (error: any) {
      setErrors({ password: error?.message || 'Erreur de connexion' });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <LinearGradient
        colors={['rgb(59, 20, 100)', '#662d91', '#9e005d']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Éléments décoratifs animés */}
        <Animated.View
          style={[
            styles.decorativeCircle1,
            {
              opacity: fadeAnim,
              transform: [{ scale: pulseAnim }],
            },
          ]}
          pointerEvents="none"
        />
        <Animated.View
          style={[
            styles.decorativeCircle2,
            {
              opacity: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.3],
              }),
            },
          ]}
          pointerEvents="none"
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim },
                ],
              },
            ]}
          >
            {/* Logo/Branding amélioré */}
            <View style={styles.logoContainer}>
              <Animated.View
                style={[
                  styles.logoCircle,
                  {
                    transform: [
                      { rotate: logoRotation },
                      { scale: pulseAnim },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.1)']}
                  style={styles.logoGradient}
                >
                  <MaterialIcons name="lock" size={48} color="#fff" />
                </LinearGradient>
              </Animated.View>
              <Text style={styles.appTitle}>MULTITUDES</Text>
              <Text style={styles.appSubtitle}>Bienvenue !</Text>
              <Text style={styles.appDescription}>Accédez à votre espace membre</Text>
              <View style={styles.titleUnderline} />
            </View>

            {/* Formulaire amélioré */}
            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <TextInput
                  label="Pseudo"
                  value={pseudo}
                  onChangeText={(text) => {
                    setPseudo(text);
                    if (errors.pseudo) setErrors((prev) => ({ ...prev, pseudo: undefined }));
                  }}
                  mode="outlined"
                  error={!!errors.pseudo}
                  autoCapitalize="none"
                  autoComplete="username"
                  left={<TextInput.Icon icon="account" />}
                  style={styles.input}
                  contentStyle={styles.inputContent}
                  outlineColor="#d1d5db"
                  activeOutlineColor="#662d91"
                  outlineStyle={styles.inputOutline}
                  textColor="#1f2937"
                />
                {errors.pseudo && (
                  <View style={styles.errorContainer}>
                    <MaterialIcons name="error-outline" size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{errors.pseudo}</Text>
                  </View>
                )}
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  label="Mot de passe"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  mode="outlined"
                  secureTextEntry={!showPassword}
                  error={!!errors.password}
                  autoCapitalize="none"
                  autoComplete="password"
                  left={<TextInput.Icon icon="lock" />}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowPassword(!showPassword)}
                    />
                  }
                  style={styles.input}
                  contentStyle={styles.inputContent}
                  outlineColor="#d1d5db"
                  activeOutlineColor="#662d91"
                  outlineStyle={styles.inputOutline}
                  textColor="#1f2937"
                  onSubmitEditing={handleLogin}
                />
                {errors.password && (
                  <View style={styles.errorContainer}>
                    <MaterialIcons name="error-outline" size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{errors.password}</Text>
                  </View>
                )}
              </View>

              <Button
                mode="contained"
                onPress={handleLogin}
                loading={isLoading}
                disabled={isLoading}
                style={styles.loginButton}
                contentStyle={styles.loginButtonContent}
                labelStyle={styles.loginButtonLabel}
                buttonColor="transparent"
                textColor="#662d91"
              >
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </Button>

              <TouchableOpacity
                onPress={() => router.push('/(auth)/forgot-password')}
                style={styles.forgotButton}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotButtonText}>Mot de passe oublié ?</Text>
                <MaterialIcons name="arrow-forward" size={18} color="#662d91" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -100,
    right: -100,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    bottom: -50,
    left: -50,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    opacity: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 24,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 3,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
  },
  appSubtitle: {
    fontSize: 22,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  appDescription: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  titleUnderline: {
    width: 80,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 2,
    marginTop: 4,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 28,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    height: 57,
  },
  inputContent: {
    paddingVertical: 12,
    height: 57,
  },
  inputOutline: {
    borderRadius: 16,
    borderWidth: 2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '600',
  },
  loginButton: {
    marginTop: 12,
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  loginButtonContent: {
    paddingVertical: 10,
    height: 56,
  },
  loginButtonLabel: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 1,
  },
  forgotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  forgotButtonText: {
    color: '#662d91',
    fontSize: 15,
    fontWeight: '600',
    marginRight: 6,
  },
});
