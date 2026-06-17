import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Post } from '../models/Post';
import { ArticleCard } from '../components/ArticleCard';
import { getPostsByTag, getPostsByCategory } from '../services/api';
import { analyticsService } from '../services/analytics.simple';
import { Colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

type TagArticlesRouteProp = RouteProp<RootStackParamList, 'CategoryArticles'>;
type TagArticlesNavigationProp = StackNavigationProp<RootStackParamList, 'CategoryArticles'>;

interface TagArticlesScreenProps {
  route: TagArticlesRouteProp;
  navigation: TagArticlesNavigationProp;
}

export const TagArticlesScreen: React.FC<TagArticlesScreenProps> = ({ route, navigation }) => {
  const { categoryId, categoryName, isTag, fromArticle } = route.params;
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const isTagScreen = isTag === true;
  const fromArticleScreen = fromArticle === true;
  const screenTitle = categoryName || (isTagScreen ? 'Mots-clés' : 'Catégorie');

  // Debug : Afficher les paramètres reçus
  console.log('🏷️ TagArticlesScreen params:', { categoryId, categoryName, isTag, isTagScreen, fromArticle, fromArticleScreen });

  useEffect(() => {
    navigation.setOptions({
      title: screenTitle,
      // Ajouter un bouton retour personnalisé si on vient d'un article
      headerLeft: fromArticleScreen ? () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
      ) : undefined,
    });
  }, [navigation, screenTitle, fromArticleScreen]);

  useEffect(() => {
    loadPosts();
  }, [categoryId, isTagScreen]);

  const loadPosts = async (pageNum = 1) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      }

      // Debug : Afficher quelle fonction va être appelée
      console.log(`📱 loadPosts appelé: isTagScreen=${isTagScreen}, categoryId=${categoryId}, pageNum=${pageNum}`);
      console.log(`🔍 Route params complets:`, route.params);

      // Validation des paramètres
      if (!categoryId) {
        console.error('❌ categoryId est undefined ou null!');
        console.log('📋 Route params disponibles:', Object.keys(route.params));
        return;
      }

      // Utiliser la bonne fonction selon le type (tag ou catégorie)
      let newPosts;
      if (isTagScreen) {
        console.log(`🏷️ Appel de getPostsByTag avec tagId=${categoryId}`);
        newPosts = await getPostsByTag(categoryId, pageNum, 10);
      } else {
        console.log(`📁 Appel de getPostsByCategory avec categoryId=${categoryId}`);
        newPosts = await getPostsByCategory(categoryId, pageNum, 10);
      }

      console.log(`📚 Articles reçus: ${newPosts?.length || 0} articles`);
      console.log(`📋 Premier article:`, newPosts?.[0] ? { id: newPosts[0].id, title: newPosts[0].title?.rendered?.substring(0, 50) } : 'Aucun');

      if (pageNum === 1) {
        setPosts(newPosts || []);
      } else {
        setPosts(prev => [...prev, ...(newPosts || [])]);
      }

      setHasMore(newPosts && newPosts.length === 10);
      setPage(pageNum);

      // 📊 Track tag view
      analyticsService.trackScreenView(isTagScreen ? `Tag: ${categoryName}` : `Category: ${categoryName}`);

    } catch (error: any) {
      console.error('❌ Erreur chargement articles:', error);
      console.error('❌ Stack trace:', error?.stack || 'No stack available');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadPosts(1);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadPosts(page + 1);
    }
  };

  const handleArticlePress = (article: Post) => {
    navigation.navigate('ArticleDetail', { article });
  };

  const renderPost = ({ item }: { item: Post }) => (
    <ArticleCard
      article={item}
      onPress={() => handleArticlePress(item)}
      variant="vertical"
    />
  );

  if (loading && posts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Chargement des articles...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Aucun article trouvé pour {isTagScreen ? 'ce mot-clé' : 'cette catégorie'}
            </Text>
          </View>
        }
        ListFooterComponent={
          loading && posts.length > 0 ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : null
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  list: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  backButton: {
    marginLeft: 8,
    padding: 8,
  },
});
