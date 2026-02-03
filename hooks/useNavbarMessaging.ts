/**
 * Hook personnalisé pour gérer la messagerie dans la Navbar mobile
 */
import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/apiService';

interface MessageStats {
  unread_count: number;
  unacknowledged_count?: number;
  urgent_unread_count?: number;
  total_messages?: number;
}

const useNavbarMessaging = (user: any) => {
  const [messageStats, setMessageStats] = useState<MessageStats>({ unread_count: 0 });
  const [messageStatsLoading, setMessageStatsLoading] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);

  // Charger les statistiques de messagerie
  const loadMessageStats = useCallback(async () => {
    setMessageStatsLoading(true);
    try {
      const response = await apiService.messages.getStats();
      const newStats = response.data || { unread_count: 0 };
      // Ne mettre à jour que si les valeurs ont changé
      setMessageStats((prevStats) => {
        if (
          prevStats.unread_count === newStats.unread_count &&
          prevStats.unacknowledged_count === newStats.unacknowledged_count &&
          prevStats.urgent_unread_count === newStats.urgent_unread_count
        ) {
          return prevStats; // Retourner l'ancien objet pour éviter le re-render
        }
        return newStats;
      });
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques de messagerie:', error);
      setMessageStats((prevStats) => {
        if (prevStats.unread_count === 0) {
          return prevStats; // Ne pas mettre à jour si déjà à 0
        }
        return { unread_count: 0 };
      });
    } finally {
      setMessageStatsLoading(false);
    }
  }, []); // Pas de dépendances car on utilise l'API directement

  // Charger les statistiques de messagerie au montage et périodiquement
  useEffect(() => {
    if (!user?.id) return;
    
    loadMessageStats();
    // Recharger toutes les 30 secondes
    const interval = setInterval(loadMessageStats, 30000);
    return () => clearInterval(interval);
    // loadMessageStats est stable (useCallback sans dépendances), donc on peut l'inclure en sécurité
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Utiliser user.id au lieu de user pour éviter les re-renders

  const handleMessageModalOpen = useCallback(() => {
    setMessageModalOpen(true);
  }, []);

  const handleMessageModalClose = useCallback(() => {
    setMessageModalOpen(false);
    // Recharger les statistiques après fermeture du modal
    loadMessageStats();
  }, [loadMessageStats]);

  return {
    messageStats,
    messageStatsLoading,
    messageModalOpen,
    handleMessageModalOpen,
    handleMessageModalClose,
    loadMessageStats,
  };
};

export default useNavbarMessaging;

