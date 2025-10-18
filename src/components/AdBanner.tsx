import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking } from 'react-native';
import { Colors } from '../theme/colors';
import { getAds } from '../services/api';

interface Ad {
  id: number;
  title: { rendered: string };
  content: { rendered: string };
  acf?: {
    ad_image?: string;
    ad_link?: string;
    ad_zone?: string;
  };
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url: string;
    }>;
  };
}

interface AdBannerProps {
  zone?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ zone = 'home' }) => {
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAd();
  }, []);

  const loadAd = async () => {
    try {
      const ads = await getAds();
      if (ads && ads.length > 0) {
        const filteredAds = zone
          ? ads.filter((ad: Ad) => ad.acf?.ad_zone === zone)
          : ads;

        const randomAd = filteredAds[Math.floor(Math.random() * filteredAds.length)];
        setAd(randomAd);
      }
    } catch (error) {
      console.error('Error loading ad:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdPress = () => {
    const link = ad?.acf?.ad_link;
    if (link) {
      Linking.openURL(link);
    }
  };

  if (loading || !ad) {
    return null;
  }

  const imageUrl = ad.acf?.ad_image || ad._embedded?.['wp:featuredmedia']?.[0]?.source_url;

  return (
    <TouchableOpacity style={styles.container} onPress={handleAdPress} activeOpacity={0.8}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Publicité</Text>
        </View>
      )}
      <View style={styles.badge}>
        <Text style={styles.badgeText}>SPONSORISÉ</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  image: {
    width: '100%',
    height: 120,
  },
  placeholder: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: Colors.textLight,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
