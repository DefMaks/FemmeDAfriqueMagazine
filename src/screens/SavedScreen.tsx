// src/screens/SavedScreen.tsx
// Écran des articles sauvegardés (favoris) - utilise WordPress API
import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { 
  getFavorites, 
  toggleFavorite,
  ArticleInteraction 
} from '../services/userProfileAPI';
import { getPostById } from '../services/api';
import { Post } from '../models/Post';

interface FavoriteItem extends ArticleInteraction {
  post_data?: Post | null;
  isLoading?: boolean;
}

const SavedScreen = () => {
  const navigation = useNavigation<any>();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Recharger les favoris quand l'écran est focus
  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [])
  );

  const loadFavorites = async () => {
    try {
      setIsLoading(true);
      const favs = await getFavorites();
      
      // Transformer en FavoriteItem
      const favoriteItems: FavoriteItem[] = favs.map((fav: ArticleInteraction | number) => {
        if (typeof fav === 'number') {
          return {
            post_id: fav,
            date: new Date().toISOString(),
            isLoading: true,
          };
        }
        return {
          ...fav,
          isLoading: !fav.title, // Charger les détails si pas de titre
        };
      });
      
      setFavorites(favoriteItems);
      
      // Charger les détails des articles qui n'ont pas de titre
      loadArticleDetails(favoriteItems);
    } catch (error) {
      console.error('Erreur chargement favoris:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadArticleDetails = async (items: FavoriteItem[]) => {
    const itemsToLoad = items.filter(item => item.isLoading || !item.title);
    
    for (const item of itemsToLoad) {
      try {
        const post = await getPostById(item.post_id);
        if (post) {
          setFavorites(prev => prev.map(f => 
            f.post_id === item.post_id 
              ? { 
                  ...f, 
                  title: post.title?.rendered,
                  url: post.link,
                  post_data: post,
                  isLoading: false 
                }
              : f
          ));
        }
      } catch (error) {
        console.log(`Erreur chargement article ${item.post_id}:`, error);
        setFavorites(prev => prev.map(f => 
          f.post_id === item.post_id ? { ...f, isLoading: false } : f
        ));
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  };

  const handleRemove = async (postId: number) => {
    try {
      const result = await toggleFavorite(postId);
      if (result.success && !result.isFavorite) {
        setFavorites(prev => prev.filter(f => f.post_id !== postId));
      }
    } catch (error) {
      console.error('Erreur suppression favori:', error);
    }
  };

  const handleOpenArticle = (item: FavoriteItem) => {
    if (item.post_data) {
      navigation.navigate('ArticleDetail', { article: item.post_data });
    } else if (item.url) {
      // Ouvrir dans le navigateur si pas de données complètes
      // Linking.openURL(item.url);
    }
  };

  // Décoder les entités HTML
  const decodeHtml = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&#039;/g, "'")
      .replace(/&#8217;/g, "'")
      .replace(/&ldquo;/g, '"')
      .replace(/&rdquo;/g, '"')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/&hellip;/g, '…')
      .replace(/<[^>]*>/g, '');
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const renderFavoriteItem = ({ item }: { item: FavoriteItem }) => {
    const imageUrl = item.post_data?._embedded?.['wp:featuredmedia']?.[0]?.source_url;
    
    return (
      <TouchableOpacity 
        style={styles.postCard}
        onPress={() => handleOpenArticle(item)}
        activeOpacity={0.7}
      >
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={styles.thumbnail} />
        )}
        <View style={styles.cardContent}>
          {item.isLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>Chargement...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.title} numberOfLines={2}>
                {decodeHtml(item.title || `Article #${item.post_id}`)}
              </Text>
              {item.date && (
                <Text style={styles.date}>
                  Ajouté le {formatDate(item.date)}
                </Text>
              )}
            </>
          )}
        </View>
        <TouchableOpacity 
          onPress={() => handleRemove(item.post_id)} 
          style={styles.removeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="heart-dislike-outline" size={22} color="#FF4444" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (isLoading && favorites.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingMainText}>Chargement des favoris...</Text>
      </View>
    );
  }

  if (favorites.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="heart-outline" size={80} color="#DDD" />
        <Text style={styles.emptyTitle}>Aucun favori</Text>
        <Text style={styles.emptyText}>
          Les articles que vous aimez apparaîtront ici
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Favoris</Text>
        <Text style={styles.headerCount}>{favorites.length} article{favorites.length > 1 ? 's' : ''}</Text>
      </View>
      
      <FlatList
        data={favorites}
        renderItem={renderFavoriteItem}
        keyExtractor={(item) => `fav_${item.post_id}`}
        contentContainerStyle={styles.list}
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
    paddingBottom: 16,
    backgroundColor: Colors.backgroundLight,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  headerCount: {
    fontSize: 14,
    color: Colors.textSecondary,
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  list: { 
    padding: 16,
    paddingBottom: 100,
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  thumbnail: {
    width: 80,
    height: 80,
    backgroundColor: Colors.borderLight,
  },
  cardContent: {
    flex: 1,
    padding: 12,
  },
  title: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: Colors.text,
    lineHeight: 20,
  },
  date: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    marginLeft: 8,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  removeButton: { 
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingMainText: {
    marginTop: 12,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  emptyText: { 
    fontSize: 15, 
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
});

export default SavedScreen;
