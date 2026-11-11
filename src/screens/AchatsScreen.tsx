// src/screens/AchatsScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { purchaseHistoryService, PurchaseItem } from '../services/purchaseHistoryService';
import { profileService, UserSubscription } from '../services/profileService';
import { AchatsSkeleton } from '../components/PageSkeletons';
import { decodeHtmlEntities } from '../utils/textUtils';

const AchatsScreen = ({ navigation }: any) => {
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [items, currentProfile] = await Promise.all([
        purchaseHistoryService.getUserPurchases(),
        profileService.getCurrentProfile(),
      ]);

      setPurchases(items);
      setSubscription(currentProfile?.subscription || null);
    } catch (e) {
      console.warn('Erreur chargement achats:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const navigateToShop = () => {
    navigation.navigate('Main', { screen: 'Boutique' });
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const renderHeader = () => {
    return (
      <View style={styles.headerSection}>
        {/* Carte d'Abonnement si actif */}
        {subscription?.status === 'active' ? (
          <View style={styles.subscriptionCard}>
            <View style={styles.subscriptionHeader}>
              <View style={styles.starIconContainer}>
                <Ionicons name="star" size={20} color="#D97706" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.subscriptionTitle}>
                  {subscription.plan === 'yearly' ? 'Abonnement Annuel FAM' : 'Abonnement Mensuel FAM'}
                </Text>
                <Text style={styles.subscriptionSubtitle}>Accès illimité à toutes les éditions</Text>
              </View>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>ACTIF</Text>
              </View>
            </View>
            {subscription.ends_at && (
              <View style={styles.subscriptionFooter}>
                <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.subscriptionDates}>
                  Valide jusqu'au {formatDate(subscription.ends_at)}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.promoCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.promoTitle}>Abonnez-vous à FAM</Text>
              <Text style={styles.promoSubtitle}>Accédez à tous les numéros en illimité à partir de 2,50 $ / mois.</Text>
            </View>
            <TouchableOpacity
              style={styles.promoButton}
              onPress={navigateToShop}
              activeOpacity={0.8}
            >
              <Text style={styles.promoButtonText}>S'abonner</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>Historique des transactions</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: PurchaseItem }) => {
    const isMagazine = item.type === 'magazine';
    return (
      <View style={styles.card}>
        <View style={styles.cardIconContainer}>
          <Ionicons
            name={isMagazine ? 'book' : 'star'}
            size={22}
            color={Colors.primary}
          />
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.itemTitle}>{decodeHtmlEntities(item.title)}</Text>
          <Text style={styles.itemDate}>{formatDate(item.purchaseDate)}</Text>
        </View>

        <View style={styles.cardRight}>
          <Text style={styles.itemPrice}>
            {item.amount > 0 ? `${item.amount} ${item.currency}` : 'Inclus'}
          </Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes Achats</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      {loading ? (
        <AchatsSkeleton />
      ) : purchases.length === 0 && !subscription ? (
        <View style={styles.centerContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="cart-outline" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Aucun achat pour le moment</Text>
          <Text style={styles.emptySubtitle}>
            Retrouvez ici vos numéros de magazine achetés ainsi que votre abonnement Femme d'Afrique Magazine.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={navigateToShop}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyButtonText}>Visiter la boutique</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={purchases}
          keyExtractor={(item) => item.id || `purchase_${item.purchaseDate}`}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 18,
    backgroundColor: Colors.backgroundLight,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  headerSection: {
    marginBottom: 16,
  },
  subscriptionCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 20,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subscriptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#92400E',
  },
  subscriptionSubtitle: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  activeBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  subscriptionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  subscriptionDates: {
    fontSize: 12,
    color: '#92400E',
    marginLeft: 6,
  },
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.primary + '25',
  },
  promoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  promoSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    paddingRight: 12,
  },
  promoButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  promoButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: Colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  itemDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  statusPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#15803D',
    textTransform: 'capitalize',
  },
});

export default AchatsScreen;
