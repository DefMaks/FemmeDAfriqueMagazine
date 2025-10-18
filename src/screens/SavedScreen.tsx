import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { savedArticlesService, SavedArticle } from '../services/supabaseService';
import { ArticleCard } from '../components/ArticleCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';

const SavedScreen = () => {
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadSavedArticles();
    }, [])
  );

  const loadSavedArticles = async () => {
    try {
      setError(null);
      const articles = await savedArticlesService.getSavedArticles();
      setSavedArticles(articles);
    } catch (err) {
      setError('Impossible de charger les articles sauvegardés');
      console.error('Error loading saved articles:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSavedArticles();
  };

  const handleArticlePress = (article: SavedArticle) => {
    console.log('Open article:', article.article_data.title.rendered);
  };

  if (loading) {
    return <LoadingSpinner message="Chargement des articles..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadSavedArticles} />;
  }

  if (savedArticles.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Articles Sauvegardés</Text>
        </View>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="bookmark-outline" size={64} color={Colors.textLight} />
          </View>
          <Text style={styles.emptyTitle}>Aucun article sauvegardé</Text>
          <Text style={styles.emptyMessage}>
            Commencez à sauvegarder vos articles préférés pour les retrouver facilement ici
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Articles Sauvegardés</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{savedArticles.length}</Text>
        </View>
      </View>

      <FlatList
        data={savedArticles}
        renderItem={({ item }) => (
          <ArticleCard
            article={item.article_data}
            onPress={() => handleArticlePress(item)}
            variant="horizontal"
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
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
    paddingBottom: 20,
    backgroundColor: Colors.backgroundLight,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  countBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  countText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  list: {
    paddingTop: 16,
    paddingBottom: 100,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default SavedScreen;
