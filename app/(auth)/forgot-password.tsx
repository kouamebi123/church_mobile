import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { apiService } from '../../services/apiService';
import i18nService from '../../services/i18nService';

const { width } = Dimensions.get('window');

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
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
  }, []);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('L\'email est requis');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await apiService.auth.forgotPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
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
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
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
              <View style={styles.logoContainer}>
                <Animated.View
                  style={[
                    styles.logoCircle,
                    {
                      transform: [{ scale: pulseAnim }],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={['rgba(16, 185, 129, 0.3)', 'rgba(16, 185, 129, 0.1)']}
                    style={styles.logoGradient}
                  >
                    <MaterialIcons name="check-circle" size={48} color="#10B981" />
                  </LinearGradient>
                </Animated.View>
                <Text style={styles.appTitle}>MULTITUDES</Text>
                <Text style={styles.appSubtitle}>Email envoyé</Text>
                <Text style={styles.appDescription}>
                  Un lien de réinitialisation a été envoyé à votre adresse email.
                </Text>
                <View style={styles.titleUnderline} />
              </View>
              <View style={styles.formContainer}>
                <Button
                  mode="contained"
                  onPress={() => router.replace('/(auth)/login')}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                  buttonColor="transparent"
                  textColor="#662d91"
                >
                  {i18nService.t('auth.forgotPassword.backToLogin')}
                </Button>
              </View>
            </Animated.View>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    );
  }

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
            <View style={styles.logoContainer}>
              <Animated.View
                style={[
                  styles.logoCircle,
                  {
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.1)']}
                  style={styles.logoGradient}
                >
                  <MaterialIcons name="lock-reset" size={48} color="#fff" />
                </LinearGradient>
              </Animated.View>
              <Text style={styles.appTitle}>MULTITUDES</Text>
              <Text style={styles.appSubtitle}>Réinitialisation</Text>
              <View style={styles.titleUnderline} />
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.title}>Mot de passe oublié</Text>
              <Text style={styles.message}>
                Entrez votre email pour recevoir les instructions de réinitialisation
              </Text>

              <View style={styles.inputContainer}>
                <TextInput
                  label="Email"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (error) setError('');
                  }}
                  mode="outlined"
                  error={!!error}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  left={<TextInput.Icon icon="email" />}
                  style={styles.input}
                  contentStyle={styles.inputContent}
                  outlineColor="#d1d5db"
                  activeOutlineColor="#662d91"
                  outlineStyle={styles.inputOutline}
                  textColor="#1f2937"
                  onSubmitEditing={handleSubmit}
                />
                {error && (
                  <View style={styles.errorContainer}>
                    <MaterialIcons name="error-outline" size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}
              </View>

              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={isLoading}
                disabled={isLoading}
                style={styles.button}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
                buttonColor="transparent"
                textColor="#662d91"
              >
                {isLoading ? 'Envoi...' : 'Demander un nouveau lien'}
              </Button>

              <TouchableOpacity
                onPress={() => router.push('/(auth)/login')}
                style={styles.backButtonTouchable}
                activeOpacity={0.7}
              >
                <MaterialIcons name="arrow-back" size={20} color="#662d91" />
                <Text style={styles.backButtonText}>{i18nService.t('auth.forgotPassword.backToLogin')}</Text>
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
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#662d91',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
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
  button: {
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
  buttonContent: {
    paddingVertical: 10,
    height: 56,
  },
  buttonLabel: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 1,
  },
  backButtonTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#662d91',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
});
