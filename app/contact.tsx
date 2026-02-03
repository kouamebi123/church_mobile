import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  Text,
  Button,
  Card,
  ActivityIndicator,
  Snackbar,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import { apiService } from '../services/apiService';
import { useLanguageUpdate } from '../hooks/useLanguageUpdate';
import i18nService from '../services/i18nService';
import { getApiErrorMessage } from '../utils/errorHandler';

interface ContactInfo {
  email: string;
  phone: string;
  location: string;
}

export default function ContactScreen() {
  // Forcer le re-render quand la langue change
  useLanguageUpdate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    email: '',
    phone: '',
    location: '',
  });
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Charger les informations de contact depuis l'API
  useEffect(() => {
    const fetchContactInfo = async () => {
      try {
        const response = await apiService.appSettings.get();
        const data = response.data;
        
        if (data.success) {
          setContactInfo({
            email: data.data.contact_email || '',
            phone: data.data.contact_phone || '',
            location: data.data.contact_location || '',
          });
        }
      } catch (error) {
        console.error('Erreur lors du chargement des informations de contact:', error);
      } finally {
        setLoadingInfo(false);
      }
    };

    fetchContactInfo();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = i18nService.t('contact.form.validation.nameRequired');
    } else if (formData.name.trim().length < 2) {
      newErrors.name = i18nService.t('contact.form.validation.nameMin');
    }

    if (!formData.email.trim()) {
      newErrors.email = i18nService.t('contact.form.validation.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = i18nService.t('contact.form.validation.emailInvalid');
    }

    if (!formData.subject.trim()) {
      newErrors.subject = i18nService.t('contact.form.validation.subjectRequired');
    }

    if (!formData.message.trim()) {
      newErrors.message = i18nService.t('contact.form.validation.messageRequired');
    } else if (formData.message.trim().length < 10) {
      newErrors.message = i18nService.t('contact.form.validation.messageMin');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitSuccess(false);

    try {
      const response = await apiService.contact.send(formData);
      const data = response.data;

      if (!data.success) {
        throw new Error(data.message || i18nService.t('contact.form.error'));
      }

      setSubmitSuccess(true);
      setSnackbarMessage(i18nService.t('contact.form.success'));
      setSnackbarVisible(true);
      
      // Réinitialiser le formulaire
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
      });
      setErrors({});
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi du message:', error);
      const errorMessage = getApiErrorMessage(error, 'contact.form.error');
      setSnackbarMessage(errorMessage);
      setSnackbarVisible(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {i18nService.t('contact.title')}
          </Text>
          <View style={styles.headerDivider} />
          <Text style={styles.headerSubtitle}>
            {i18nService.t('contact.subtitle')}
          </Text>
        </View>

        {/* Formulaire */}
        <Card style={styles.formCard}>
          <LinearGradient
            colors={['#FFFFFF', '#F8F7FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <Card.Content style={styles.cardContent}>
              <Text style={styles.formTitle}>
                {i18nService.t('contact.form.title')}
              </Text>

              {submitSuccess && (
                <View style={styles.successAlert}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.successText}>
                    {i18nService.t('contact.form.successMessage')}
                  </Text>
                </View>
              )}

              <View style={styles.formRow}>
                <Text style={styles.label}>
                  {i18nService.t('contact.form.name')} *
                </Text>
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  placeholder={i18nService.t('contact.form.name')}
                  value={formData.name}
                  onChangeText={(text) => {
                    setFormData({ ...formData, name: text });
                    if (errors.name) setErrors({ ...errors, name: '' });
                  }}
                />
                {errors.name && (
                  <Text style={styles.errorText}>{errors.name}</Text>
                )}
              </View>

              <View style={styles.formRow}>
                <Text style={styles.label}>
                  {i18nService.t('contact.form.email')} *
                </Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder={i18nService.t('contact.form.email')}
                  value={formData.email}
                  onChangeText={(text) => {
                    setFormData({ ...formData, email: text });
                    if (errors.email) setErrors({ ...errors, email: '' });
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {errors.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}
              </View>

              <View style={styles.formRow}>
                <Text style={styles.label}>
                  {i18nService.t('contact.form.subject')} *
                </Text>
                <TextInput
                  style={[styles.input, errors.subject && styles.inputError]}
                  placeholder={i18nService.t('contact.form.subject')}
                  value={formData.subject}
                  onChangeText={(text) => {
                    setFormData({ ...formData, subject: text });
                    if (errors.subject) setErrors({ ...errors, subject: '' });
                  }}
                />
                {errors.subject && (
                  <Text style={styles.errorText}>{errors.subject}</Text>
                )}
              </View>

              <View style={styles.formRow}>
                <Text style={styles.label}>
                  {i18nService.t('contact.form.message')} *
                </Text>
                <TextInput
                  style={[styles.textArea, errors.message && styles.inputError]}
                  placeholder={i18nService.t('contact.form.message')}
                  value={formData.message}
                  onChangeText={(text) => {
                    setFormData({ ...formData, message: text });
                    if (errors.message) setErrors({ ...errors, message: '' });
                  }}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
                {errors.message && (
                  <Text style={styles.errorText}>{errors.message}</Text>
                )}
              </View>

              <Button
                mode="contained"
                onPress={handleSubmit}
                disabled={isSubmitting}
                loading={isSubmitting}
                style={styles.submitButton}
                labelStyle={styles.submitButtonLabel}
                icon={({ size, color }) => (
                  <MaterialIcons name="send" size={size} color={color} />
                )}
              >
                {isSubmitting
                  ? i18nService.t('contact.form.sending')
                  : i18nService.t('contact.form.send')}
              </Button>
            </Card.Content>
          </LinearGradient>
        </Card>

        {/* Informations de contact */}
        <Card style={styles.infoCard}>
          <LinearGradient
            colors={['#FFFFFF', '#F8F7FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <Card.Content style={styles.cardContent}>
              <Text style={styles.infoTitle}>
                {i18nService.t('contact.info.title')}
              </Text>

              {/* Email */}
              <View style={styles.infoBox}>
                <LinearGradient
                  colors={['rgb(59, 20, 100)', '#662d91', '#9e005d']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.infoIconContainer}
                >
                  <MaterialIcons name="email" size={24} color="#fff" />
                </LinearGradient>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>
                    {i18nService.t('contact.info.email.title')}
                  </Text>
                  <Text style={styles.infoValue}>
                    {loadingInfo ? '...' : (contactInfo.email || 'Non renseigné')}
                  </Text>
                </View>
              </View>

              {/* Téléphone */}
              <View style={styles.infoBox}>
                <LinearGradient
                  colors={['rgb(59, 20, 100)', '#662d91', '#9e005d']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.infoIconContainer}
                >
                  <MaterialIcons name="phone" size={24} color="#fff" />
                </LinearGradient>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>
                    {i18nService.t('contact.info.phone.title')}
                  </Text>
                  <Text style={styles.infoValue}>
                    {loadingInfo ? '...' : (contactInfo.phone || 'Non renseigné')}
                  </Text>
                </View>
              </View>

              {/* Localisation */}
              <View style={styles.infoBox}>
                <LinearGradient
                  colors={['rgb(59, 20, 100)', '#662d91', '#9e005d']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.infoIconContainer}
                >
                  <MaterialIcons name="location-on" size={24} color="#fff" />
                </LinearGradient>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>
                    {i18nService.t('contact.info.location.title')}
                  </Text>
                  <Text style={styles.infoValue}>
                    {loadingInfo ? '...' : (contactInfo.location || 'Non renseigné')}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </LinearGradient>
        </Card>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={styles.snackbar}
      >
        {snackbarMessage}
      </Snackbar>
    </KeyboardAvoidingView>
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
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#662d91',
    marginBottom: 12,
  },
  headerDivider: {
    width: 100,
    height: 4,
    backgroundColor: '#662d91',
    borderRadius: 2,
    marginBottom: 12,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  formCard: {
    borderRadius: 24,
    marginBottom: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(102, 45, 145, 0.1)',
  },
  cardGradient: {
    borderRadius: 24,
  },
  cardContent: {
    padding: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#662d91',
    marginBottom: 20,
  },
  successAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  successText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  formRow: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#662d91',
    borderRadius: 12,
    paddingVertical: 4,
    marginTop: 8,
  },
  submitButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 8,
  },
  infoCard: {
    borderRadius: 24,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(102, 45, 145, 0.1)',
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#662d91',
    marginBottom: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: 'rgba(102, 45, 145, 0.1)',
    marginBottom: 16,
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#662d91',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#666',
  },
  snackbar: {
    backgroundColor: '#333',
  },
});
