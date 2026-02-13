import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../theme/colors';
import { getPosts, getPostsByCategory, generateColor, Post } from '../services/api.simple';

const HomeScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [sliderPosts, setSliderPosts] = useState<Post[]>([]);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);

  // IDs des catégories principales (à adapter selon votre WordPress)
  const SLIDER_CATEGORY_ID = 184; // Espace Tendresse
  const RECENT_POSTS_LIMIT = 6;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Charger les articles pour le slider
      const sliderData = await getPostsByCategory(SLIDER_CATEGORY_ID, 5);
      setSliderPosts(sliderData);

      // Charger les articles récents
      const recentData = await getPosts(RECENT_POSTS_LIMIT);
      setRecentPosts(recentData);

    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      setError('Impossible de charger les articles. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleArticlePress = (post: Post) => {
    console.log('Article sélectionné:', post.title.rendered);
    // TODO: Naviguer vers l'écran de détail de l'article
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Chargement des articles...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>⚠️ Erreur</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Femme D'Afrique</Text>
        <Text style={styles.headerSubtitle}>Magazine</Text>
      </View>

      {/* Slider Section */}
      {sliderPosts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>À la une</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.slider}>
            {sliderPosts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.sliderItem}
                onPress={() => handleArticlePress(post)}
              >
                <View style={[styles.sliderImage, { backgroundColor: generateColor(post.id) }]}>
                  <Text style={styles.sliderImageText}>📰</Text>
                </View>
                <View style={styles.sliderOverlay}>
                  <Text style={styles.sliderTitle} numberOfLines={2}>
                    {post.title.rendered}
                  </Text>
                  <Text style={styles.sliderDate}>{formatDate(post.date)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Recent Articles */}
      {recentPosts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Derniers articles</Text>
          {recentPosts.map((post) => (
            <TouchableOpacity
              key={post.id}
              style={styles.articleCard}
              onPress={() => handleArticlePress(post)}
            >
              <View style={[styles.articleImage, { backgroundColor: generateColor(post.id) }]}>
                <Text style={styles.articleImageText}>📰</Text>
              </View>
              <View style={styles.articleContent}>
                <Text style={styles.articleDate}>{formatDate(post.date)}</Text>
                <Text style={styles.articleTitle} numberOfLines={2}>
                  {post.title.rendered}
                </Text>
                <Text style={styles.articleExcerpt} numberOfLines={2}>
                  {post.excerpt.rendered}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Empty State */}
      {sliderPosts.length === 0 && recentPosts.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📰</Text>
          <Text style={styles.emptyTitle}>Aucun article disponible</Text>
          <Text style={styles.emptySubtitle}>
            Revenez plus tard pour découvrir nos derniers contenus
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.background,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.error,
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 15,
  },
  slider: {
    flexDirection: 'row',
  },
  sliderItem: {
    width: 300,
    height: 200,
    marginRight: 15,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sliderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderImageText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sliderOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sliderTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  sliderDate: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.9,
  },
  articleCard: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  articleImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  articleImageText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  articleContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  articleDate: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 5,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 5,
  },
  articleExcerpt: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

export default HomeScreen;
