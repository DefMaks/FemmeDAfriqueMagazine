import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking } from 'react-native';
import { Colors } from '../theme/colors';
import { getAds } from '../services/api';
import { supabase } from '../lib/supabase';

// Interface Unifiée pour le composant
interface AdItem {
  imageUrl: string;
  linkUrl?: string | null;
}

// Type des props du composant
interface AdBannerProps {
  zone?: string;
  provider?: 'wordpress' | 'supabase'; // Optionnel, 'wordpress' par défaut
}

export const AdBanner: React.FC<AdBannerProps> = ({
  zone = 'home',
  provider = 'wordpress',
}) => {
  const [ad, setAd] = useState<AdItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAd();
  }, [zone, provider]);

  const loadAd = async () => {
    setLoading(true);
    try {
      if (provider === 'supabase') {
        await fetchSupabaseAd();
      } else {
        await fetchWordPressAd();
      }
    } catch (error) {
      console.error(`Error loading ad from ${provider}:`, error);
      setAd(null);
    } finally {
      setLoading(false);
    }
  };

  // 1. Récupération des pubs Supabase
  const fetchSupabaseAd = async () => {
    const { data, error } = await supabase
      .from('advertisements')
      .select('*')
      .eq('is_active', true)
      .eq('status', 'en cours')
      .eq('zone', zone)
      .contains('target', ['FDA']); // Filtre Supabase pour vérifier que 'FDA' est dans target[]

    if (error) {
      console.error('Supabase Ad Error:', error);
      return;
    }

    if (data && data.length > 0) {
      // Sélection aléatoire parmi les pubs valides
      const randomAd = data[Math.floor(Math.random() * data.length)];
      setAd({
        imageUrl: randomAd.image_url,
        linkUrl: randomAd.external_link || randomAd.inner_link,
      });
    } else {
      setAd(null);
    }
  };

  // 2. Récupération des pubs WordPress
  const fetchWordPressAd = async () => {
    const ads = await getAds();
    if (ads && ads.length > 0) {
      const filteredAds = zone
        ? ads.filter((item: any) => item.acf?.ad_zone === zone)
        : ads;

      if (filteredAds.length > 0) {
        const randomAd = filteredAds[Math.floor(Math.random() * filteredAds.length)];
        const imageUrl =
          randomAd.acf?.ad_image ||
          randomAd._embedded?.['wp:featuredmedia']?.[0]?.source_url;

        setAd({
          imageUrl,
          linkUrl: randomAd.acf?.ad_link,
        });
      } else {
        setAd(null);
      }
    } else {
      setAd(null);
    }
  };

  const handleAdPress = () => {
    if (ad?.linkUrl) {
      Linking.openURL(ad.linkUrl);
    }
  };

  if (loading || !ad || !ad.imageUrl) {
    return null;
  }

  return (
    <TouchableOpacity style={styles.container} onPress={handleAdPress} activeOpacity={0.8}>
      <Image source={{ uri: ad.imageUrl }} style={styles.image} resizeMode="cover" />
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