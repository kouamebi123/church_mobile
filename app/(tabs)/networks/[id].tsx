import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  ActivityIndicator,
  Button,
  Divider,
  IconButton,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { useSelectedChurch } from '../../../hooks/useSelectedChurch';
import { usePermissions } from '../../../hooks/usePermissions';
import { useLanguage } from '../../../contexts/LanguageContext';
import { apiService } from '../../../services/apiService';
import i18nService from '../../../services/i18nService';
import { getImageUrl, DEFAULT_PROFILE_IMAGE } from '../../../config/apiConfig';
import { extractApiData, extractApiArray, extractApiObject } from '../../../utils/apiResponse';
import { getApiErrorMessage, showApiError } from '../../../utils/errorHandler';
import { getId, getNetworkChurchId, getUserChurchId } from '../../../utils/idHelper';
import PrevisionnelModal from '../../../components/networks/PrevisionnelModal';
import AssistanceModal from '../../../components/networks/AssistanceModal';
import AddGroupModal from '../../../components/networks/AddGroupModal';
import EditGroupModal from '../../../components/networks/EditGroupModal';
import AddMemberModal from '../../../components/networks/AddMemberModal';
import EditMemberModal from '../../../components/networks/EditMemberModal';
import AddCompanionModal from '../../../components/networks/AddCompanionModal';
import HistoriqueCulteModal from '../../../components/networks/HistoriqueCulteModal';
import NetworkObjectiveFloating from '../../../components/networks/NetworkObjectiveFloating';
import previsionnelService from '../../../services/previsionnelService';
import assistanceService from '../../../services/assistanceService';

const STATUS_OPTIONS = ['Past.', 'MC.', 'PE.', 'CE.', 'Resp.', 'Diacre'];

const formatResponsableName = (username: string) => {
  if (!username) return '';
  const words = username.split(' ');
  const firstWord = words[0];
  const isStatusPrefix = STATUS_OPTIONS.includes(firstWord);
  
  if (isStatusPrefix) {
    return words.length >= 2 ? `${firstWord} ${words[1]}` : firstWord;
  } else {
    return firstWord;
  }
};

