// src/components/PageSkeletons.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  ViewStyle,
} from 'react-native';
import { Colors } from '../theme/colors';

const { width: screenWidth } = Dimensions.get('window');

interface SkeletonBoxProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle | ViewStyle[];
}

export const SkeletonBox: React.FC<SkeletonBoxProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}) => {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.skeletonBase,
        {
          width: width as any,
          height,
          borderRadius,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
};

/**
 * Carte d'article horizontale en skeleton
 */
export const HorizontalArticleSkeleton: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <View style={[styles.horizontalCard, compact && styles.horizontalCardCompact]}>
    <View style={styles.horizontalTextCol}>
      <SkeletonBox width="35%" height={12} borderRadius={4} style={{ marginBottom: 8 }} />
      <SkeletonBox width="95%" height={15} borderRadius={4} style={{ marginBottom: 6 }} />
      <SkeletonBox width="75%" height={15} borderRadius={4} style={{ marginBottom: 10 }} />
      <SkeletonBox width="40%" height={11} borderRadius={4} />
    </View>
    <SkeletonBox
      width={compact ? 76 : 96}
      height={compact ? 58 : 76}
      borderRadius={10}
    />
  </View>
);

/**
 * Footer skeleton pour le scroll infini (Load More)
 */
export const ArticleFooterSkeleton: React.FC = () => (
  <View style={{ paddingVertical: 8 }}>
    <HorizontalArticleSkeleton compact />
    <HorizontalArticleSkeleton compact />
  </View>
);

/**
 * Liste d'articles en skeleton (Tous les articles, Catégorie, Recherche, Articles lus, Favoris)
 */
export const ArticleListSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <View style={styles.listContainer}>
    {Array.from({ length: count }).map((_, idx) => (
      <HorizontalArticleSkeleton key={`art_skel_${idx}`} />
    ))}
  </View>
);

/**
 * Skeleton complet pour l'écran d'Accueil (HomeScreen)
 */
export const HomeSkeleton: React.FC = () => (
  <View style={styles.screenContainer}>
    <View style={styles.homeHeader}>
      <SkeletonBox width={160} height={42} borderRadius={8} />
    </View>

    <View style={styles.bodyPadding}>
      {/* Slider principal */}
      <SkeletonBox width="100%" height={210} borderRadius={16} style={{ marginBottom: 24 }} />

      {/* Section Derniers articles */}
      <View style={styles.sectionHeaderRow}>
        <SkeletonBox width={150} height={20} borderRadius={6} />
        <SkeletonBox width={65} height={14} borderRadius={4} />
      </View>
      <HorizontalArticleSkeleton />
      <HorizontalArticleSkeleton />
      <HorizontalArticleSkeleton />

      {/* Section horizontale (Espace Tendresse) */}
      <View style={[styles.sectionHeaderRow, { marginTop: 16 }]}>
        <SkeletonBox width={160} height={20} borderRadius={6} />
        <SkeletonBox width={65} height={14} borderRadius={4} />
      </View>
      <View style={styles.horizontalCardsRow}>
        <View style={styles.verticalCardSkeleton}>
          <SkeletonBox width="100%" height={120} borderRadius={12} style={{ marginBottom: 10 }} />
          <SkeletonBox width="90%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
          <SkeletonBox width="65%" height={14} borderRadius={4} />
        </View>
        <View style={styles.verticalCardSkeleton}>
          <SkeletonBox width="100%" height={120} borderRadius={12} style={{ marginBottom: 10 }} />
          <SkeletonBox width="90%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
          <SkeletonBox width="65%" height={14} borderRadius={4} />
        </View>
      </View>
    </View>
  </View>
);

/**
 * Skeleton pour l'écran Découvrir (DiscoverScreen)
 */
