import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import {
  Text,
  Card,
  ActivityIndicator,
  Button,
  TextInput,
  Dialog,
  Portal,
  Chip,
  Checkbox,
  IconButton,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useSelectedChurch } from '../../hooks/useSelectedChurch';
import { useLanguageUpdate } from '../../hooks/useLanguageUpdate';
import { apiService } from '../../services/apiService';
import { API_URL } from '../../config/apiConfig';
import BottomSheet from '../../components/BottomSheet';
import i18nService from '../../services/i18nService';
import dayjs from 'dayjs';

// Catégories de témoignages (exactement comme dans testimonyUtils.js)
const TESTIMONY_CATEGORIES = [
  { value: 'INTIMACY', label: 'Intimité avec Dieu' },
  { value: 'LEADERSHIP', label: 'Leadership' },
  { value: 'HEALING', label: 'Guérison/Santé' },
  { value: 'PROFESSIONAL', label: 'Professionnel' },
  { value: 'BUSINESS', label: 'Entreprises/Affaires' },
  { value: 'FINANCES', label: 'Finances' },
  { value: 'DELIVERANCE', label: 'Délivrance' },
  { value: 'FAMILY', label: 'Famille' },
];

interface Testimony {
  id: string;
  firstName?: string;
  lastName?: string;
  isAnonymous?: boolean;
  content: string;
  category?: string;
  isRead: boolean;
  wantsToTestify: boolean;
  isConfirmedToTestify: boolean;
  hasTestified?: boolean;
  note?: string;
  createdAt: string;
  phone?: string;
  email?: string;
  network?: { nom: string };
  session?: { nom: string };
  illustrations?: Array<{
    id: string;
    fileName: string;
    originalName: string;
    fileCategory?: string;
    fileType?: string;
  }>;
}

// Formater le nom d'auteur (exactement comme dans testimonyUtils.js)
const formatAuthorName = (testimony: Testimony) => {
  if (!testimony) return '—';
  if (testimony.isAnonymous) return i18nService.t('contactInfo.anonymous') || 'Anonyme';
  return `${testimony.firstName ?? ''} ${testimony.lastName ?? ''}`.trim() || '—';
};

// Formater la catégorie (exactement comme dans testimonyUtils.js)
const formatCategory = (category?: string) => {
  if (!category) return '—';
  const categoryObj = TESTIMONY_CATEGORIES.find(cat => cat.value === category);
  return categoryObj ? categoryObj.label : String(category);
};

// Formater la date
const formatDate = (date: string) => {
  return dayjs(date).format('DD/MM/YYYY');
};

