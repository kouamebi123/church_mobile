import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from 'react-native';
import {
  Text,
  Card,
  ActivityIndicator,
  Button,
  Menu,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { apiService } from '../services/apiService';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useSelectedChurch } from '../hooks/useSelectedChurch';
import { useLanguage } from '../contexts/LanguageContext';
import i18nService from '../services/i18nService';
import dayjs from 'dayjs';

interface Event {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  location?: string;
  event_type: string;
  church_id?: string;
  church?: {
    nom: string;
  };
}

export default function CalendarScreen() {
  // Utiliser la langue du contexte pour déclencher les re-renders
  const { language } = useLanguage();
  const { user } = useSelector((state: RootState) => state.auth);
  const { selectedChurch, churches, changeSelectedChurch } = useSelectedChurch();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [churchMenuVisible, setChurchMenuVisible] = useState(false);

  // Obtenir l'ID de l'église à utiliser pour le filtre
  const getFilterChurchId = useCallback(() => {
    if (selectedChurch?.id || selectedChurch?._id) {
      return selectedChurch.id || selectedChurch._id;
    }
    if (user?.eglise_locale) {
      return typeof user.eglise_locale === 'object'
        ? user.eglise_locale.id || user.eglise_locale._id
        : user.eglise_locale;
    }
    return null;
  }, [selectedChurch, user]);

  // Charger les événements
  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        year: currentMonth.getFullYear(),
        view: viewMode,
      };

      if (viewMode === 'month') {
        params.month = currentMonth.getMonth() + 1;
      }

      const filterChurchId = getFilterChurchId();
      if (filterChurchId) {
        params.filter_church_id = filterChurchId;
      }

      const response = await apiService.calendar.getPublicEvents(params);
      const responseData = response.data;

      if (responseData?.success === false) {
        setEvents([]);
      } else {
        const payload = responseData?.data || responseData;
        setEvents(Array.isArray(payload) ? payload : []);
      }
    } catch (error: any) {
      // Ignorer les erreurs réseau silencieusement si ce n'est pas critique
      if (error?.message && !error.message.includes('Network request failed')) {
        console.error('Erreur lors du chargement des événements:', error);
      }
      setEvents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentMonth, viewMode, getFilterChurchId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadEvents();
  }, [loadEvents]);

  // Grouper les événements par date
  const eventsByDate = useMemo(() => {
    return events.reduce((acc: Record<string, Event[]>, event) => {
      const key = new Date(event.start_date).toDateString();
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(event);
      return acc;
    }, {});
  }, [events]);

  // Événements pour la date sélectionnée
  const eventsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return eventsByDate[new Date(selectedDate).toDateString()] || [];
  }, [selectedDate, eventsByDate]);

  // Navigation du mois
  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  // Obtenir les jours du mois
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    
    // Ajouter les jours vides du début
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Ajouter les jours du mois
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const formatDate = (dateString: string) => {
    return dayjs(dateString).format('DD/MM/YYYY');
  };

  const formatTime = (dateString: string) => {
    return dayjs(dateString).format('HH:mm');
  };

  const getEventTypeColor = (eventType: string) => {
    const colors: Record<string, string> = {
      culte: '#662d91',
      reunion: '#9e005d',
      evenement: '#3b1474',
      autre: '#666',
    };
    return colors[eventType] || '#666';
  };

  // Mémoriser les noms des mois pour éviter les re-créations à chaque render
  const monthNames = useMemo(() => [
    i18nService.t('events.months.january'),
    i18nService.t('events.months.february'),
    i18nService.t('events.months.march'),
    i18nService.t('events.months.april'),
    i18nService.t('events.months.may'),
    i18nService.t('events.months.june'),
    i18nService.t('events.months.july'),
    i18nService.t('events.months.august'),
    i18nService.t('events.months.september'),
    i18nService.t('events.months.october'),
    i18nService.t('events.months.november'),
    i18nService.t('events.months.december'),
  ], [language]);

  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  const days = getDaysInMonth(currentMonth);
  const today = new Date();
  const todayString = today.toDateString();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {i18nService.t('navigation.events.view')}
          </Text>
          <View style={styles.headerDivider} />
        </View>

        {/* Filtre d'église pour les admins */}
        {user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && churches.length > 0 && (
          <View style={styles.filterContainer}>
            <Menu
              visible={churchMenuVisible}
              onDismiss={() => setChurchMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setChurchMenuVisible(true)}
                  style={styles.filterButton}
                  contentStyle={styles.filterButtonContent}
                  labelStyle={styles.filterButtonLabel}
                >
                  {selectedChurch?.nom || i18nService.t('events.filterByChurch')}
                </Button>
              }
            >
              <Menu.Item
                onPress={() => {
                  changeSelectedChurch(null);
                  setChurchMenuVisible(false);
                }}
                title={i18nService.t('events.allChurches')}
              />
              {churches.map((church) => (
                <Menu.Item
                  key={church.id || church._id}
                  onPress={() => {
                    changeSelectedChurch((church.id || church._id) ?? null);
                    setChurchMenuVisible(false);
                  }}
                  title={church.nom}
                />
              ))}
            </Menu>
          </View>
        )}

        {/* Navigation du mois */}
        <Card style={styles.navigationCard}>
          <View style={styles.navigationContent}>
            <TouchableOpacity onPress={handlePreviousMonth} style={styles.navButton}>
              <MaterialIcons name="chevron-left" size={28} color="#662d91" />
            </TouchableOpacity>
            
            <View style={styles.monthContainer}>
              <Text style={styles.monthText}>
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </Text>
            </View>
            
            <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
              <MaterialIcons name="chevron-right" size={28} color="#662d91" />
            </TouchableOpacity>
          </View>
          
          <Button
            mode="text"
            onPress={handleToday}
            style={styles.todayButton}
            labelStyle={styles.todayButtonLabel}
          >
            {i18nService.t('events.today')}
          </Button>
        </Card>

        {/* Calendrier mensuel */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#662d91" />
          </View>
        ) : (
          <Card style={styles.calendarCard}>
            <View style={styles.calendarContent}>
              {/* En-têtes des jours */}
              <View style={styles.dayHeaders}>
                {dayNames.map((day) => (
                  <Text key={day} style={styles.dayHeader}>
                    {i18nService.t(`events.daysShort.${day}`)}
                  </Text>
                ))}
              </View>

              {/* Grille du calendrier */}
              <View style={styles.calendarGrid}>
                {days.map((date, index) => {
                  if (!date) {
                    return <View key={`empty-${index}`} style={styles.emptyDay} />;
                  }

                  const dateString = date.toDateString();
                  const dayEvents = eventsByDate[dateString] || [];
                  const isToday = dateString === todayString;
                  const isSelected = dateString === selectedDate.toDateString();

                  return (
                    <TouchableOpacity
                      key={dateString}
                      style={[
                        styles.dayCell,
                        isToday && styles.todayCell,
                        isSelected && styles.selectedCell,
                      ]}
                      onPress={() => setSelectedDate(date)}
                    >
                      <Text
                        style={[
                          styles.dayNumber,
                          isToday && styles.todayNumber,
                          isSelected && styles.selectedNumber,
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                      {dayEvents.length > 0 && (
                        <View style={styles.eventsIndicator}>
                          {dayEvents.slice(0, 3).map((event) => (
                            <View
                              key={event.id}
                              style={[
                                styles.eventDot,
                                { backgroundColor: getEventTypeColor(event.event_type) },
                              ]}
                            />
                          ))}
                          {dayEvents.length > 3 && (
                            <Text style={styles.moreEvents}>+{dayEvents.length - 3}</Text>
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Card>
        )}

        {/* Liste des événements pour la date sélectionnée */}
        <View style={styles.eventsSection}>
          <Text style={styles.eventsSectionTitle}>
            {i18nService.t('events.eventsFor')} {formatDate(selectedDate ? selectedDate.toISOString() : new Date().toISOString())}
          </Text>

          {eventsForSelectedDate.length === 0 ? (
            <Card style={styles.noEventsCard}>
              <Text style={styles.noEventsText}>
                {i18nService.t('events.noEvents')}
              </Text>
            </Card>
          ) : (
            eventsForSelectedDate.map((event) => (
              <TouchableOpacity
                key={event.id}
                onPress={() => setSelectedEvent(event)}
              >
                <Card style={styles.eventCard}>
                  <LinearGradient
                    colors={['#FFFFFF', '#F5F3FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.eventCardGradient}
                  >
                    <View style={styles.eventCardContent}>
                      <View style={styles.eventHeader}>
                        <View
                          style={[
                            styles.eventTypeBadge,
                            { backgroundColor: getEventTypeColor(event.event_type) },
                          ]}
                        >
                          <Text style={styles.eventTypeText}>
                            {i18nService.t(`events.eventTypes.${event.event_type}`)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <View style={styles.eventInfo}>
                        <MaterialIcons name="event" size={16} color="#662d91" />
                        <Text style={styles.eventInfoText}>
                          {formatDate(event.start_date)}
                        </Text>
                      </View>
                      {event.start_date && (
                        <View style={styles.eventInfo}>
                          <MaterialIcons name="access-time" size={16} color="#662d91" />
                          <Text style={styles.eventInfoText}>
                            {formatTime(event.start_date)}
                            {event.end_date ? ` - ${formatTime(event.end_date)}` : ''}
                          </Text>
                        </View>
                      )}
                      {event.location && (
                        <View style={styles.eventInfo}>
                          <MaterialIcons name="location-on" size={16} color="#662d91" />
                          <Text style={styles.eventInfoText}>{event.location}</Text>
                        </View>
                      )}
                      {event.church?.nom && (
                        <View style={styles.eventInfo}>
                          <MaterialIcons name="church" size={16} color="#662d91" />
                          <Text style={styles.eventInfoText}>{event.church.nom}</Text>
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal de détail d'événement */}
      <Modal
        visible={!!selectedEvent}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedEvent(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedEvent(null)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <Card style={styles.modalCard}>
              <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedEvent?.title}</Text>
                <TouchableOpacity onPress={() => setSelectedEvent(null)}>
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              {selectedEvent?.description && (
                <Text style={styles.modalDescription}>{selectedEvent.description}</Text>
              )}
              <View style={styles.modalInfo}>
                <MaterialIcons name="event" size={20} color="#662d91" />
                <Text style={styles.modalInfoText}>
                  {selectedEvent ? formatDate(selectedEvent.start_date) : ''}
                </Text>
              </View>
              {selectedEvent?.start_date && (
                <View style={styles.modalInfo}>
                  <MaterialIcons name="access-time" size={20} color="#662d91" />
                  <Text style={styles.modalInfoText}>
                    {formatTime(selectedEvent.start_date)}
                    {selectedEvent.end_date ? ` - ${formatTime(selectedEvent.end_date)}` : ''}
                  </Text>
                </View>
              )}
              {selectedEvent?.location && (
                <View style={styles.modalInfo}>
                  <MaterialIcons name="location-on" size={20} color="#662d91" />
                  <Text style={styles.modalInfoText}>{selectedEvent.location}</Text>
                </View>
              )}
              {selectedEvent?.church?.nom && (
                <View style={styles.modalInfo}>
                  <MaterialIcons name="church" size={20} color="#662d91" />
                  <Text style={styles.modalInfoText}>{selectedEvent.church.nom}</Text>
                </View>
              )}
              </View>
            </Card>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
    paddingBottom: 12,
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
  },
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterButton: {
    borderColor: '#662d91',
    backgroundColor: '#fff',
  },
  filterButtonContent: {
    paddingVertical: 8,
  },
  filterButtonLabel: {
    color: '#662d91',
    fontSize: 14,
    fontWeight: '600',
  },
  navigationCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    elevation: 4,
  },
  navigationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  navButton: {
    padding: 8,
  },
  monthContainer: {
    flex: 1,
    alignItems: 'center',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#662d91',
  },
  todayButton: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  todayButtonLabel: {
    color: '#662d91',
    fontSize: 14,
  },
  calendarCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'rgba(102, 45, 145, 0.1)',
  },
  calendarContent: {
    padding: 16,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#662d91',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 4,
    backgroundColor: '#fff',
  },
  emptyDay: {
    width: '14.28%',
    aspectRatio: 1,
  },
  todayCell: {
    backgroundColor: '#F5F3FF',
    borderColor: '#662d91',
    borderWidth: 2,
  },
  selectedCell: {
    backgroundColor: '#662d91',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  todayNumber: {
    color: '#662d91',
    fontWeight: '700',
  },
  selectedNumber: {
    color: '#fff',
    fontWeight: '700',
  },
  eventsIndicator: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 2,
    gap: 2,
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  moreEvents: {
    fontSize: 8,
    color: '#666',
    marginLeft: 2,
  },
  eventsSection: {
    padding: 20,
    paddingTop: 0,
  },
  eventsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#662d91',
    marginBottom: 16,
  },
  noEventsCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
  },
  noEventsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  eventCard: {
    marginBottom: 12,
    borderRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(102, 45, 145, 0.1)',
  },
  eventCardGradient: {
    borderRadius: 16,
  },
  eventCardContent: {
    padding: 16,
  },
  eventHeader: {
    marginBottom: 8,
  },
  eventTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  eventTypeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  eventInfoText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 20,
    elevation: 8,
  },
  modalContent: {
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#662d91',
    flex: 1,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  modalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  modalInfoText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
});
