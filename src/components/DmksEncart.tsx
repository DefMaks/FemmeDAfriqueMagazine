// src/components/DmksEncart.tsx
// Composant pour afficher les publicités DefMaks

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../theme/colors';
import { 
  Advertisement, 
  AdZone, 
  getActiveAdvertisements,
  trackAdClick,
  trackAdImpression 
} from '../services/advertisementService';

const { width } = Dimensions.get('window');

interface DmksEncartProps {
  zone: AdZone;
  style?: object;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showIndicators?: boolean;
  height?: number;
}

export const DmksEncart: React.FC<DmksEncartProps> = ({
  zone,
  style,
  autoPlay = true,
  autoPlayInterval = 6000,
  showIndicators = true,
  height = 180,
}) => {
  const navigation = useNavigation<any>();
  const scrollViewRef = useRef<ScrollView>(null);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isUserInteracting, setIsUserInteracting] = useState(false);

  const ENCART_WIDTH = width - 32;

  // Charger les publicités
  useEffect(() => {
    loadAds();
  }, [zone]);

  // Autoplay
  useEffect(() => {
    if (!autoPlay || ads.length <= 1 || isUserInteracting) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % ads.length;
        scrollViewRef.current?.scrollTo({
          x: nextIndex * ENCART_WIDTH,
          animated: true,
        });
        return nextIndex;
      });
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, ads.length, isUserInteracting]);

  // Enregistrer les impressions quand les ads changent
  useEffect(() => {
    if (ads.length > 0 && ads[currentIndex]) {
      trackAdImpression(ads[currentIndex].id);
    }
  }, [currentIndex, ads]);

  const loadAds = async () => {
    try {
      setLoading(true);
      const data = await getActiveAdvertisements(zone);
      setAds(data);
    } catch (error) {
      console.error('Erreur chargement pubs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdPress = async (ad: Advertisement) => {
    // Enregistrer le clic
    await trackAdClick(ad.id);

    // Ouvrir le lien
    if (ad.external_link) {
      Linking.openURL(ad.external_link);
    } else if (ad.inner_link) {
      // Navigation interne (à adapter selon vos routes)
      try {
        const route = ad.inner_link.startsWith('/') ? ad.inner_link.slice(1) : ad.inner_link;
        navigation.navigate(route);
      } catch (e) {
        console.warn('Navigation inner_link échouée:', ad.inner_link);
      }
    }
  };

  const handleScrollBegin = () => {
    setIsUserInteracting(true);
  };

  const handleScrollEnd = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / ENCART_WIDTH);
    setCurrentIndex(newIndex);
    
    setTimeout(() => {
      setIsUserInteracting(false);
    }, 3000);
  };

  // Ne rien afficher si pas de pubs
  if (loading) {
    return (
      <View style={[styles.container, style, { height }]}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }

  if (ads.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={ENCART_WIDTH}
        contentContainerStyle={styles.scrollContent}
        onScrollBeginDrag={handleScrollBegin}
        onMomentumScrollEnd={handleScrollEnd}
      >
        {ads.map((ad, index) => (
          <TouchableOpacity
            key={`ad_${ad.id}_${index}`}
            style={[styles.adCard, { width: ENCART_WIDTH, height }]}
            activeOpacity={0.9}
            onPress={() => handleAdPress(ad)}
          >
            <Image
              source={{ uri: ad.image_url }}
              style={styles.adImage}
              resizeMode="cover"
            />
            
            {/* Badge "Pub" discret */}
            <View style={styles.adBadge}>
              <Text style={styles.adBadgeText}>Pub</Text>
            </View>

            {/* Overlay avec titre si présent */}
            {ad.title && (
              <View style={styles.overlay}>
                <Text style={styles.adTitle} numberOfLines={1}>
                  {ad.title}
                </Text>
                {ad.description && (
                  <Text style={styles.adDescription} numberOfLines={1}>
                    {ad.description}
                  </Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Indicateurs de pagination */}
      {showIndicators && ads.length > 1 && (
        <View style={styles.pagination}>
          {ads.map((_, index) => (
            <View
              key={`adDot_${index}`}
              style={[
                styles.dot,
                index === currentIndex && styles.dotActive
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

// Version simple sans slider (une seule pub)
export const DmksEncartSingle: React.FC<{
  zone: AdZone;
  style?: object;
  height?: number;
}> = ({ zone, style, height = 120 }) => {
  const navigation = useNavigation<any>();
  const [ad, setAd] = useState<Advertisement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAd();
  }, [zone]);

  const loadAd = async () => {
    try {
      const data = await getActiveAdvertisements(zone);
      if (data.length > 0) {
        // Prendre une pub au hasard
        const randomIndex = Math.floor(Math.random() * data.length);
        setAd(data[randomIndex]);
        trackAdImpression(data[randomIndex].id);
      }
    } catch (error) {
      console.error('Erreur chargement pub:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePress = async () => {
    if (!ad) return;
    
    await trackAdClick(ad.id);

    if (ad.external_link) {
      Linking.openURL(ad.external_link);
    } else if (ad.inner_link) {
      try {
        const route = ad.inner_link.startsWith('/') ? ad.inner_link.slice(1) : ad.inner_link;
        navigation.navigate(route);
      } catch (e) {
        console.warn('Navigation échouée:', ad.inner_link);
      }
    }
  };

  if (loading || !ad) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[styles.singleContainer, style, { height }]}
      activeOpacity={0.9}
      onPress={handlePress}
    >
      <Image
        source={{ uri: ad.image_url }}
        style={styles.singleImage}
        resizeMode="cover"
      />
      <View style={styles.adBadge}>
        <Text style={styles.adBadgeText}>Pub</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  adCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  adImage: {
    width: '100%',
    height: '100%',
  },
  adBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  adBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    padding: 12,
  },
  adTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  adDescription: {
    color: '#DDD',
    fontSize: 12,
    marginTop: 2,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: 3,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 16,
  },
  // Single encart styles
  singleContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  singleImage: {
    width: '100%',
    height: '100%',
  },
});

export default DmksEncart;