export default function TestimoniesScreen() {
  useLanguageUpdate();
  const { selectedChurch } = useSelectedChurch();
  const [testimonies, setTestimonies] = useState<Testimony[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  const [showOnlyWantsToTestify, setShowOnlyWantsToTestify] = useState(false);
  const [selectedTestimony, setSelectedTestimony] = useState<Testimony | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [testimonyToDelete, setTestimonyToDelete] = useState<Testimony | null>(null);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [testimonyForNote, setTestimonyForNote] = useState<Testimony | null>(null);
  const [noteText, setNoteText] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [testimonyToConfirm, setTestimonyToConfirm] = useState<Testimony | null>(null);
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);

  // Catégories avec option "Toutes les catégories" pour les filtres
  const categories = [
    { value: '', label: i18nService.t('contactInfo.allCategories') || 'Toutes les catégories' },
    ...TESTIMONY_CATEGORIES,
  ];

  // Charger les témoignages
  const loadTestimonies = useCallback(async () => {
    if (!selectedChurch?.id) return;
    
    setLoading(true);
    
    try {
      const params: any = {
        page: page.toString(),
        limit: '10',
        churchId: selectedChurch.id,
      };
      
      if (searchTerm) params.search = searchTerm;
      if (selectedCategory) params.category = selectedCategory;
      if (showOnlyUnread) params.isRead = 'false';
      if (showOnlyWantsToTestify) params.wantsToTestify = 'true';
      
      const response = await apiService.testimonies.getAll(params);
      const data = response.data;
      
      if (data.success) {
        setTestimonies(data.data.testimonies || []);
        setTotalPages(data.data.totalPages || 1);
      } else {
        Alert.alert(
          i18nService.t('errors.error') || 'Erreur',
          data.message || i18nService.t('errors.testimony.loadingError') || 'Erreur lors du chargement des témoignages'
        );
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement des témoignages:', err);
      Alert.alert(
        i18nService.t('errors.error') || 'Erreur',
        i18nService.t('errors.testimony.loading') || 'Erreur lors du chargement des témoignages'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedChurch, page, searchTerm, selectedCategory, showOnlyUnread, showOnlyWantsToTestify]);

  useEffect(() => {
    loadTestimonies();
  }, [loadTestimonies]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    loadTestimonies();
  }, [loadTestimonies]);

  // Voir un témoignage
  const handleViewTestimony = async (testimony: Testimony) => {
    setSelectedTestimony(testimony);
    setViewDialogOpen(true);
    
    // Marquer automatiquement comme lu si ce n'est pas déjà fait
    if (!testimony.isRead) {
      try {
        await apiService.testimonies.markAsRead(testimony.id);
        loadTestimonies();
      } catch (err) {
        console.error('Erreur lors du marquage automatique comme lu:', err);
      }
    }
  };

  // Supprimer un témoignage
  const handleOpenDeleteDialog = (testimony: Testimony) => {
    setTestimonyToDelete(testimony);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setTestimonyToDelete(null);
  };

  const handleConfirmDeleteTestimony = async () => {
    if (!testimonyToDelete) return;

    try {
      const response = await apiService.testimonies.delete(testimonyToDelete.id);
      const data = response.data;

      if (data.success) {
        Alert.alert(
          i18nService.t('success.success') || 'Succès',
          i18nService.t('success.testimony.deleted') || 'Témoignage supprimé avec succès'
        );
        loadTestimonies();
      } else {
        Alert.alert(
          i18nService.t('errors.error') || 'Erreur',
          data.message || i18nService.t('errors.testimony.deletionError') || 'Erreur lors de la suppression'
        );
      }
    } catch (err: any) {
      Alert.alert(
        i18nService.t('errors.error') || 'Erreur',
        i18nService.t('errors.testimony.deletion') || 'Erreur lors de la suppression du témoignage'
      );
    } finally {
      handleCloseDeleteDialog();
    }
  };

  // Confirmer pour le culte
  const handleConfirmForCulte = (testimony: Testimony) => {
    setTestimonyToConfirm(testimony);
    setConfirmDialogOpen(true);
  };

  // Annuler la confirmation
  const handleCancelConfirmation = (testimony: Testimony) => {
    setTestimonyToConfirm(testimony);
    setConfirmDialogOpen(true);
  };

  const handleConfirmTestimonyAction = async () => {
    if (!testimonyToConfirm) return;

    const isConfirming = !testimonyToConfirm.isConfirmedToTestify;

    try {
      const response = await apiService.testimonies.confirmForCulte(testimonyToConfirm.id, { confirmed: isConfirming });
      const data = response.data;

      if (data.success) {
        Alert.alert(
          i18nService.t('success.success') || 'Succès',
          isConfirming 
            ? (i18nService.t('success.testimony.confirmed') || 'Témoignage confirmé pour le culte')
            : (i18nService.t('success.testimony.confirmationCancelled') || 'Confirmation annulée')
        );
        loadTestimonies();
      } else {
        Alert.alert(
          i18nService.t('errors.error') || 'Erreur',
          data.message || i18nService.t('errors.testimony.confirmationError') || 'Erreur lors de la confirmation'
        );
      }
    } catch (err: any) {
      Alert.alert(
        i18nService.t('errors.error') || 'Erreur',
        i18nService.t('errors.testimony.confirmation') || 'Erreur lors de la confirmation'
      );
    } finally {
      setConfirmDialogOpen(false);
      setTestimonyToConfirm(null);
    }
  };

  // Gestion des notes
  const handleOpenNoteDialog = (testimony: Testimony) => {
    setTestimonyForNote(testimony);
    setNoteText(testimony.note || '');
    setNoteDialogOpen(true);
  };

  const handleCloseNoteDialog = () => {
    setNoteDialogOpen(false);
    setTestimonyForNote(null);
    setNoteText('');
  };

  const handleSaveNote = async () => {
    if (!testimonyForNote) return;

    try {
      const response = await apiService.testimonies.addNote(testimonyForNote.id, noteText);
      const data = response.data;

      if (data.success) {
        Alert.alert(
          i18nService.t('success.success') || 'Succès',
          data.message || i18nService.t('success.noteSaved')
        );
        loadTestimonies();
        handleCloseNoteDialog();
      } else {
        Alert.alert(
          i18nService.t('errors.error') || 'Erreur',
          data.message || i18nService.t('errors.testimony.addNoteError') || 'Erreur lors de l\'ajout de la note'
        );
      }
    } catch (err: any) {
      Alert.alert(
        i18nService.t('errors.error') || 'Erreur',
        i18nService.t('errors.testimony.addNote') || 'Erreur lors de l\'ajout de la note'
      );
    }
  };

  const handleDeleteNote = async () => {
    if (!testimonyForNote) return;

    try {
      const response = await apiService.testimonies.addNote(testimonyForNote.id, '');
      const data = response.data;
      if (data.success) {
        Alert.alert(
          i18nService.t('success.success') || 'Succès',
          data.message || i18nService.t('success.noteDeleted')
        );
        loadTestimonies();
        handleCloseNoteDialog();
      } else {
        Alert.alert(
          i18nService.t('errors.error') || 'Erreur',
          data.message || i18nService.t('errors.testimony.deleteNoteError') || 'Erreur lors de la suppression de la note'
        );
      }
    } catch (err: any) {
      Alert.alert(
        i18nService.t('errors.error') || 'Erreur',
        i18nService.t('errors.testimony.deleteNote') || 'Erreur lors de la suppression de la note'
      );
    }
  };

  // Vérifier si un fichier est audio
  const isAudioFile = (file: any) => {
    const fileCategory = file.filecategory || file.fileCategory;
    if (fileCategory === 'AUDIO') return true;
    const audioExtensions = ['.webm', '.mp3', '.wav', '.ogg', '.m4a', '.aac'];
    const audioMimeTypes = ['audio/webm', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac'];
    const fileName = file.fileName || file.originalName || '';
    const fileType = file.fileType || '';
    return audioExtensions.some(ext => fileName.toLowerCase().endsWith(ext)) ||
           audioMimeTypes.some(mime => fileType.toLowerCase().includes(mime));
  };

  if (!selectedChurch) {
    return (
      <View style={styles.container}>
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            {i18nService.t('labels.selectChurchForTestimonies') || 'Veuillez sélectionner une église'}
          </Text>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>
                {i18nService.t('dashboard.menu.testimoniesManagement') || 'Témoignages'}
            </Text>
            <View style={styles.headerDivider} />
          </View>
          <IconButton
            icon="refresh"
            iconColor="#662d91"
            size={24}
            onPress={onRefresh}
            disabled={loading}
            style={styles.refreshButton}
          />
        </View>

        {/* Filtres - Toujours visibles comme dans la version web */}
        <Card style={styles.filtersCard}>
          <LinearGradient
            colors={['#FFFFFF', '#F5F3FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.filtersGradient}
          >
            <View style={styles.filtersContent}>
              <View style={styles.filtersHeader}>
                <MaterialIcons name="filter-list" size={20} color="#662d91" />
                <Text style={styles.filtersTitle}>
                  {i18nService.t('common.actions.filter') || 'Filtres'}
                </Text>
              </View>

              <View style={styles.filtersRow}>
                {/* Recherche */}
                <View style={styles.filterInputContainer}>
                  <TextInput
                    mode="outlined"
                    placeholder={i18nService.t('contactInfo.searchTestimonies') || 'Rechercher des témoignages...'}
                    value={searchTerm}
                    onChangeText={(text) => {
                      setSearchTerm(text);
                      setPage(1);
                    }}
                    style={styles.filterInput}
                    left={<TextInput.Icon icon="magnify" />}
                    contentStyle={styles.filterInputContent}
                  />
                </View>

                {/* Catégorie */}
                <View style={styles.filterInputContainer}>
                  <Button
                    mode="outlined"
                    onPress={() => setCategoryMenuVisible(true)}
                    style={styles.filterSelectButton}
                    contentStyle={styles.filterSelectButtonContent}
                    labelStyle={styles.filterSelectButtonLabel}
                  >
                    {categories.find(c => c.value === selectedCategory)?.label || categories[0].label}
                  </Button>
                  <BottomSheet
                    visible={categoryMenuVisible}
                    onClose={() => setCategoryMenuVisible(false)}
                    items={categories.map(cat => ({
                      label: cat.label,
                      value: cat.value,
                    }))}
                    onSelect={(item) => {
                      setSelectedCategory(item.value as string);
                      setPage(1);
                      setCategoryMenuVisible(false);
                    }}
                    title={i18nService.t('contactInfo.category') || 'Catégorie'}
                  />
                </View>
              </View>

              {/* Checkboxes */}
              <View style={styles.checkboxRow}>
                <View style={styles.checkboxItem}>
                  <Checkbox
                    status={showOnlyUnread ? 'checked' : 'unchecked'}
                    onPress={() => {
                      setShowOnlyUnread(!showOnlyUnread);
                      setPage(1);
                    }}
                    color="#662d91"
                    uncheckedColor="#662d91"
                  />
                  <TouchableOpacity
                    onPress={() => {
                      setShowOnlyUnread(!showOnlyUnread);
                      setPage(1);
                    }}
                    style={styles.checkboxLabelContainer}
                  >
                    <Text style={styles.checkboxLabel}>
                      {i18nService.t('contactInfo.unreadOnly') || 'Non lus uniquement'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.checkboxItem}>
                  <Checkbox
                    status={showOnlyWantsToTestify ? 'checked' : 'unchecked'}
                    onPress={() => {
                      setShowOnlyWantsToTestify(!showOnlyWantsToTestify);
                      setPage(1);
                    }}
                    color="#662d91"
                    uncheckedColor="#662d91"
                  />
                  <TouchableOpacity
                    onPress={() => {
                      setShowOnlyWantsToTestify(!showOnlyWantsToTestify);
                      setPage(1);
                    }}
                    style={styles.checkboxLabelContainer}
                  >
                    <Text style={styles.checkboxLabel}>
                      {i18nService.t('contactInfo.wantsToTestify') || 'Souhaite témoigner'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Compteur de témoignages */}
              <View style={styles.countContainer}>
                <Chip
                  icon={() => <MaterialIcons name="book" size={16} color="#662d91" />}
                  style={styles.countChip}
                >
                  {testimonies.length} {i18nService.t('testimonies.testimony') || 'témoignage(s)'}
                </Chip>
              </View>
            </View>
          </LinearGradient>
        </Card>

        {/* Liste des témoignages */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#662d91" />
          </View>
        ) : testimonies.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {i18nService.t('labels.noTestimoniesFound') || 'Aucun témoignage trouvé'}
            </Text>
          </Card>
        ) : (
          <View style={styles.content}>
            {testimonies.map((testimony) => (
              <Card 
                key={testimony.id} 
                style={[
                  styles.testimonyCard,
                  testimony.isRead && styles.testimonyCardRead
                ]}
              >
                <LinearGradient
                  colors={['#FFFFFF', '#F5F3FF']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cardGradient}
                >
                  <Card.Content style={styles.cardContent}>
                    {/* En-tête avec catégorie et date */}
                    <View style={styles.testimonyHeader}>
                      <Chip
                        style={styles.categoryChip}
                        textStyle={styles.categoryChipText}
                      >
                        {formatCategory(testimony.category)}
                      </Chip>
                      <Text style={styles.testimonyDate}>
                        {formatDate(testimony.createdAt)}
                      </Text>
                    </View>

                    {/* Nom de l'auteur */}
                    <Text style={styles.testimonyAuthor}>
                      {formatAuthorName(testimony)}
                    </Text>

                    {/* Contenu */}
                    <Text style={styles.testimonyContent} numberOfLines={3}>
                      {testimony.content}
                    </Text>

                    {/* Note si présente */}
                    {testimony.note && (
                      <View style={styles.noteContainer}>
                        <View style={styles.noteHeader}>
                          <View style={styles.noteIconContainer}>
                            <MaterialIcons name="sticky-note-2" size={16} color="#fff" />
                          </View>
                          <Text style={styles.noteHeaderText}>
                            {i18nService.t('contactInfo.note') || 'Note'}
                          </Text>
                        </View>
                        <Text style={styles.noteText}>
                          {testimony.note}
                        </Text>
                      </View>
                    )}

                    {/* Chips d'information */}
                    <View style={styles.infoChipsContainer}>
                      {testimony.network?.nom && (
                        <Chip
                          icon={() => <MaterialIcons name="group" size={14} color="#662d91" />}
                          style={styles.infoChip}
                          textStyle={styles.infoChipText}
                        >
                          Réseau : {testimony.network.nom}
                        </Chip>
                      )}
                      {testimony.session?.nom && (
                        <Chip
                          icon={() => <MaterialIcons name="group" size={14} color="#662d91" />}
                          style={styles.infoChip}
                          textStyle={styles.infoChipText}
                        >
                          Section : {testimony.session.nom}
                        </Chip>
                      )}
                      {testimony.illustrations && testimony.illustrations.length > 0 && (
                        <Chip
                          icon={() => <MaterialIcons name="attach-file" size={14} color="#9e005d" />}
                          style={styles.infoChipSecondary}
                          textStyle={styles.infoChipTextSecondary}
                        >
                          {testimony.illustrations.length} fichier(s)
                        </Chip>
                      )}
                      {testimony.wantsToTestify && (
                        <Chip
                          style={styles.warningChip}
                          textStyle={styles.warningChipText}
                        >
                          {i18nService.t('contactInfo.wantsToTestify') || 'Souhaite témoigner'}
                        </Chip>
                      )}
                      {testimony.isConfirmedToTestify && (
                        <Chip
                          style={styles.successChip}
                          textStyle={styles.successChipText}
                        >
                          {i18nService.t('contactInfo.confirmedForService') || 'Confirmé pour le culte'}
                        </Chip>
                      )}
                      {testimony.hasTestified && (
                        <Chip
                          style={styles.infoChipBlue}
                          textStyle={styles.infoChipTextBlue}
                        >
                          {i18nService.t('contactInfo.hasTestified') || 'A témoigné'}
                        </Chip>
                      )}
                    </View>
                  </Card.Content>

                  {/* Actions en bas */}
                  <View style={styles.testimonyActions}>
                    <View style={styles.actionsLeft}>
                      <IconButton
                        icon="eye"
                        size={20}
                        iconColor={testimony.isRead ? '#999' : '#662d91'}
                        onPress={() => handleViewTestimony(testimony)}
                      />
                      {!testimony.isAnonymous && !testimony.isConfirmedToTestify && (
                        <IconButton
                          icon="check-circle"
                          size={20}
                          iconColor="#4CAF50"
                          onPress={() => handleConfirmForCulte(testimony)}
                        />
                      )}
                      {testimony.isConfirmedToTestify && (
                        <IconButton
                          icon="cancel"
                          size={20}
                          iconColor="#EF4444"
                          onPress={() => handleCancelConfirmation(testimony)}
                        />
                      )}
                      <IconButton
                        icon="note"
                        size={20}
                        iconColor={testimony.note ? '#662d91' : '#999'}
                        onPress={() => handleOpenNoteDialog(testimony)}
                      />
                    </View>
                    <IconButton
                      icon="delete"
                      size={20}
                      iconColor="#EF4444"
                      onPress={() => handleOpenDeleteDialog(testimony)}
                    />
                  </View>
                </LinearGradient>
              </Card>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <View style={styles.paginationContainer}>
                <Button
                  mode="outlined"
                  onPress={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  icon="chevron-left"
                  style={styles.paginationButton}
                  labelStyle={styles.paginationButtonLabel}
                  compact
                >
                  {i18nService.t('common.actions.previous') || 'Préc.'}
                </Button>
                <View style={styles.paginationInfo}>
                  <Text style={styles.paginationText}>
                    {i18nService.t('common.pagination.page') || 'Page'} {page} / {totalPages}
                  </Text>
                </View>
                <Button
                  mode="outlined"
                  onPress={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  icon={() => null}
                  style={styles.paginationButton}
                  labelStyle={styles.paginationButtonLabel}
                  compact
                  contentStyle={styles.paginationButtonContent}
                >
                  <View style={styles.paginationButtonInner}>
                   
                    <Text style={styles.paginationButtonLabel}>
                      {i18nService.t('common.actions.next') || 'Suiv.'}
                    </Text>
                    <MaterialIcons name="chevron-right" size={18} color={page === totalPages ? '#999' : '#662d91'} />
                  </View>
                </Button>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Dialog pour voir un témoignage */}
      <Portal>
        <Dialog
          visible={viewDialogOpen}
          onDismiss={() => setViewDialogOpen(false)}
          style={styles.dialog}
        >
          {selectedTestimony && (
            <View>
              {/* Header avec gradient */}
              <LinearGradient
                colors={['rgb(59, 20, 100)', '#662d91', '#9e005d']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.dialogHeader}
              >
                <View style={styles.dialogHeaderContent}>
                  <View style={styles.dialogHeaderIcon}>
                    <MaterialIcons name="person" size={28} color="#fff" />
                  </View>
                  <View>
                    <Text style={styles.dialogHeaderTitle}>
                      Témoignage
                    </Text>
                    <Text style={styles.dialogHeaderSubtitle}>
                      {formatAuthorName(selectedTestimony)}
                    </Text>
                  </View>
                </View>
              </LinearGradient>

              <Dialog.Content style={styles.dialogContentContainer}>
                <ScrollView 
                  style={styles.dialogContent}
                  contentContainerStyle={styles.dialogContentContainerStyle}
                  showsVerticalScrollIndicator={true}
                >
                  {/* Catégorie */}
                  <View style={styles.dialogCategoryContainer}>
                    <Chip
                      style={styles.dialogCategoryChip}
                      textStyle={styles.dialogCategoryChipText}
                      icon={() => <MaterialIcons name="category" size={18} color="#fff" />}
                    >
                      {formatCategory(selectedTestimony.category)}
                    </Chip>
                  </View>

                  {/* Contenu */}
                  <Card style={styles.dialogContentCard}>
                    <LinearGradient
                      colors={['#FFFFFF', '#F5F3FF', '#E8E0FF']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.dialogContentGradient}
                    >
                      <View style={styles.dialogContentHeader}>
                        <MaterialIcons name="format-quote" size={24} color="#662d91" />
                        <Text style={styles.dialogContentLabel}>Témoignage</Text>
                      </View>
                      <Text style={styles.dialogContentText}>
                        {selectedTestimony.content}
                      </Text>
                    </LinearGradient>
                  </Card>

                  {/* Informations de contact */}
                  {(selectedTestimony.phone || selectedTestimony.email || selectedTestimony.network?.nom || selectedTestimony.session?.nom) && (
                    <Card style={styles.dialogInfoCard}>
                      <LinearGradient
                        colors={['#FFFFFF', '#F5F3FF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.dialogInfoGradient}
                      >
                        <View style={styles.dialogInfoHeader}>
                          <View style={styles.dialogInfoHeaderIconContainer}>
                            <MaterialIcons name="contact-phone" size={20} color="#662d91" />
                          </View>
                          <Text style={styles.dialogInfoHeaderText}>
                            Informations de contact
                          </Text>
                        </View>
                        <View style={styles.dialogInfoItems}>
                          {selectedTestimony.phone && (
                            <View style={styles.dialogInfoItem}>
                              <View style={styles.dialogInfoIcon}>
                                <MaterialIcons name="phone" size={20} color="#fff" />
                              </View>
                              <Text style={styles.dialogInfoItemText}>
                                {selectedTestimony.phone}
                              </Text>
                            </View>
                          )}
                          {selectedTestimony.email && (
                            <View style={styles.dialogInfoItem}>
                              <View style={styles.dialogInfoIcon}>
                                <MaterialIcons name="email" size={20} color="#fff" />
                              </View>
                              <Text style={styles.dialogInfoItemText}>
                                {selectedTestimony.email}
                              </Text>
                            </View>
                          )}
                          {selectedTestimony.network?.nom && (
                            <View style={styles.dialogInfoItem}>
                              <View style={styles.dialogInfoIcon}>
                                <MaterialIcons name="group" size={20} color="#fff" />
                              </View>
                              <Text style={styles.dialogInfoItemText}>
                                Réseau : {selectedTestimony.network.nom}
                              </Text>
                            </View>
                          )}
                          {selectedTestimony.session?.nom && (
                            <View style={styles.dialogInfoItem}>
                              <View style={styles.dialogInfoIcon}>
                                <MaterialIcons name="group" size={20} color="#fff" />
                              </View>
                              <Text style={styles.dialogInfoItemText}>
                                Section : {selectedTestimony.session.nom}
                              </Text>
                            </View>
                          )}
                        </View>
                      </LinearGradient>
                    </Card>
                  )}

                  {/* Fichiers joints */}
                  {selectedTestimony.illustrations && selectedTestimony.illustrations.length > 0 && (
                    <Card style={styles.dialogFilesCard}>
                      <LinearGradient
                        colors={['#FFFFFF', '#F5F3FF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.dialogFilesGradient}
                      >
                        <View style={styles.dialogFilesHeader}>
                          <View style={styles.dialogInfoHeaderIconContainer}>
                            <MaterialIcons name="attach-file" size={20} color="#662d91" />
                          </View>
                          <Text style={styles.dialogFilesHeaderText}>
                            Fichiers joints ({selectedTestimony.illustrations.filter(f => !isAudioFile(f)).length})
                          </Text>
                        </View>
                        <View style={styles.dialogFilesList}>
                          {selectedTestimony.illustrations.map((file, index) => {
                            if (isAudioFile(file)) return null;
                            const fileUrl = `${API_URL}/uploads/testimonies/${file.fileName}`;
                            return (
                              <TouchableOpacity
                                key={index}
                                onPress={() => Linking.openURL(fileUrl)}
                                style={styles.dialogFileChip}
                              >
                                <MaterialIcons name="download" size={16} color="#662d91" />
                                <Text style={styles.dialogFileChipText}>
                                  {file.originalName}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </LinearGradient>
                    </Card>
                  )}
                </ScrollView>
              </Dialog.Content>

              <Dialog.Actions style={styles.dialogViewActions}>
                <Button
                  onPress={() => setViewDialogOpen(false)}
                  mode="contained"
                  style={styles.dialogCloseButton}
                  buttonColor="#662d91"
                  labelStyle={styles.dialogCloseButtonLabel}
                >
                  {i18nService.t('common.actions.close') || 'Fermer'}
                </Button>
              </Dialog.Actions>
            </View>
          )}
        </Dialog>
      </Portal>

      {/* Dialog de confirmation suppression */}
      <Portal>
        <Dialog
          visible={deleteDialogOpen}
          onDismiss={handleCloseDeleteDialog}
          style={styles.dialog}
        >
          <LinearGradient
            colors={['rgb(59, 20, 100)', '#662d91', '#9e005d']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.dialogDeleteHeader}
          >
            <Dialog.Title style={styles.dialogDeleteTitle}>
              {i18nService.t('contactInfo.deleteTitle') || 'Supprimer le témoignage'}
            </Dialog.Title>
          </LinearGradient>
          <Dialog.Content style={styles.dialogDeleteContent}>
            <Text style={styles.dialogDeleteText}>
              {i18nService.t('labels.deleteTestimonyConfirm', {
                title: formatAuthorName(testimonyToDelete || {} as Testimony),
              }) || `Êtes-vous sûr de vouloir supprimer le témoignage de ${formatAuthorName(testimonyToDelete || {} as Testimony)} ?`}
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogDeleteActions}>
            <Button 
              onPress={handleCloseDeleteDialog}
              mode="outlined"
              style={styles.dialogCancelButton}
              labelStyle={styles.dialogCancelButtonLabel}
            >
              {i18nService.t('common.actions.cancel') || 'Annuler'}
            </Button>
            <Button 
              onPress={handleConfirmDeleteTestimony} 
              mode="contained"
              buttonColor="#EF4444"
              style={styles.dialogDeleteButton}
              labelStyle={styles.dialogDeleteButtonLabel}
            >
              {i18nService.t('common.actions.delete') || 'Supprimer'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Dialog pour les notes */}
      <Portal>
        <Dialog
          visible={noteDialogOpen}
          onDismiss={handleCloseNoteDialog}
          style={styles.dialog}
        >
          <View>
            <LinearGradient
              colors={['rgb(59, 20, 100)', '#662d91', '#9e005d']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.dialogNoteHeader}
            >
              <Dialog.Title style={styles.dialogNoteTitle}>
                {testimonyForNote?.note
                  ? i18nService.t('contactInfo.editNote') || 'Modifier la note'
                  : i18nService.t('contactInfo.addNote') || 'Ajouter une note'}
              </Dialog.Title>
            </LinearGradient>
            <Dialog.Content style={styles.dialogNoteContent}>
            <ScrollView 
              style={styles.dialogNoteScrollView}
              contentContainerStyle={styles.dialogNoteContentContainerStyle}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
              {testimonyForNote && (
                <Card style={styles.dialogNoteInfoCard}>
                  <LinearGradient
                    colors={['rgba(102, 45, 145, 0.08)', 'rgba(158, 0, 93, 0.05)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.dialogNoteInfoGradient}
                  >
                    <View style={styles.dialogNoteInfoHeader}>
                      <MaterialIcons name="info" size={20} color="#662d91" />
                      <Text style={styles.dialogNoteInfoText}>
                        {i18nService.t('contactInfo.testimonyOf') || 'Témoignage de'}{' '}
                        {formatAuthorName(testimonyForNote)} - {formatCategory(testimonyForNote.category)}
                      </Text>
                    </View>
                  </LinearGradient>
                </Card>
              )}
              <View style={styles.noteInputContainer}>
                <TextInput
                  mode="outlined"
                  multiline
                  numberOfLines={8}
                  value={noteText}
                  onChangeText={setNoteText}
                  placeholder={i18nService.t('contactInfo.notePlaceholder') || 'Ajouter une note...'}
                  style={styles.noteInput}
                  contentStyle={styles.noteInputContent}
                  textColor="#333"
                  placeholderTextColor="#999"
                  outlineColor="rgba(102, 45, 145, 0.2)"
                  activeOutlineColor="#662d91"
                />
              </View>
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogNoteActions}>
            <Button 
              onPress={handleCloseNoteDialog}
              mode="outlined"
              style={styles.dialogCancelButton}
              labelStyle={styles.dialogCancelButtonLabel}
            >
              {i18nService.t('common.actions.cancel') || 'Annuler'}
            </Button>
            {testimonyForNote?.note && (
              <Button 
                onPress={handleDeleteNote} 
                mode="outlined"
                textColor="#EF4444"
                style={styles.dialogDeleteNoteButton}
                labelStyle={styles.dialogDeleteNoteButtonLabel}
              >
                {i18nService.t('contactInfo.deleteNote') || 'Supprimer'}
              </Button>
            )}
            <Button
              onPress={handleSaveNote}
              disabled={!noteText.trim()}
              mode="contained"
              buttonColor={!noteText.trim() ? '#999' : '#662d91'}
              style={styles.dialogSaveButton}
              labelStyle={styles.dialogSaveButtonLabel}
            >
              {testimonyForNote?.note
                ? i18nService.t('common.actions.edit') || 'Modifier'
                : i18nService.t('common.actions.add') || 'Ajouter'}
            </Button>
          </Dialog.Actions>
          </View>
        </Dialog>
      </Portal>

      {/* Dialog de confirmation pour le culte */}
      <Portal>
        <Dialog
          visible={confirmDialogOpen}
          onDismiss={() => setConfirmDialogOpen(false)}
          style={styles.dialog}
        >
          <LinearGradient
            colors={['rgb(59, 20, 100)', '#662d91', '#9e005d']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.dialogConfirmHeader}
          >
            <Dialog.Title style={styles.dialogConfirmTitle}>
              {testimonyToConfirm?.isConfirmedToTestify
                ? i18nService.t('contactInfo.cancelConfirmation') || 'Annuler la confirmation'
                : i18nService.t('contactInfo.confirmForService') || 'Confirmer pour le culte'}
            </Dialog.Title>
          </LinearGradient>
          <Dialog.Content style={styles.dialogConfirmContent}>
            <Text style={styles.dialogConfirmText}>
              {testimonyToConfirm?.isConfirmedToTestify
                ? i18nService.t('labels.confirmCancelTestimony') ||
                  'Êtes-vous sûr de vouloir annuler la confirmation de ce témoignage pour le culte ?'
                : i18nService.t('labels.confirmTestimonyForService') ||
                  'Êtes-vous sûr de vouloir confirmer ce témoignage pour le culte ?'}
            </Text>
            {testimonyToConfirm && (
              <View style={styles.dialogConfirmInfo}>
                <Text style={styles.dialogConfirmInfoText}>
                  {formatAuthorName(testimonyToConfirm)} - {formatCategory(testimonyToConfirm.category)}
                </Text>
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogConfirmActions}>
            <Button 
              onPress={() => setConfirmDialogOpen(false)}
              mode="outlined"
              style={styles.dialogCancelButton}
              labelStyle={styles.dialogCancelButtonLabel}
            >
              {i18nService.t('common.actions.cancel') || 'Annuler'}
            </Button>
            <Button
              onPress={handleConfirmTestimonyAction}
              mode="contained"
              buttonColor={testimonyToConfirm?.isConfirmedToTestify ? '#EF4444' : '#662d91'}
              style={styles.dialogConfirmButton}
              labelStyle={styles.dialogConfirmButtonLabel}
            >
              {testimonyToConfirm?.isConfirmedToTestify
                ? i18nService.t('contactInfo.cancelConfirmation') || 'Annuler'
                : i18nService.t('contactInfo.confirm') || 'Confirmer'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  header: {
    padding: 20,
    paddingBottom: 16,
    backgroundColor: '#f0f2f5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: '#662d91',
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
    backgroundColor: '#fff',
    borderColor: '#662d91',
    borderRadius: 16,
    borderWidth: 2,
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  filtersCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(102, 45, 145, 0.15)',
    elevation: 8,
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  filtersGradient: {
    borderRadius: 24,
  },
  filtersContent: {
    padding: 24,
  },
  filtersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(102, 45, 145, 0.1)',
  },
  filtersTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#662d91',
    marginLeft: 10,
    letterSpacing: 0.5,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterInputContainer: {
    flex: 1,
    minWidth: 150,
  },
  filterInput: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(102, 45, 145, 0.2)',
  },
  filterInputContent: {
    minHeight: 48,
  },
  filterSelectButton: {
    borderColor: '#662d91',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 48,
  },
  filterSelectButtonContent: {
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
  },
  filterSelectButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#662d91',
  },
  checkboxRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 20,
    flexWrap: 'wrap',
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(102, 45, 145, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(102, 45, 145, 0.15)',
    flex: 1,
    minWidth: 180,
  },
  checkboxLabelContainer: {
    flex: 1,
    marginLeft: 8,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#662d91',
    fontWeight: '600',
  },
  countContainer: {
    alignItems: 'center',
  },
  countChip: {
    backgroundColor: 'rgba(102, 45, 145, 0.1)',
    borderColor: '#662d91',
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    padding: 20,
    paddingTop: 0,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    padding: 48,
    borderRadius: 28,
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    marginHorizontal: 20,
    borderWidth: 2,
    borderColor: 'rgba(102, 45, 145, 0.15)',
    borderStyle: 'dashed',
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  emptyText: {
    fontSize: 18,
    color: '#662d91',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  testimonyCard: {
    marginBottom: 24,
    borderRadius: 24,
    elevation: 12,
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(102, 45, 145, 0.25)',
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  testimonyCardRead: {
    opacity: 0.75,
    borderColor: 'rgba(102, 45, 145, 0.08)',
    elevation: 4,
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardGradient: {
    borderRadius: 24,
  },
  cardContent: {
    padding: 20,
  },
  testimonyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryChip: {
    backgroundColor: '#662d91',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  categoryChipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  testimonyDate: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    backgroundColor: 'rgba(102, 45, 145, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  testimonyAuthor: {
    fontSize: 20,
    fontWeight: '700',
    color: '#662d91',
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  testimonyContent: {
    fontSize: 15,
    color: '#444',
    lineHeight: 24,
    marginBottom: 14,
    letterSpacing: 0.1,
  },
  noteContainer: {
    backgroundColor: 'rgba(255, 249, 196, 0.8)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#FFD54F',
    shadowColor: '#FFD54F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#662d91',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  noteHeaderText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#662d91',
    letterSpacing: 0.3,
  },
  noteText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    paddingLeft: 28,
    lineHeight: 18,
  },
  infoChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  infoChip: {
    backgroundColor: 'rgba(102, 45, 145, 0.08)',
    borderColor: '#662d91',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  infoChipText: {
    fontSize: 11,
    color: '#662d91',
    fontWeight: '600',
  },
  infoChipSecondary: {
    backgroundColor: 'rgba(158, 0, 93, 0.08)',
    borderColor: '#9e005d',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  infoChipTextSecondary: {
    fontSize: 11,
    color: '#9e005d',
    fontWeight: '600',
  },
  warningChip: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderColor: '#FF9800',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  warningChipText: {
    fontSize: 11,
    color: '#FF9800',
    fontWeight: '700',
  },
  successChip: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: '#4CAF50',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  successChipText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '700',
  },
  infoChipBlue: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderColor: '#2196F3',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  infoChipTextBlue: {
    fontSize: 11,
    color: '#2196F3',
    fontWeight: '700',
  },
  testimonyActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 2,
    borderTopColor: 'rgba(102, 45, 145, 0.15)',
    paddingTop: 12,
    backgroundColor: 'rgba(245, 243, 255, 0.5)',
  },
  actionsLeft: {
    flexDirection: 'row',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(102, 45, 145, 0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(102, 45, 145, 0.1)',
    flexWrap: 'nowrap',
    gap: 12,
  },
  paginationButton: {
    borderColor: '#662d91',
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 0,
    height: 40,
    minWidth: 70,
    maxWidth: 100,
    justifyContent: 'center',
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  paginationButtonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#662d91',
    letterSpacing: 0.3,
  },
  paginationButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  paginationButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paginationInfo: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 0,
    height: 40,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#662d91',
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    flex: 0,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    maxWidth: 120,
  },
  paginationText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#662d91',
    letterSpacing: 0.5,
  },
  dialog: {
    borderRadius: 28,
    maxWidth: '95%',
    marginHorizontal: 'auto',
  },
  // Styles pour le dialog de suppression
  dialogDeleteHeader: {
    padding: 24,
    paddingBottom: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  dialogDeleteTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dialogDeleteContent: {
    padding: 24,
    paddingTop: 20,
  },
  dialogDeleteText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  dialogDeleteActions: {
    padding: 20,
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    flexWrap: 'wrap',
  },
  dialogDeleteButton: {
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 0,
    height: 48,
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    justifyContent: 'center',
  },
  dialogDeleteButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: '#fff',
  },
  // Styles pour le dialog de note
  dialogNoteHeader: {
    padding: 32,
    paddingBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  dialogNoteTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  dialogNoteContent: {
    padding: 0,
    maxHeight: 300,
    backgroundColor: '#FAFAFA',
  },
  dialogNoteScrollView: {
    maxHeight: 300,
  },
  dialogNoteContentContainerStyle: {
    padding: 12,
  },
  dialogNoteInfoCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(102, 45, 145, 0.15)',
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  dialogNoteInfoGradient: {
    padding: 16,
    borderRadius: 16,
  },
  dialogNoteInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dialogNoteInfoText: {
    fontSize: 14,
    color: '#662d91',
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
  noteInputContainer: {
    marginTop: 8,
  },
  dialogNoteActions: {
    padding: 20,
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    flexWrap: 'wrap',
  },
  dialogDeleteNoteButton: {
    borderRadius: 16,
    borderColor: '#EF4444',
    borderWidth: 2,
    paddingHorizontal: 24,
    paddingVertical: 0,
    height: 48,
    justifyContent: 'center',
  },
  dialogDeleteNoteButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
    letterSpacing: 0.3,
  },
  dialogSaveButton: {
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 0,
    height: 48,
    backgroundColor: '#662d91',
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    justifyContent: 'center',
  },
  dialogSaveButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: '#fff',
  },
  // Styles pour le dialog de confirmation
  dialogConfirmHeader: {
    padding: 24,
    paddingBottom: 20,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  dialogConfirmTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dialogConfirmContent: {
    padding: 24,
    paddingTop: 20,
  },
  dialogConfirmText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 12,
  },
  dialogConfirmInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(102, 45, 145, 0.08)',
    borderRadius: 12,
  },
  dialogConfirmInfoText: {
    fontSize: 14,
    color: '#662d91',
    fontWeight: '600',
  },
  dialogConfirmActions: {
    padding: 20,
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    flexWrap: 'wrap',
  },
  dialogConfirmButton: {
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 0,
    height: 48,
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    justifyContent: 'center',
  },
  dialogConfirmButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: '#fff',
  },
  dialogCancelButton: {
    borderRadius: 16,
    borderColor: '#662d91',
    borderWidth: 2,
    paddingHorizontal: 24,
    paddingVertical: 0,
    height: 48,
    justifyContent: 'center',
  },
  dialogCancelButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#662d91',
    letterSpacing: 0.3,
  },
  dialogHeader: {
    padding: 32,
    paddingBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  dialogHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dialogHeaderIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  dialogHeaderTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  dialogHeaderSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  dialogContentContainer: {
    padding: 0,
    maxHeight: 490,
    backgroundColor: '#FAFAFA',
  },
  dialogContent: {
    maxHeight: 450,
  },
  dialogContentContainerStyle: {
    padding: 12,
  },
  dialogCategoryContainer: {
    marginBottom: 16,
    marginTop: 10,
    alignItems: 'flex-start',
  },
  dialogCategoryChip: {
    backgroundColor: '#662d91',
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  dialogCategoryChipText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dialogContentCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(102, 45, 145, 0.2)',
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  dialogContentGradient: {
    padding: 18,
    borderRadius: 20,
  },
  dialogContentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(102, 45, 145, 0.15)',
  },
  dialogContentLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#662d91',
    letterSpacing: 0.5,
  },
  dialogContentText: {
    fontSize: 17,
    lineHeight: 30,
    color: '#444',
    letterSpacing: 0.2,
    fontWeight: '400',
  },
  dialogInfoCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(102, 45, 145, 0.2)',
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  dialogInfoGradient: {
    padding: 18,
    borderRadius: 20,
  },
  dialogInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  dialogInfoHeaderIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(102, 45, 145, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(102, 45, 145, 0.2)',
  },
  dialogInfoHeaderBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
    backgroundColor: '#662d91',
    marginRight: 8,
  },
  dialogInfoHeaderText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#662d91',
    letterSpacing: 0.3,
    flex: 1,
  },
  dialogInfoItems: {
    gap: 12,
  },
  dialogInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(102, 45, 145, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(102, 45, 145, 0.1)',
    marginBottom: 8,
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dialogInfoIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#662d91',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  dialogInfoItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    letterSpacing: 0.2,
  },
  dialogFilesCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(102, 45, 145, 0.2)',
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  dialogFilesGradient: {
    padding: 18,
    borderRadius: 20,
  },
  dialogFilesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  dialogFilesHeaderText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#662d91',
    letterSpacing: 0.3,
    flex: 1,
  },
  dialogFilesList: {
    gap: 12,
  },
  dialogFileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(102, 45, 145, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(102, 45, 145, 0.25)',
    marginBottom: 8,
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  dialogFileChipText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#662d91',
    flex: 1,
    letterSpacing: 0.2,
  },
  dialogViewActions: {
    padding: 24,
    paddingTop: 20,
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: 'rgba(102, 45, 145, 0.1)',
  },
  dialogCloseButton: {
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 0,
    height: 48,
    backgroundColor: '#662d91',
    shadowColor: '#662d91',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    justifyContent: 'center',
  },
  dialogCloseButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: '#fff',
  },
  dialogInfoText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  noteInput: {
    backgroundColor: '#fff',
    minHeight: 150,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  noteInputContent: {
    padding: 16,
    minHeight: 150,
    textAlignVertical: 'top',
    fontSize: 15,
    lineHeight: 22,
  },
});