export default function NetworkDetailsScreen() {
  const { language } = useLanguage();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { selectedChurch } = useSelectedChurch();
  const permissions = usePermissions();

  const [networkData, setNetworkData] = useState<any>({
    reseau: {},
    stats: {},
    grs: [],
    members: [],
    companions: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // États pour les modals
  const [previsionnelModal, setPrevisionnelModal] = useState(false);
  const [assistanceModal, setAssistanceModal] = useState(false);
  const [historiqueModal, setHistoriqueModal] = useState(false);
  const [addGroupModal, setAddGroupModal] = useState(false);
  const [editGroupModal, setEditGroupModal] = useState(false);
  const [addMemberModal, setAddMemberModal] = useState(false);
  const [editMemberModal, setEditMemberModal] = useState(false);
  const [addCompanionModal, setAddCompanionModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedCompanionUserId, setSelectedCompanionUserId] = useState('');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [editingPrevisionnel, setEditingPrevisionnel] = useState<any>(null);
  const [editingAssistance, setEditingAssistance] = useState<any>(null);

  const fetchData = useCallback(async () => {
    if (!id) {
      setError('ID de réseau manquant');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [networkRes, statsRes, grsRes, companionsRes, membersRes, usersRes, departmentsRes] = await Promise.all([
        apiService.networks.getById(id),
        apiService.networks.getStatsById(id),
        apiService.networks.getGroups(id),
        apiService.networks.getCompanions(id),
        apiService.networks.getMembers(id),
        apiService.users.getAvailable().catch(() => ({ data: [] })),
        apiService.departments.getAll().catch(() => ({ data: [] })),
      ]);

      const reseau = extractApiObject(networkRes, {});
      const stats = extractApiObject(statsRes, {});
      const grs = extractApiArray(grsRes);
      const companions = extractApiArray(companionsRes);
      const members = extractApiArray(membersRes);
      const users = extractApiArray(usersRes);
      const departmentsData = extractApiArray(departmentsRes);

      setAvailableUsers(users);
      setDepartments(departmentsData);

      setNetworkData({
        reseau,
        stats,
        grs,
        companions,
        members,
      });

      setLoading(false);
    } catch (err: any) {
      const errorMessage = getApiErrorMessage(err, 'networks.details.errors.loadData');
      setError(errorMessage);
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  }, [fetchData]);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#662d91" />
        <Text style={styles.loadingText}>{i18nService.t('networks.details.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error-outline" size={48} color="#d32f2f" />
        <Text style={styles.errorText}>{error}</Text>
        <Button
          mode="contained"
          onPress={fetchData}
          style={styles.retryButton}
        >
          {i18nService.t('common.actions.refresh')}
        </Button>
      </View>
    );
  }

  const { reseau, stats, grs, companions, members } = networkData;

  const toggleGroup = (grId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(grId)) {
        newSet.delete(grId);
      } else {
        newSet.add(grId);
      }
      return newSet;
    });
  };

  // Handlers pour les modals et actions
  const handleSavePrevisionnel = async (data: any) => {
    try {
      if (data.id) {
        await previsionnelService.update(data.id, data);
        Alert.alert(i18nService.t('success.success'), i18nService.t('success.previsionnelUpdated'));
      } else {
        await previsionnelService.create(data);
        Alert.alert(i18nService.t('success.success'), i18nService.t('success.previsionnelCreated'));
      }
      await fetchData();
      setPrevisionnelModal(false);
    } catch (error: any) {
      throw error;
    }
  };

  const handleSaveAssistance = async (data: any) => {
    try {
      if (data.id) {
        await assistanceService.update(data.id, data);
        Alert.alert(i18nService.t('success.success'), i18nService.t('success.assistanceUpdated'));
      } else {
        await assistanceService.create(data);
        Alert.alert(i18nService.t('success.success'), i18nService.t('success.assistanceCreated'));
      }
      await fetchData();
      setAssistanceModal(false);
      setEditingAssistance(null);
    } catch (error: any) {
      throw error;
    }
  };

  const handleOpenPrevisionnelModal = (item: any = null) => {
    setEditingPrevisionnel(item);
    setPrevisionnelModal(true);
  };

  const handleOpenAssistanceModal = (item: any = null) => {
    setEditingAssistance(item);
    setAssistanceModal(true);
  };

  const handlePrevisionnelModalClose = () => {
    setPrevisionnelModal(false);
    setEditingPrevisionnel(null);
  };

  const handleAssistanceModalClose = () => {
    setAssistanceModal(false);
    setEditingAssistance(null);
  };

  const handleAddGroup = async (data: any) => {
    try {
      await apiService.groups.create({
        network_id: id,
        responsable1_id: data.responsable1,
        church_id: getNetworkChurchId(networkData.reseau),
      });
      Alert.alert(i18nService.t('success.success'), i18nService.t('success.groupCreated'));
      await fetchData();
      setAddGroupModal(false);
    } catch (error: any) {
      showApiError(error, 'networks.details.errors.addGroup');
    }
  };

  const handleEditGroup = async (data: any) => {
    try {
      await apiService.groups.update(data.id, {
        responsable1_id: data.responsable1_id,
      });
      Alert.alert(i18nService.t('success.success'), i18nService.t('success.groupUpdated'));
      await fetchData();
      setEditGroupModal(false);
      setSelectedGroup(null);
    } catch (error: any) {
      showApiError(error, 'networks.details.errors.updateGroup');
    }
  };

  const handleDeleteGroup = (groupId: string) => {
    Alert.alert(
      i18nService.t('networks.details.confirm.deleteGroup'),
      i18nService.t('networks.details.confirm.deleteGroupMessage'),
      [
        { text: i18nService.t('common.actions.cancel'), style: 'cancel' },
        {
          text: i18nService.t('common.actions.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.groups.delete(groupId);
              Alert.alert(i18nService.t('success.success'), i18nService.t('success.groupDeleted'));
              await fetchData();
            } catch (error: any) {
              showApiError(error, 'networks.details.errors.deleteGroup');
            }
          },
        },
      ]
    );
  };

  const handleAddMember = async (data: any) => {
    if (!selectedGroup) return;
    try {
      const groupId = getId(selectedGroup);
      if (!groupId) {
        Alert.alert(i18nService.t('errors.error'), i18nService.t('networks.details.errors.invalidGroupId'));
        return;
      }

      // Si data.user_id existe, c'est le mode sélection (membre existant)
      if (data.user_id) {
        await apiService.groups.addMember(groupId, {
          user_id: data.user_id,
        });
        Alert.alert(i18nService.t('success.success'), i18nService.t('success.memberAdded'));
      } else {
        // Mode création : créer un nouvel utilisateur puis l'ajouter au groupe
        let imageUrl = data.image || '';
        
        const newMemberData = {
          ...data,
          password: data.password || 'DefaultPassword123!',
          role: 'MEMBRE',
          image: imageUrl,
        };

        // Pour les non-super-admin, définir l'église locale par défaut
        if ((user?.current_role || user?.role) !== 'SUPER_ADMIN') {
          let defaultChurchId = '';
          
          if (selectedChurch) {
            defaultChurchId = getId(selectedChurch) || '';
          } else if (user?.eglise_locale) {
            defaultChurchId = getUserChurchId(user) || '';
          }
          
          if (defaultChurchId) {
            newMemberData.eglise_locale_id = defaultChurchId;
          }
        }

        if (data.departement_ids && data.departement_ids.length > 0) {
          newMemberData.departement_ids = data.departement_ids;
        }

        // Supprimer les champs qui ne doivent pas être envoyés
        delete newMemberData.eglise_locale;
        delete newMemberData.departement;
        // Garder departement_ids car le backend les gère lors de la création

        // Champs non-nullables dans le schéma Prisma qui doivent rester des chaînes vides, pas null
        const nonNullableStringFields = ['profession', 'ville_residence', 'origine', 'situation_matrimoniale', 'niveau_education'];
        nonNullableStringFields.forEach(field => {
          if (newMemberData[field] === null || newMemberData[field] === undefined || newMemberData[field] === '') {
            newMemberData[field] = ''; // Valeur par défaut pour les champs non-nullables
          }
        });

        // Pour situation_professionnelle qui est nullable, on peut mettre null si vide
        if (newMemberData.situation_professionnelle === '') {
          newMemberData.situation_professionnelle = null;
        }

        // Remplacer les autres chaînes vides par null (sauf les champs non-nullables déjà gérés)
        Object.keys(newMemberData).forEach(key => {
          if (newMemberData[key] === '' && !nonNullableStringFields.includes(key) && key !== 'situation_professionnelle') {
            // Pour les champs optionnels, on peut mettre null
            if (['email', 'telephone', 'adresse'].includes(key)) {
              newMemberData[key] = null;
            } else {
              // Pour les autres champs, garder la chaîne vide ou supprimer si non nécessaire
              delete newMemberData[key];
            }
          }
        });

        // S'assurer que eglise_locale_id est présent
        if (!newMemberData.eglise_locale_id) {
          throw new Error(i18nService.t('networks.details.errors.missingChurch') || 'Église locale requise');
        }

        // Le backend supprime departement_ids de userCreateData mais le garde dans userData
        // pour créer les associations après. On garde donc departement_ids dans newMemberData

        // Créer l'utilisateur
        const userRes = await apiService.users.create(newMemberData);
        const newUserId: string = getId(extractApiData(userRes, {})) || '';

        if (!newUserId) {
          throw new Error(i18nService.t('networks.details.errors.cannotRetrieveUserId'));
        }

        // Upload de l'image si une image est sélectionnée
        if (data.image && (data.image.startsWith('file://') || data.image.startsWith('data:'))) {
          try {
            const formData = new FormData();
            if (data.image.startsWith('file://') || data.image.startsWith('file:')) {
              formData.append('image', {
                uri: data.image,
                type: 'image/jpeg',
                name: 'profile.jpg',
              } as any);
            } else if (data.image.startsWith('data:')) {
              // Convertir data URL en blob pour React Native
              const response = await fetch(data.image);
              const blob = await response.blob();
              formData.append('image', blob as any, 'profile.jpg');
            }

            const uploadResponse = await apiService.users.uploadUserImage(newUserId, formData);
            const uploadedImageUrl = extractApiData(uploadResponse, {})?.image;
            if (uploadedImageUrl) {
              await apiService.users.update(newUserId, { image: uploadedImageUrl });
            }
          } catch (error: any) {
            console.warn('Erreur lors de l\'upload de l\'image:', error);
          }
        }

        // Mettre à jour les départements si nécessaire (le backend les gère automatiquement via departement_ids)
        // Mais comme on les a supprimés, on doit les ajouter après si nécessaire
        // Note: Le backend crée automatiquement les user_departments si departement_ids est fourni lors de la création
        // Si on veut les ajouter après, il faudrait une route spécifique, mais pour l'instant le backend
        // les gère lors de la création via departement_ids dans userData

        // Ajouter le nouvel utilisateur au groupe
        await apiService.groups.addMember(groupId, {
          user_id: newUserId,
        });

        Alert.alert(i18nService.t('success.success'), i18nService.t('success.memberCreatedAndAdded'));
      }

      await fetchData();
      setAddMemberModal(false);
      setSelectedGroup(null);
    } catch (error: any) {
      showApiError(error, 'networks.details.errors.addMember');
    }
  };

  const handleEditMember = (member: any) => {
    setSelectedMember(member);
    setEditMemberModal(true);
  };

  const handleUpdateMember = async (data: any) => {
    if (!selectedMember || !selectedGroup) return;
    try {
      const userId = getId(selectedMember);
      if (!userId) {
          showApiError(new Error(i18nService.t('networks.details.userIdNotFound') || 'ID utilisateur non trouvé'), 'networks.details.userIdNotFound');
        return;
      }

      // Upload de l'image si une nouvelle image est sélectionnée
      let imageUrl = data.image || '';
      if (imageUrl && (imageUrl.startsWith('file://') || imageUrl.startsWith('data:') || imageUrl.startsWith('file:'))) {
        try {
          const formData = new FormData();
          if (imageUrl.startsWith('file://') || imageUrl.startsWith('file:')) {
            formData.append('image', {
              uri: imageUrl,
              type: 'image/jpeg',
              name: 'profile.jpg',
            } as any);
          } else if (imageUrl.startsWith('data:')) {
            // Convertir data URL en blob pour React Native
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            formData.append('image', blob as any, 'profile.jpg');
          }

          const uploadResponse = await apiService.users.uploadUserImage(userId, formData);
          imageUrl = extractApiData(uploadResponse, {})?.image || imageUrl;
          
          if (!imageUrl || imageUrl.startsWith('data:') || imageUrl.startsWith('file:')) {
            throw new Error(i18nService.t('errors.imageUploadFailed') || 'URL de l\'image non reçue');
          }
        } catch (error: any) {
          console.error('Erreur lors de l\'upload de l\'image:', error);
          showApiError(error, 'errors.imageUploadFailed');
          return;
        }
      }

      // Liste des champs autorisés pour la mise à jour (exclure les champs système)
      const allowedFields = [
        'username', 'pseudo', 'email', 'telephone', 'adresse',
        'genre', 'tranche_age', 'profession', 'situation_professionnelle',
        'ville_residence', 'origine', 'situation_matrimoniale',
        'niveau_education', 'qualification', 'role', 'departement_ids', 'image'
      ];

      // Champs système à exclure explicitement
      const systemFields = ['createdAt', 'updatedAt', 'password', 'eglise_locale_id', 'current_role'];

      // Filtrer les données pour retirer les champs vides et les clés d'ID
      const filteredData = Object.keys(data).reduce((obj: any, key: string) => {
        // Ignorer les clés d'ID
        if (key === 'user_id' || key === '_id' || key === 'id') {
          return obj;
        }

        // Ignorer les champs système
        if (systemFields.includes(key)) {
          return obj;
        }

        // Ignorer les champs non autorisés
        if (!allowedFields.includes(key)) {
          return obj;
        }

        // Gérer situation_professionnelle (peut être null)
        if (key === 'situation_professionnelle') {
          obj[key] = data[key] !== undefined && data[key] !== '' ? data[key] : null;
          return obj;
        }

        // Gérer departement_ids (doit être un tableau)
        if (key === 'departement_ids') {
          if (Array.isArray(data[key])) {
            obj[key] = data[key];
          }
          return obj;
        }

        // Ignorer l'image ici, elle sera ajoutée après si nécessaire
        if (key === 'image') {
          return obj;
        }

        // Inclure seulement les champs non vides (sauf pour situation_professionnelle déjà géré)
        if (data[key] !== '' && data[key] !== undefined && data[key] !== null) {
          obj[key] = data[key];
        }

        return obj;
      }, {});

      // Ajouter l'URL de l'image si elle a été uploadée ou si c'est une URL valide
      if (imageUrl && !imageUrl.startsWith('data:') && !imageUrl.startsWith('file:') && !imageUrl.startsWith('file://')) {
        filteredData.image = imageUrl;
      }

      await apiService.users.update(userId, filteredData);
      Alert.alert(i18nService.t('success.success'), i18nService.t('success.memberUpdated'));
      await fetchData();
      setEditMemberModal(false);
      setSelectedMember(null);
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du membre:', error);
      showApiError(error, 'networks.details.errors.updateMember');
    }
  };

  const handleRemoveMember = (groupId: string, memberId: string) => {
    Alert.alert(
      i18nService.t('networks.details.confirm.removeMember'),
      i18nService.t('networks.details.confirm.removeMemberMessage'),
      [
        { text: i18nService.t('common.actions.cancel'), style: 'cancel' },
        {
          text: i18nService.t('common.actions.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.groups.removeMember(groupId, memberId);
              Alert.alert(i18nService.t('success.success'), i18nService.t('success.memberRemoved'));
              await fetchData();
            } catch (error: any) {
              showApiError(error, 'networks.details.errors.removeMember');
            }
          },
        },
      ]
    );
  };

  const handleAddCompanion = async () => {
    if (!selectedCompanionUserId) {
      showApiError(new Error(i18nService.t('networks.details.errors.selectCompanion')), 'networks.details.errors.selectCompanion');
      return;
    }
    try {
      await apiService.networks.addCompanion(id!, selectedCompanionUserId);
      Alert.alert(i18nService.t('success.success'), i18nService.t('success.companionAdded'));
      await fetchData();
      setAddCompanionModal(false);
      setSelectedCompanionUserId('');
    } catch (error: any) {
      showApiError(error, 'networks.details.errors.addCompanion');
    }
  };

  const handleRemoveCompanion = (companionId: string) => {
    Alert.alert(
      i18nService.t('networks.details.confirm.removeCompanion'),
      i18nService.t('networks.details.confirm.removeCompanionMessage'),
      [
        { text: i18nService.t('common.actions.cancel'), style: 'cancel' },
        {
          text: i18nService.t('common.actions.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.networks.removeCompanion(id!, companionId);
              Alert.alert(i18nService.t('success.success'), i18nService.t('success.companionRemoved'));
              await fetchData();
            } catch (error: any) {
              showApiError(error, 'networks.details.errors.removeCompanion');
            }
          },
        },
      ]
    );
  };

  // Calculer l'effectif total
  const calculateEffectifTotal = () => {
    const membresSet = new Set();
    
    // Ajouter les membres des GR
    grs?.forEach((gr: any) => {
      gr.members?.forEach((m: any) => {
        const memberId = m?.id || m?._id || m?.user?.id || m?.user?._id;
        if (memberId) {
          membresSet.add(memberId);
        }
      });
    });
    
    // Ajouter les compagnons d'œuvre
    companions?.forEach((companion: any) => {
      const companionId = companion.user?.id || companion.user?._id || companion.user_id;
      if (companionId) {
        membresSet.add(companionId);
      }
    });
    
    // Préparer la liste des responsables de GR
    const grResponsableIds = new Set();
    grs?.forEach((gr: any) => {
      const grResp1 = gr?.responsable1?.id || gr?.responsable1?._id;
      const grResp2 = gr?.responsable2?.id || gr?.responsable2?._id;
      if (grResp1) grResponsableIds.add(grResp1);
      if (grResp2) grResponsableIds.add(grResp2);
    });

    // Ajouter les responsables de réseau s'ils ne sont pas déjà responsables de GR
    const resp1Id = reseau?.responsable1?.id || reseau?.responsable1?._id;
    const resp2Id = reseau?.responsable2?.id || reseau?.responsable2?._id;
    
    if (resp1Id && !grResponsableIds.has(resp1Id)) {
      membresSet.add(resp1Id);
    }
    
    if (resp2Id && !grResponsableIds.has(resp2Id)) {
      membresSet.add(resp2Id);
    }
    
    return membresSet.size;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color="#662d91" />
          </TouchableOpacity>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>
              {reseau?.nom || 'Commandos'}
            </Text>
            <TouchableOpacity
              onPress={onRefresh}
              style={styles.refreshButton}
            >
              <MaterialIcons name="refresh" size={24} color="#662d91" />
            </TouchableOpacity>
          </View>
          <View style={styles.headerDivider} />
        </View>

        {/* Responsables */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="people" size={24} color="#662d91" />
            <Text style={styles.sectionTitle}>
              {i18nService.t('networks.details.responsables') || 'Responsables'}
            </Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.responsablesContainer}>
            {reseau?.responsable1 && (
              <View style={styles.responsableItem}>
                <MaterialIcons name="person" size={20} color="#662d91" />
                <Text style={styles.responsableLabel}>
                  {i18nService.t('networks.details.responsable1') || 'Responsable 1'}:
                </Text>
                <Text style={styles.responsableName}>
                  {formatResponsableName(reseau.responsable1.username || reseau.responsable1.pseudo || '')}
                </Text>
              </View>
            )}
            {reseau?.responsable2 && (
              <View style={styles.responsableItem}>
                <MaterialIcons name="person" size={20} color="#662d91" />
                <Text style={styles.responsableLabel}>
                  {i18nService.t('networks.details.responsable2') || 'Responsable 2'}:
                </Text>
                <Text style={styles.responsableName}>
                  {formatResponsableName(reseau.responsable2.username || reseau.responsable2.pseudo || '')}
                </Text>
              </View>
            )}
            {(permissions.isCollecteurReseaux || permissions.isAdmin || permissions.isSuperAdmin) && (
              <View style={styles.actionButtonsRow}>
                <Button
                  mode="contained"
                  onPress={() => handleOpenPrevisionnelModal()}
                  style={styles.actionButton}
                  buttonColor="#662d91"
                  icon="calendar-plus"
                >
                  Prévisionnel
                </Button>
                <Button
                  mode="contained"
                  onPress={() => handleOpenAssistanceModal()}
                  style={styles.actionButton}
                  buttonColor="#10b981"
                  icon="check-circle"
                >
                  Assistance
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => setHistoriqueModal(true)}
                  style={styles.actionButton}
                  textColor="#662d91"
                  icon="history"
                >
                  Historique
                </Button>
              </View>
            )}
          </View>
        </Card>

        {/* Statistiques */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="assessment" size={24} color="#662d91" />
            <Text style={styles.sectionTitle}>
              {i18nService.t('networks.details.statistics') || 'Statistiques'}
            </Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.statsGrid}>
            {stats['12'] !== undefined && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats['12'] || 0}</Text>
                <Text style={styles.statLabel}>12</Text>
              </View>
            )}
            {stats['144'] !== undefined && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats['144'] || 0}</Text>
                <Text style={styles.statLabel}>144</Text>
              </View>
            )}
            {stats['1728'] !== undefined && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats['1728'] || 0}</Text>
                <Text style={styles.statLabel}>1728</Text>
              </View>
            )}
            {stats.totalGroups !== undefined && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totalGroups || 0}</Text>
                <Text style={styles.statLabel}>
                  {i18nService.t('networks.details.stats.totalGroups') || 'Total GR'}
                </Text>
              </View>
            )}
            {stats['Responsables de GR'] !== undefined && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats['Responsables de GR'] || 0}</Text>
                <Text style={styles.statLabel}>
                  {i18nService.t('networks.details.stats.groupResponsibles') || 'Resp. GR'}
                </Text>
              </View>
            )}
            {stats['Compagnon d\'œuvre'] !== undefined && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats['Compagnon d\'œuvre'] || 0}</Text>
                <Text style={styles.statLabel}>
                  {i18nService.t('networks.list.companions') || 'Compagnons'}
                </Text>
              </View>
            )}
            {stats['Leader'] !== undefined && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats['Leader'] || 0}</Text>
                <Text style={styles.statLabel}>
                  {i18nService.t('networks.details.stats.leaders') || 'Leaders'}
                </Text>
              </View>
            )}
            {stats['Membre simple'] !== undefined && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats['Membre simple'] || 0}</Text>
                <Text style={styles.statLabel}>
                  {i18nService.t('networks.details.stats.simpleMembers') || 'Membres'}
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Effectif Total */}
        <Card style={styles.totalCard}>
          <LinearGradient
            colors={['#F5F3FF', '#FFFFFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.totalGradient}
          >
            <Text style={styles.totalLabel}>
              {i18nService.t('networks.details.effectifTotal') || 'Effectif Total'}
            </Text>
            <Text style={styles.totalValue}>{calculateEffectifTotal()}</Text>
          </LinearGradient>
        </Card>

        {/* Groupes (GR) */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="group" size={24} color="#662d91" />
            <Text style={styles.sectionTitle}>
              {i18nService.t('networks.details.groups') || 'Groupes (GR)'}
            </Text>
            <Text style={styles.sectionCount}>({grs?.length || 0})</Text>
            {(permissions.isCollecteurReseaux || permissions.isAdmin || permissions.isSuperAdmin) && (
              <IconButton
                icon="plus-circle"
                iconColor="#662d91"
                size={28}
                onPress={() => setAddGroupModal(true)}
              />
            )}
          </View>
          <Divider style={styles.divider} />
          {grs && grs.length > 0 ? (
            <View style={styles.groupsContainer}>
              {grs.map((gr: any, index: number) => {
                const grId = (gr.id || gr._id || `gr-${index}`).toString();
                const membersCount = gr.members?.length || 0;
                const isExpanded = expandedGroups.has(grId);
                
                // Trouver les membres complets pour ce GR
                const grMembers = gr.members || [];
                const fullMembers = grMembers.map((member: any) => {
                  const memberId = member.user?.id || member.user?._id || member.id || member._id;
                  const fullMember = members.find((m: any) => 
                    (m.user?.id || m.user?._id || m.id || m._id) === memberId
                  );
                  return fullMember?.user || member.user || member;
                });

                return (
                  <View key={grId} style={styles.groupItem}>
                    <TouchableOpacity
                      onPress={() => toggleGroup(grId)}
                      style={styles.groupHeaderTouchable}
                    >
                      <View style={styles.groupHeader}>
                        <View style={styles.groupHeaderLeft}>
                          <MaterialIcons 
                            name={isExpanded ? "expand-less" : "expand-more"} 
                            size={24} 
                            color="#662d91" 
                          />
                          <Text style={styles.groupName}>{gr.nom || `GR ${index + 1}`}</Text>
                        </View>
                        <View style={styles.groupHeaderRight}>
                          <View style={styles.groupBadge}>
                            <Text style={styles.groupBadgeText}>{membersCount}</Text>
                          </View>
                          {(permissions.isCollecteurReseaux || permissions.isAdmin || permissions.isSuperAdmin) && (
                            <View style={styles.groupActions}>
                              <IconButton
                                icon="pencil"
                                iconColor="#662d91"
                                size={20}
                                onPress={() => {
                                  setSelectedGroup(gr);
                                  setEditGroupModal(true);
                                }}
                              />
                              <IconButton
                                icon="delete"
                                iconColor="#ef4444"
                                size={20}
                                onPress={() => handleDeleteGroup(gr.id || gr._id)}
                              />
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                    <View style={styles.groupDetails}>
                      {gr.responsable1 && (
                        <View style={styles.groupResponsable}>
                          <MaterialIcons name="person" size={16} color="#666" />
                          <Text style={styles.groupResponsableText}>
                            {formatResponsableName(gr.responsable1.username || gr.responsable1.pseudo || '')}
                          </Text>
                        </View>
                      )}
                      {gr.responsable2 && (
                        <View style={styles.groupResponsable}>
                          <MaterialIcons name="person" size={16} color="#666" />
                          <Text style={styles.groupResponsableText}>
                            {formatResponsableName(gr.responsable2.username || gr.responsable2.pseudo || '')}
                          </Text>
                        </View>
                      )}
                    </View>
                    {isExpanded && fullMembers.length > 0 && (
                      <View style={styles.membersList}>
                        <Divider style={styles.membersDivider} />
                        <Text style={styles.membersListTitle}>
                          {i18nService.t('networks.details.nombreMembres') || 'Membres'} ({fullMembers.length})
                        </Text>
                        {fullMembers.map((member: any, memberIndex: number) => {
                          const memberId = member.id || member._id || member.user?.id || member.user?._id || `member-${memberIndex}`;
                          const qualification = member.qualification || member.user?.qualification || '';
                          return (
                            <View key={memberId} style={styles.memberItem}>
                              <MaterialIcons name="person" size={18} color="#662d91" />
                              <View style={styles.memberInfo}>
                                <Text style={styles.memberName}>
                                  {member.username || member.user?.username || member.pseudo || member.user?.pseudo || i18nService.t('common_text.unknownName')}
                                </Text>
                                {qualification && (
                                  <Text style={styles.memberQualification}>
                                    {qualification}
                                  </Text>
                                )}
                              </View>
                              {(permissions.isCollecteurReseaux || permissions.isAdmin || permissions.isSuperAdmin) && (
                                <View style={styles.memberActions}>
                                  <IconButton
                                    icon="pencil"
                                    iconColor="#662d91"
                                    size={18}
                                    onPress={() => {
                                      setSelectedGroup(gr);
                                      handleEditMember(member);
                                    }}
                                  />
                                  <IconButton
                                    icon="delete"
                                    iconColor="#ef4444"
                                    size={18}
                                    onPress={() => handleRemoveMember(gr.id || gr._id, memberId)}
                                  />
                                </View>
                              )}
                            </View>
                          );
                        })}
                        {(permissions.isCollecteurReseaux || permissions.isAdmin || permissions.isSuperAdmin) && (
                          <Button
                            mode="outlined"
                            onPress={() => {
                              setSelectedGroup(gr);
                              setAddMemberModal(true);
                            }}
                            style={styles.addMemberButton}
                            icon="plus"
                          >
                            {i18nService.t('networks.details.addMember') || 'Ajouter un membre'}
                          </Button>
                        )}
                      </View>
                    )}
                    {isExpanded && fullMembers.length === 0 && (
                      <View style={styles.membersList}>
                        <Divider style={styles.membersDivider} />
                        <Text style={styles.emptyMembersText}>
                          {i18nService.t('networks.details.noMembers') || 'Aucun membre'}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="group-off" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                {i18nService.t('networks.details.noGroups') || 'Aucun groupe'}
              </Text>
            </View>
          )}
        </Card>

        {/* Compagnons d'œuvre */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="handshake" size={24} color="#662d91" />
            <Text style={styles.sectionTitle}>
              {i18nService.t('networks.details.companions') || 'Compagnons d\'œuvre'}
            </Text>
            <Text style={styles.sectionCount}>({companions?.length || 0})</Text>
            {(permissions.isCollecteurReseaux || permissions.isAdmin || permissions.isSuperAdmin) && (
              <IconButton
                icon="plus-circle"
                iconColor="#662d91"
                size={28}
                onPress={() => setAddCompanionModal(true)}
              />
            )}
          </View>
          <Divider style={styles.divider} />
          {companions && companions.length > 0 ? (
            <View style={styles.companionsContainer}>
              {companions.map((companion: any, index: number) => {
                const companionId = companion.id || companion._id || index;
                const user = companion.user || companion;
                return (
                  <View key={companionId} style={styles.companionItem}>
                    <MaterialIcons name="person" size={20} color="#662d91" />
                    <Text style={styles.companionName}>
                      {formatResponsableName(user.username || user.pseudo || '')}
                    </Text>
                    {(permissions.isCollecteurReseaux || permissions.isAdmin || permissions.isSuperAdmin) && (
                      <IconButton
                        icon="delete"
                        iconColor="#ef4444"
                        size={20}
                        onPress={() => handleRemoveCompanion(companionId)}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="handshake" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                {i18nService.t('networks.details.noCompanions') || 'Aucun compagnon'}
              </Text>
            </View>
          )}
        </Card>
      </ScrollView>

      {/* Modals */}
      <PrevisionnelModal
        visible={previsionnelModal}
        onClose={handlePrevisionnelModalClose}
        onSave={handleSavePrevisionnel}
        networkData={networkData}
        initialData={editingPrevisionnel}
      />

      <AssistanceModal
        visible={assistanceModal}
        onClose={handleAssistanceModalClose}
        onSave={handleSaveAssistance}
        networkData={networkData}
        initialData={editingAssistance}
      />

      <HistoriqueCulteModal
        visible={historiqueModal}
        onClose={() => setHistoriqueModal(false)}
        networkData={networkData}
        onEditPrevisionnel={handleOpenPrevisionnelModal}
        onEditAssistance={handleOpenAssistanceModal}
      />

      <AddGroupModal
        visible={addGroupModal}
        onClose={() => setAddGroupModal(false)}
        onSubmit={handleAddGroup}
        availableUsers={availableUsers}
        networkCompanions={companions || []}
        canCreateGroups={permissions.isCollecteurReseaux || permissions.isAdmin || permissions.isSuperAdmin}
      />

      <EditGroupModal
        visible={editGroupModal}
        onClose={() => {
          setEditGroupModal(false);
          setSelectedGroup(null);
        }}
        onSubmit={handleEditGroup}
        group={selectedGroup}
        availableUsers={availableUsers}
        networkCompanions={companions || []}
        canUpdateGroups={permissions.isCollecteurReseaux || permissions.isAdmin || permissions.isSuperAdmin}
      />

      <AddMemberModal
        visible={addMemberModal}
        onClose={() => {
          setAddMemberModal(false);
          setSelectedGroup(null);
        }}
        onAdd={handleAddMember}
        availableUsers={availableUsers}
        networkCompanions={companions || []}
        canUpdateGroups={permissions.isCollecteurReseaux || permissions.isAdmin || permissions.isSuperAdmin}
        departments={departments}
      />

      <EditMemberModal
        visible={editMemberModal}
        onClose={() => {
          setEditMemberModal(false);
          setSelectedMember(null);
        }}
        onUpdate={handleUpdateMember}
        member={selectedMember}
        canUpdateUsers={permissions.isCollecteurReseaux || permissions.isAdmin || permissions.isSuperAdmin}
        departments={departments}
      />

      <AddCompanionModal
        visible={addCompanionModal}
        onClose={() => {
          setAddCompanionModal(false);
          setSelectedCompanionUserId('');
        }}
        onAdd={handleAddCompanion}
        selectedUserId={selectedCompanionUserId}
        onUserIdChange={setSelectedCompanionUserId}
        availableUsers={availableUsers}
        networkGroups={grs || []}
        networkCompanions={companions || []}
        canCreateGroups={permissions.isCollecteurReseaux || permissions.isAdmin || permissions.isSuperAdmin}
        getHelpMessage={() => ''}
      />

      {/* Floating Action Button for Objectives */}
      {id && (permissions.isCollecteurReseaux || permissions.isAdmin || permissions.isSuperAdmin) && (
        <NetworkObjectiveFloating
          networkId={id}
          currentMembersCount={calculateEffectifTotal()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
    backgroundColor: '#f0f2f5',
  },
  backButton: {
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: '#662d91',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 12,
  },
  headerDivider: {
    width: 100,
    height: 4,
    backgroundColor: '#662d91',
    borderRadius: 2,
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  refreshButton: {
    padding: 8,
  },
  sectionCard: {
    margin: 20,
    marginTop: 0,
    borderRadius: 16,
    backgroundColor: '#fff',
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  sectionCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  divider: {
    marginHorizontal: 16,
  },
  responsablesContainer: {
    padding: 16,
    gap: 12,
  },
  responsableItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  responsableLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  responsableName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statItem: {
    width: '47%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#662d91',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  totalCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    overflow: 'hidden',
  },
  totalGradient: {
    padding: 24,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#662d91',
    marginTop: 8,
  },
  groupsContainer: {
    padding: 16,
    gap: 12,
  },
  groupItem: {
    padding: 16,
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(102, 45, 145, 0.1)',
  },
  groupHeaderTouchable: {
    width: '100%',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  groupHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  groupBadge: {
    backgroundColor: '#662d91',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  groupBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  groupDetails: {
    gap: 6,
  },
  groupResponsable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupResponsableText: {
    fontSize: 14,
    color: '#666',
  },
  companionsContainer: {
    padding: 16,
    gap: 12,
  },
  companionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#F5F3FF',
    borderRadius: 8,
  },
  companionName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
  membersList: {
    marginTop: 12,
    paddingTop: 12,
  },
  membersDivider: {
    marginBottom: 12,
  },
  membersListTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#662d91',
    marginBottom: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(102, 45, 145, 0.1)',
  },
  memberInfo: {
    flex: 1,
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addMemberButton: {
    marginTop: 12,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  memberQualification: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  emptyMembersText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    padding: 16,
  },
});