export const DiscoverSkeleton: React.FC = () => (
  <View style={styles.screenContainer}>
    <View style={styles.discoverHeader}>
      <SkeletonBox width={140} height={28} borderRadius={6} />
    </View>

    <View style={styles.bodyPadding}>
      {/* Barre de recherche */}
      <SkeletonBox width="100%" height={48} borderRadius={24} style={{ marginBottom: 24 }} />

      {/* Catégories en vedette */}
      <SkeletonBox width={180} height={20} borderRadius={6} style={{ marginBottom: 16 }} />
      {[0, 1, 2].map((i) => (
        <View key={`feat_skel_${i}`} style={{ marginBottom: 18 }}>
          <SkeletonBox width="100%" height={58} borderRadius={12} style={{ marginBottom: 10 }} />
          <View style={styles.horizontalCardsRow}>
            <SkeletonBox width={185} height={56} borderRadius={10} style={{ marginRight: 12 }} />
            <SkeletonBox width={185} height={56} borderRadius={10} />
          </View>
        </View>
      ))}

      {/* Toutes les catégories (Grille 2 colonnes) */}
      <SkeletonBox width={190} height={20} borderRadius={6} style={{ marginTop: 8, marginBottom: 16 }} />
      <View style={styles.grid2Cols}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <SkeletonBox
            key={`cat_grid_skel_${i}`}
            width={(screenWidth - 48) / 2}
            height={78}
            borderRadius={16}
            style={{ marginBottom: 14 }}
          />
        ))}
      </View>
    </View>
  </View>
);

/**
 * Skeleton pour l'écran Boutique (ShopScreen)
 */
export const ShopSkeleton: React.FC = () => (
  <View style={styles.screenContainer}>
    <View style={styles.shopHeader}>
      <SkeletonBox width={150} height={28} borderRadius={6} />
    </View>

    <View style={styles.bodyPadding}>
      {/* TrustBadge skeleton */}
      <SkeletonBox width="100%" height={46} borderRadius={12} style={{ marginBottom: 20 }} />

      {/* Grille 2 colonnes de magazines */}
      <View style={styles.grid2Cols}>
        {[0, 1, 2, 3].map((i) => (
          <View key={`mag_skel_${i}`} style={styles.magazineSkeletonCard}>
            <SkeletonBox width="100%" height={210} borderRadius={10} style={{ marginBottom: 10 }} />
            <SkeletonBox width="50%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
            <SkeletonBox width="40%" height={12} borderRadius={4} style={{ marginBottom: 8 }} />
            <SkeletonBox width="60%" height={16} borderRadius={6} />
          </View>
        ))}
      </View>
    </View>
  </View>
);

/**
 * Skeleton pour l'écran Mes Achats (AchatsScreen)
 */
export const AchatsSkeleton: React.FC = () => (
  <View style={styles.bodyPadding}>
    {/* Carte Abonnement / Promo */}
    <SkeletonBox width="100%" height={92} borderRadius={14} style={{ marginBottom: 24 }} />

    {/* Titre section */}
    <SkeletonBox width={190} height={18} borderRadius={6} style={{ marginBottom: 14 }} />

    {/* Lignes de transactions */}
    {[0, 1, 2, 3].map((i) => (
      <View key={`achat_skel_${i}`} style={styles.transactionSkeletonRow}>
        <SkeletonBox width={42} height={42} borderRadius={10} />
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <SkeletonBox width="75%" height={15} borderRadius={4} style={{ marginBottom: 6 }} />
          <SkeletonBox width="45%" height={12} borderRadius={4} />
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <SkeletonBox width={54} height={15} borderRadius={4} style={{ marginBottom: 6 }} />
          <SkeletonBox width={46} height={16} borderRadius={6} />
        </View>
      </View>
    ))}
  </View>
);

/**
 * Skeleton pour le TrustBadge
 */
export const TrustBadgeSkeleton: React.FC<{ style?: any }> = ({ style }) => (
  <View style={[styles.trustBadgeSkeleton, style]}>
    <SkeletonBox width={20} height={20} borderRadius={10} />
    <SkeletonBox width="75%" height={14} borderRadius={4} style={{ marginLeft: 10 }} />
  </View>
);

const styles = StyleSheet.create({
  skeletonBase: {
    backgroundColor: '#E2E8F0',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  bodyPadding: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  listContainer: {
    paddingVertical: 12,
  },
  homeHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 16,
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
  },
  discoverHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: Colors.backgroundLight,
  },
  shopHeader: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 14,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  horizontalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.backgroundLight,
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  horizontalCardCompact: {
    padding: 10,
    marginBottom: 8,
  },
  horizontalTextCol: {
    flex: 1,
    marginRight: 12,
  },
  horizontalCardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verticalCardSkeleton: {
    width: 190,
    backgroundColor: Colors.backgroundLight,
    borderRadius: 16,
    padding: 10,
    marginRight: 14,
  },
  grid2Cols: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  magazineSkeletonCard: {
    width: (screenWidth - 48) / 2,
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
    alignItems: 'center',
  },
  transactionSkeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  trustBadgeSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
});

