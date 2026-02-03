import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
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
  Switch,
  Menu,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { updateUserProfile, getMe } from '../store/slices/authSlice';
import { apiService } from '../services/apiService';
import { authService } from '../services/authService';
import { getImageUrl, DEFAULT_PROFILE_IMAGE } from '../config/apiConfig';
import i18nService from '../services/i18nService';
import preferencesService from '../services/preferencesService';
import preferencesApiService from '../services/preferencesApiService';
import { useLanguage } from '../contexts/LanguageContext';

export default function ProfileScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { setLanguage: setLanguageContext, t } = useLanguage();
  const [activeTab, setActiveTab] = useState(0); // 0: Info, 1: Password, 2: Preferences
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // États pour les informations de base
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    pseudo: '',
  });
  
  // États pour le mot de passe
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  
  // États pour les préférences
  const [preferences, setPreferences] = useState({
    language: 'fr',
    theme: 'light',
    autoTheme: true,
    email_notifications: true,
  });
  const [hasChanges, setHasChanges] = useState(false);
  
  // États pour les notifications
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Initialiser les données du profil
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        pseudo: user.pseudo || '',
      });
    }
  }, [user]);

  // Charger les préférences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const currentLanguage = i18nService.getCurrentLanguage();
        const autoTheme = preferencesService.getPreference('autoTheme') ?? true;
        
        const apiPreferences = await preferencesApiService.getPreferences();
        
        setPreferences({
          language: apiPreferences?.data?.language || currentLanguage,
          theme: apiPreferences?.data?.theme || 'light',
          autoTheme,
          email_notifications: apiPreferences?.data?.email_notifications ?? true,
        });
      } catch (error) {
        console.error('Erreur lors du chargement des préférences:', error);
        const currentLanguage = i18nService.getCurrentLanguage();
        setPreferences({
          language: currentLanguage,
          theme: 'light',
          autoTheme: true,
          email_notifications: true,
        });
      }
    };

    loadPreferences();
  }, []);

  // Gérer le changement d'image de profil
  const handleImagePicker = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        i18nService.t('profile.image.permissionTitle'),
        i18nService.t('profile.image.permissionMessage')
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadProfileImage(result.assets[0].uri);
    }
  };

  const uploadProfileImage = async (imageUri: string) => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      } as any);

      const response = await apiService.users.uploadProfileImage(formData);
      // Recharger les données utilisateur
      await dispatch(getMe()).unwrap();
      setSnackbarMessage(i18nService.t('profile.image.success'));
      setSnackbarVisible(true);
    } catch (error: any) {
      console.error('Erreur lors de l\'upload de l\'image:', error);
      setSnackbarMessage(error.response?.data?.message || i18nService.t('profile.image.error'));
      setSnackbarVisible(true);
    } finally {
      setUploadingImage(false);
    }
  };

  // Mettre à jour les informations de base
  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      await dispatch(updateUserProfile(formData)).unwrap();
      // Recharger toutes les données utilisateur pour préserver available_roles et role_assignments
      await dispatch(getMe()).unwrap();
      setSnackbarMessage(i18nService.t('profile.basicInfo.updateSuccess'));
      setSnackbarVisible(true);
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      setSnackbarMessage(error.response?.data?.message || i18nService.t('profile.basicInfo.updateError'));
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  // Valider et changer le mot de passe
  const validatePassword = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!passwordData.currentPassword.trim()) {
      newErrors.currentPassword = i18nService.t('profile.security.validation.currentRequired');
    }

    if (!passwordData.newPassword.trim()) {
      newErrors.newPassword = i18nService.t('profile.security.validation.newRequired');
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = i18nService.t('profile.security.validation.newMin');
    }

    if (!passwordData.confirmPassword.trim()) {
      newErrors.confirmPassword = i18nService.t('profile.security.validation.confirmRequired');
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = i18nService.t('profile.security.validation.confirmMatch');
    }

    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) {
      return;
    }

    setLoading(true);
    try {
      await authService.updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      
      // Recharger les données utilisateur après le changement de mot de passe
      await dispatch(getMe()).unwrap();
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordErrors({});
      setSnackbarMessage(i18nService.t('profile.security.updateSuccess'));
      setSnackbarVisible(true);
    } catch (error: any) {
      console.error('Erreur lors du changement de mot de passe:', error);
      setSnackbarMessage(error.response?.data?.message || i18nService.t('profile.security.updateError'));
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  // Sauvegarder les préférences
  const handleSavePreferences = async () => {
    setLoading(true);
    try {
      await preferencesApiService.updatePreferences(preferences);
      
      // Appliquer les changements localement
      if (preferences.language !== i18nService.getCurrentLanguage()) {
        await i18nService.setLanguage(preferences.language);
        // Utiliser le Context pour forcer la mise à jour de tous les composants
        await setLanguageContext(preferences.language);
      }
      
      preferencesService.setPreference('autoTheme', preferences.autoTheme);
      
      setHasChanges(false);
      setSnackbarMessage(i18nService.t('profile.preferences.saveSuccess'));
      setSnackbarVisible(true);
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde des préférences:', error);
      setSnackbarMessage(i18nService.t('profile.preferences.saveError'));
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const imageUrl = user?.image ? getImageUrl(user.image) : DEFAULT_PROFILE_IMAGE;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        {/* Header avec photo de profil */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleImagePicker}
            disabled={uploadingImage}
            style={styles.avatarContainer}
          >
            <Image
              source={{ uri: imageUrl || DEFAULT_PROFILE_IMAGE }}
              style={styles.avatar}
            />
            {uploadingImage ? (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            ) : (
              <View style={styles.cameraIcon}>
                <MaterialIcons name="camera-alt" size={20} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.userName}>{user?.username || ''}</Text>
          {user?.pseudo && (
            <Text style={styles.userPseudo}>{user.pseudo}</Text>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 0 && styles.tabActive]}
            onPress={() => setActiveTab(0)}
          >
            <Text style={[styles.tabText, activeTab === 0 && styles.tabTextActive]}>
              {i18nService.t('profile.basicInfo.title')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 1 && styles.tabActive]}
            onPress={() => setActiveTab(1)}
          >
            <Text style={[styles.tabText, activeTab === 1 && styles.tabTextActive]}>
              {i18nService.t('profile.security.title')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 2 && styles.tabActive]}
            onPress={() => setActiveTab(2)}
          >
            <Text style={[styles.tabText, activeTab === 2 && styles.tabTextActive]}>
              {i18nService.t('profile.preferences.title')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contenu des onglets */}
        <View style={styles.content}>
          {activeTab === 0 && (
            <Card style={styles.card}>
              <LinearGradient
                colors={['#FFFFFF', '#F8F7FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <Card.Content style={styles.cardContent}>
                  <Text style={styles.sectionTitle}>
                    {i18nService.t('profile.basicInfo.title')}
                  </Text>

                  <View style={styles.formRow}>
                    <Text style={styles.label}>
                      {i18nService.t('profile.basicInfo.username')}
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={formData.username}
                      onChangeText={(text) => setFormData({ ...formData, username: text })}
                      placeholder={i18nService.t('profile.basicInfo.username')}
                    />
                  </View>

                  <View style={styles.formRow}>
                    <Text style={styles.label}>
                      {i18nService.t('profile.basicInfo.pseudo')}
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={formData.pseudo}
                      onChangeText={(text) => setFormData({ ...formData, pseudo: text })}
                      placeholder={i18nService.t('profile.basicInfo.pseudo')}
                    />
                  </View>

                  <View style={styles.formRow}>
                    <Text style={styles.label}>
                      {i18nService.t('profile.basicInfo.email')}
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={formData.email}
                      onChangeText={(text) => setFormData({ ...formData, email: text })}
                      placeholder={i18nService.t('profile.basicInfo.email')}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <Button
                    mode="contained"
                    onPress={handleUpdateProfile}
                    loading={loading}
                    disabled={loading}
                    style={styles.submitButton}
                    labelStyle={styles.submitButtonLabel}
                  >
                    {i18nService.t('profile.basicInfo.updateButton')}
                  </Button>
                </Card.Content>
              </LinearGradient>
            </Card>
          )}

          {activeTab === 1 && (
            <Card style={styles.card}>
              <LinearGradient
                colors={['#FFFFFF', '#F8F7FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <Card.Content style={styles.cardContent}>
                  <Text style={styles.sectionTitle}>
                    {i18nService.t('profile.security.title')}
                  </Text>

                  <View style={styles.formRow}>
                    <Text style={styles.label}>
                      {i18nService.t('profile.security.currentPassword')}
                    </Text>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        style={styles.passwordInput}
                        value={passwordData.currentPassword}
                        onChangeText={(text) => {
                          setPasswordData({ ...passwordData, currentPassword: text });
                          if (passwordErrors.currentPassword) {
                            setPasswordErrors({ ...passwordErrors, currentPassword: '' });
                          }
                        }}
                        placeholder={i18nService.t('profile.security.currentPassword')}
                        secureTextEntry={!showPasswords.current}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                        style={styles.eyeIcon}
                      >
                        <Ionicons
                          name={showPasswords.current ? 'eye-off' : 'eye'}
                          size={20}
                          color="#666"
                        />
                      </TouchableOpacity>
                    </View>
                    {passwordErrors.currentPassword && (
                      <Text style={styles.errorText}>{passwordErrors.currentPassword}</Text>
                    )}
                  </View>

                  <View style={styles.formRow}>
                    <Text style={styles.label}>
                      {i18nService.t('profile.security.newPassword')}
                    </Text>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        style={styles.passwordInput}
                        value={passwordData.newPassword}
                        onChangeText={(text) => {
                          setPasswordData({ ...passwordData, newPassword: text });
                          if (passwordErrors.newPassword) {
                            setPasswordErrors({ ...passwordErrors, newPassword: '' });
                          }
                        }}
                        placeholder={i18nService.t('profile.security.newPassword')}
                        secureTextEntry={!showPasswords.new}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                        style={styles.eyeIcon}
                      >
                        <Ionicons
                          name={showPasswords.new ? 'eye-off' : 'eye'}
                          size={20}
                          color="#666"
                        />
                      </TouchableOpacity>
                    </View>
                    {passwordErrors.newPassword && (
                      <Text style={styles.errorText}>{passwordErrors.newPassword}</Text>
                    )}
                  </View>

                  <View style={styles.formRow}>
                    <Text style={styles.label}>
                      {i18nService.t('profile.security.confirmPassword')}
                    </Text>
                    <View style={styles.passwordContainer}>
                      <TextInput
                        style={styles.passwordInput}
                        value={passwordData.confirmPassword}
                        onChangeText={(text) => {
                          setPasswordData({ ...passwordData, confirmPassword: text });
                          if (passwordErrors.confirmPassword) {
                            setPasswordErrors({ ...passwordErrors, confirmPassword: '' });
                          }
                        }}
                        placeholder={i18nService.t('profile.security.confirmPassword')}
                        secureTextEntry={!showPasswords.confirm}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                        style={styles.eyeIcon}
                      >
                        <Ionicons
                          name={showPasswords.confirm ? 'eye-off' : 'eye'}
                          size={20}
                          color="#666"
                        />
                      </TouchableOpacity>
                    </View>
                    {passwordErrors.confirmPassword && (
                      <Text style={styles.errorText}>{passwordErrors.confirmPassword}</Text>
                    )}
                  </View>

                  <Button
                    mode="contained"
                    onPress={handleChangePassword}
                    loading={loading}
                    disabled={loading}
                    style={styles.submitButton}
                    labelStyle={styles.submitButtonLabel}
                  >
                    {i18nService.t('profile.security.updateButton')}
                  </Button>
                </Card.Content>
              </LinearGradient>
            </Card>
          )}

          {activeTab === 2 && (
            <Card style={styles.card}>
              <LinearGradient
                colors={['#FFFFFF', '#F8F7FF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <Card.Content style={styles.cardContent}>
                  <Text style={styles.sectionTitle}>
                    {i18nService.t('profile.preferences.title')}
                  </Text>

                  {/* Langue */}
                  <View style={styles.preferenceRow}>
                    <View style={styles.preferenceInfo}>
                      <MaterialIcons name="language" size={24} color="#662d91" />
                      <View style={styles.preferenceText}>
                        <Text style={styles.preferenceLabel}>
                          {i18nService.t('profile.preferences.language.title')}
                        </Text>
                        <Text style={styles.preferenceDescription}>
                          {i18nService.t('profile.preferences.language.description')}
                        </Text>
                      </View>
                    </View>
                    <Button
                      mode="outlined"
                      onPress={async () => {
                        const newLang = preferences.language === 'fr' ? 'en' : 'fr';
                        setPreferences({ ...preferences, language: newLang });
                        setHasChanges(true);
                        // Appliquer immédiatement le changement de langue
                        await i18nService.setLanguage(newLang);
                        await setLanguageContext(newLang);
                      }}
                      style={styles.languageButton}
                    >
                      {preferences.language === 'fr' ? 'Français' : 'English'}
                    </Button>
                  </View>

                  {/* Thème automatique */}
                  <View style={styles.preferenceRow}>
                    <View style={styles.preferenceInfo}>
                      <MaterialIcons name="brightness-auto" size={24} color="#662d91" />
                      <View style={styles.preferenceText}>
                        <Text style={styles.preferenceLabel}>
                          {i18nService.t('profile.preferences.autoTheme.title')}
                        </Text>
                        <Text style={styles.preferenceDescription}>
                          {i18nService.t('profile.preferences.autoTheme.description')}
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={preferences.autoTheme}
                      onValueChange={(value) => {
                        setPreferences({ ...preferences, autoTheme: value });
                        setHasChanges(true);
                      }}
                      color="#662d91"
                    />
                  </View>

                  {/* Notifications email */}
                  <View style={styles.preferenceRow}>
                    <View style={styles.preferenceInfo}>
                      <MaterialIcons name="email" size={24} color="#662d91" />
                      <View style={styles.preferenceText}>
                        <Text style={styles.preferenceLabel}>
                          {i18nService.t('profile.preferences.email.title')}
                        </Text>
                        <Text style={styles.preferenceDescription}>
                          {i18nService.t('profile.preferences.email.description')}
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={preferences.email_notifications}
                      onValueChange={(value) => {
                        setPreferences({ ...preferences, email_notifications: value });
                        setHasChanges(true);
                      }}
                      color="#662d91"
                    />
                  </View>

                  {hasChanges && (
                    <Button
                      mode="contained"
                      onPress={handleSavePreferences}
                      loading={loading}
                      disabled={loading}
                      style={styles.submitButton}
                      labelStyle={styles.submitButtonLabel}
                    >
                      {i18nService.t('profile.preferences.saveButton')}
                    </Button>
                  )}
                </Card.Content>
              </LinearGradient>
            </Card>
          )}
        </View>
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
  header: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#662d91',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#662d91',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#662d91',
    marginBottom: 4,
  },
  userPseudo: {
    fontSize: 16,
    color: '#666',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#662d91',
  },
  tabText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#662d91',
    fontWeight: '700',
  },
  content: {
    padding: 20,
  },
  card: {
    borderRadius: 24,
    elevation: 6,
    borderWidth: 2,
    borderColor: 'rgba(102, 45, 145, 0.1)',
  },
  cardGradient: {
    borderRadius: 24,
  },
  cardContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#662d91',
    marginBottom: 24,
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 14,
  },
  eyeIcon: {
    padding: 12,
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
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  preferenceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  preferenceText: {
    marginLeft: 12,
    flex: 1,
  },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 12,
    color: '#666',
  },
  languageButton: {
    borderColor: '#662d91',
  },
  snackbar: {
    backgroundColor: '#333',
  },
});
