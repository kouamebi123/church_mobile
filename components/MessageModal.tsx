import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  Button,
  ActivityIndicator,
  Portal,
  Surface,
  Chip,
  Checkbox,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { apiService } from '../services/apiService';
import { useSelectedChurch } from '../hooks/useSelectedChurch';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import i18nService from '../services/i18nService';
import dayjs from 'dayjs';

interface MessageStats {
  unread_count: number;
  unacknowledged_count?: number;
  urgent_unread_count?: number;
  total_messages?: number;
}

interface Conversation {
  id: string;
  partner: {
    id: string;
    username: string;
    role?: string;
  };
  lastMessage: {
    content: string;
    message_type: string;
    is_read: boolean;
    created_at: string;
  };
  stats: {
    total_messages: number;
    unread_count: number;
  };
}

interface Message {
  id: string;
  content: string;
  is_from_current_user: boolean;
  sender?: {
    username: string;
  };
  created_at: string;
  is_read?: boolean;
}

interface MessageModalProps {
  visible: boolean;
  onClose: () => void;
  messageStats: MessageStats;
}

export default function MessageModal({ visible, onClose, messageStats }: MessageModalProps) {
  const { user } = useSelector((state: RootState) => state.auth);
  const { selectedChurch } = useSelectedChurch();
  const [activeTab, setActiveTab] = useState(0); // 0: Conversations, 1: Envoyer
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState({
    content: '',
    recipient_ids: [] as string[],
    is_urgent: false,
  });
  const [replyMessage, setReplyMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);

  // Charger les conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await apiService.messages.getConversations();
      console.log('Réponse conversations:', response);
      // La réponse peut être dans response.data.data.conversations ou response.data.conversations
      let conversationsData = [];
      if (response.data?.success && response.data?.data?.conversations) {
        conversationsData = response.data.data.conversations;
      } else if (response.data?.conversations) {
        conversationsData = response.data.conversations;
      } else if (response.data?.data) {
        conversationsData = Array.isArray(response.data.data) ? response.data.data : [];
      } else if (Array.isArray(response.data)) {
        conversationsData = response.data;
      }
      console.log('Conversations extraites:', conversationsData);
      setConversations(Array.isArray(conversationsData) ? conversationsData : []);
    } catch (error: any) {
      console.error('Erreur lors du chargement des conversations:', error);
      console.error('Détails de l\'erreur:', error.response?.data || error.message);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Charger les utilisateurs pour l'envoi
  const loadUsers = useCallback(async () => {
    if (!user) return;
    try {
      const churchId = selectedChurch?.id || selectedChurch?._id || null;
      const response = await apiService.messages.getUsers({ churchId });
      const data = response.data?.data || response.data || [];
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      setUsers([]);
    }
  }, [user, selectedChurch]);

  // Charger les messages d'une conversation
  const loadConversationMessages = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const response = await apiService.messages.getConversationHistory(userId);
      console.log('Réponse messages conversation:', response);
      // La réponse peut être directement un tableau ou dans response.data
      let messagesData = [];
      if (Array.isArray(response.data)) {
        messagesData = response.data;
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        messagesData = response.data.data;
      } else if (response.data?.messages && Array.isArray(response.data.messages)) {
        messagesData = response.data.messages;
      }
      console.log('Messages extraits:', messagesData);
      setConversationMessages(messagesData);
    } catch (error: any) {
      console.error('Erreur lors du chargement des messages:', error);
      console.error('Détails de l\'erreur:', error.response?.data || error.message);
      setConversationMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadConversations();
      if (activeTab === 1) {
        loadUsers();
      }
    }
  }, [visible, activeTab, loadConversations, loadUsers]);

  const handleOpenConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    await loadConversationMessages(conversation.partner.id);
  };

  const handleBackToConversations = () => {
    setSelectedConversation(null);
    setConversationMessages([]);
    loadConversations();
  };

  const handleSendMessage = async () => {
    if (!newMessage.content.trim() || selectedUsers.length === 0) {
      return;
    }

    setIsSendingMessage(true);
    try {
      // Inclure les informations des destinataires pour créer les conversations
      const messageData = {
        content: newMessage.content,
        recipient_ids: selectedUsers.map((u) => u.id),
        recipients: selectedUsers,
        is_urgent: newMessage.is_urgent,
        subject: i18nService.t('messages.defaultSubject'),
      };
      
      const response = await apiService.messages.send(messageData);
      
      // Réinitialiser le formulaire
      setNewMessage({
        content: '',
        recipient_ids: [],
        is_urgent: false,
      });
      setSelectedUsers([]);
      setSearchQuery('');
      setShowSuggestions(false);
      setActiveTab(0);
      loadConversations();
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi du message:', error);
      // TODO: Afficher un message d'erreur à l'utilisateur
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim() || !selectedConversation) return;

    setIsSendingMessage(true);
    try {
      const messageData = {
        content: replyMessage,
        recipient_ids: [selectedConversation.partner.id],
        recipients: [selectedConversation.partner],
        is_urgent: false,
        subject: i18nService.t('messages.defaultSubject'),
      };
      
      console.log('Envoi de la réponse:', messageData);
      const response = await apiService.messages.send(messageData);
      console.log('Réponse reçue:', response);
      
      setReplyMessage('');
      // Recharger les messages de la conversation
      await loadConversationMessages(selectedConversation.partner.id);
      // Recharger la liste des conversations pour mettre à jour le dernier message
      loadConversations();
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi de la réponse:', error);
      console.error('Détails de l\'erreur:', error.response?.data || error.message);
      // TODO: Afficher un message d'erreur à l'utilisateur
    } finally {
      setIsSendingMessage(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.toLowerCase();
    const username = (user.username || user.pseudo || '').toLowerCase();
    const role = (user.role || '').toLowerCase();
    const churchName = (user.eglise_locale?.nom || '').toLowerCase();
    
    return (
      username.includes(query) ||
      role.includes(query) ||
      churchName.includes(query)
    );
  });

  const handleSelectUser = (user: any) => {
    if (!selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u.id !== userId));
  };

  const formatDate = (dateString: string) => {
    return dayjs(dateString).format('DD/MM/YYYY HH:mm');
  };

  const formatTime = (dateString: string) => {
    return dayjs(dateString).format('HH:mm');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <LinearGradient
            colors={['rgb(59, 20, 100)', '#662d91', '#9e005d']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <TouchableOpacity onPress={selectedConversation ? handleBackToConversations : onClose}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                {selectedConversation
                  ? i18nService.t('messages.conversationWith', { name: selectedConversation.partner.username })
                  : i18nService.t('navigation.messaging')}
              </Text>
              {messageStats.unread_count > 0 && !selectedConversation && (
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>{messageStats.unread_count}</Text>
                </View>
              )}
            </View>
          </LinearGradient>

          {/* Tabs (seulement si pas de conversation sélectionnée) */}
          {!selectedConversation && (
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 0 && styles.tabActive]}
                onPress={() => setActiveTab(0)}
              >
                <Ionicons
                  name="mail"
                  size={20}
                  color={activeTab === 0 ? '#662d91' : '#999'}
                />
                <Text style={[styles.tabText, activeTab === 0 && styles.tabTextActive]}>
                  {i18nService.t('messages.messages')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 1 && styles.tabActive]}
                onPress={() => setActiveTab(1)}
              >
                <Ionicons
                  name="send"
                  size={20}
                  color={activeTab === 1 ? '#662d91' : '#999'}
                />
                <Text style={[styles.tabText, activeTab === 1 && styles.tabTextActive]}>
                  {i18nService.t('messages.sendMessage')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Content */}
          <View style={styles.content}>
            {selectedConversation ? (
              // Vue de conversation
              <View style={styles.conversationContainer}>
                <ScrollView
                  style={styles.messagesList}
                  contentContainerStyle={styles.messagesListContent}
                >
                  {loading && conversationMessages.length === 0 ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color="#662d91" />
                    </View>
                  ) : conversationMessages.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>
                        Aucun message dans cette conversation
                      </Text>
                    </View>
                  ) : (
                    conversationMessages.map((msg) => (
                      <View
                        key={msg.id}
                        style={[
                          styles.messageBubble,
                          msg.is_from_current_user ? styles.messageSent : styles.messageReceived,
                        ]}
                      >
                        {!msg.is_from_current_user && (
                          <Text style={styles.messageSender}>{msg.sender?.username}</Text>
                        )}
                        <Text
                          style={[
                            styles.messageText,
                            msg.is_from_current_user && styles.messageTextSent,
                          ]}
                        >
                          {msg.content}
                        </Text>
                        <Text
                          style={[
                            styles.messageTime,
                            msg.is_from_current_user && styles.messageTimeSent,
                          ]}
                        >
                          {formatTime(msg.created_at)}
                        </Text>
                      </View>
                    ))
                  )}
                </ScrollView>

                {/* Zone de réponse */}
                <View style={styles.replyContainer}>
                  <TextInput
                    style={styles.replyInput}
                    placeholder={i18nService.t('messages.replyPlaceholder')}
                    value={replyMessage}
                    onChangeText={setReplyMessage}
                    multiline
                    editable={!isSendingMessage}
                  />
                  <TouchableOpacity
                    onPress={handleSendReply}
                    disabled={!replyMessage.trim() || isSendingMessage}
                    style={[
                      styles.sendButton,
                      (!replyMessage.trim() || isSendingMessage) && styles.sendButtonDisabled,
                    ]}
                  >
                    {isSendingMessage ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="send" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : activeTab === 0 ? (
              // Liste des conversations
              <ScrollView style={styles.conversationsList}>
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#662d91" />
                    <Text style={styles.loadingText}>Chargement des conversations...</Text>
                  </View>
                ) : conversations.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="mail-outline" size={56} color="#999" />
                    <Text style={styles.emptyText}>Aucune conversation</Text>
                    <Text style={styles.emptySubtext}>
                      {i18nService.t('messages.searchUserHelper')}
                    </Text>
                  </View>
                ) : (
                  conversations.map((conversation) => (
                    <TouchableOpacity
                      key={conversation.id}
                      style={[
                        styles.conversationItem,
                        (!conversation.lastMessage.is_read &&
                          conversation.lastMessage.message_type !== 'sent') &&
                          styles.conversationItemUnread,
                      ]}
                      onPress={() => handleOpenConversation(conversation)}
                    >
                      <View style={styles.conversationContent}>
                        <Text style={styles.conversationName}>
                          {conversation.partner.username}
                        </Text>
                        <Text
                          style={styles.conversationLastMessage}
                          numberOfLines={1}
                        >
                          {conversation.lastMessage.content}
                        </Text>
                        <Text style={styles.conversationTime}>
                          {formatDate(conversation.lastMessage.created_at)}
                        </Text>
                      </View>
                      {conversation.stats.unread_count > 0 && (
                        <View style={styles.conversationBadge}>
                          <Text style={styles.conversationBadgeText}>
                            {conversation.stats.unread_count}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            ) : (
              // Formulaire d'envoi
              <ScrollView style={styles.sendForm}>
                <Text style={styles.formLabel}>
                  {i18nService.t('messages.recipients')}
                </Text>
                
                {/* Autocomplete pour les destinataires */}
                <View style={styles.autocompleteContainer}>
                  <TextInput
                    style={styles.autocompleteInput}
                    placeholder={i18nService.t('messages.searchPlaceholder')}
                    value={searchQuery}
                    onChangeText={(text) => {
                      setSearchQuery(text);
                      setShowSuggestions(text.length > 0);
                    }}
                    onFocus={() => setShowSuggestions(searchQuery.length > 0)}
                  />
                  
                  {showSuggestions && (
                    <>
                      {filteredUsers.filter((user) => !selectedUsers.some((u) => u.id === user.id)).length > 0 ? (
                        <View style={styles.suggestionsContainer}>
                          <ScrollView style={styles.suggestionsList} nestedScrollEnabled>
                            {filteredUsers
                              .filter((user) => !selectedUsers.some((u) => u.id === user.id))
                              .map((user) => (
                                <TouchableOpacity
                                  key={user.id}
                                  style={styles.suggestionItem}
                                  onPress={() => handleSelectUser(user)}
                                >
                                  <Text style={styles.suggestionText}>
                                    {user.username || user.pseudo}
                                  </Text>
                                  {user.role && (
                                    <Text style={styles.suggestionRole}>{user.role}</Text>
                                  )}
                                </TouchableOpacity>
                              ))}
                          </ScrollView>
                        </View>
                      ) : searchQuery.length > 0 ? (
                        <View style={styles.suggestionsContainer}>
                          <Text style={styles.noSuggestionsText}>
                            {i18nService.t('messages.noUsersFound')}
                          </Text>
                        </View>
                      ) : null}
                    </>
                  )}
                </View>

                {/* Chips des destinataires sélectionnés */}
                {selectedUsers.length > 0 && (
                  <View style={styles.selectedRecipientsContainer}>
                    {selectedUsers.map((user) => (
                      <Chip
                        key={user.id}
                        onClose={() => handleRemoveUser(user.id)}
                        style={styles.selectedChip}
                        textStyle={styles.selectedChipText}
                      >
                        {user.username || user.pseudo}
                      </Chip>
                    ))}
                  </View>
                )}

                <Text style={styles.formLabel}>
                  {i18nService.t('messages.content')}
                </Text>
                <TextInput
                  style={styles.messageInput}
                  placeholder={i18nService.t('messages.content')}
                  value={newMessage.content}
                  onChangeText={(text) =>
                    setNewMessage({ ...newMessage, content: text })
                  }
                  multiline
                  numberOfLines={6}
                />

                <View style={styles.checkboxContainer}>
                  <Checkbox
                    status={newMessage.is_urgent ? 'checked' : 'unchecked'}
                    onPress={() =>
                      setNewMessage({ ...newMessage, is_urgent: !newMessage.is_urgent })
                    }
                  />
                  <Text style={styles.checkboxLabel}>
                    {i18nService.t('messages.urgent')}
                  </Text>
                </View>

                <Button
                  mode="contained"
                  onPress={handleSendMessage}
                  disabled={!newMessage.content.trim() || selectedUsers.length === 0 || isSendingMessage}
                  loading={isSendingMessage}
                  style={styles.sendFormButton}
                  labelStyle={styles.sendFormButtonLabel}
                >
                  {i18nService.t('messages.send')}
                </Button>
              </ScrollView>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  headerBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#662d91',
  },
  tabText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#662d91',
  },
  content: {
    flex: 1,
  },
  conversationsList: {
    flex: 1,
  },
  conversationItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  conversationItemUnread: {
    backgroundColor: '#F5F3FF',
  },
  conversationContent: {
    flex: 1,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  conversationLastMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  conversationTime: {
    fontSize: 12,
    color: '#999',
  },
  conversationBadge: {
    backgroundColor: '#662d91',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  conversationBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  conversationContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesListContent: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  messageSent: {
    alignSelf: 'flex-end',
    backgroundColor: '#662d91',
  },
  messageReceived: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
    color: '#662d91',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#333',
  },
  messageTextSent: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTimeSent: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  replyContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
    gap: 8,
  },
  replyInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 14,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#662d91',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendForm: {
    flex: 1,
    padding: 16,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  autocompleteContainer: {
    position: 'relative',
    marginBottom: 16,
    zIndex: 1,
  },
  autocompleteInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 4,
    maxHeight: 200,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 1000,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  suggestionRole: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  noSuggestionsText: {
    padding: 12,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  selectedRecipientsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  selectedChip: {
    backgroundColor: '#662d91',
  },
  selectedChipText: {
    color: '#fff',
    fontSize: 12,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  sendFormButton: {
    backgroundColor: '#662d91',
    borderRadius: 12,
    paddingVertical: 4,
  },
  sendFormButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

