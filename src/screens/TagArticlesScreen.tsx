import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { Post } from '../models/Post';
import { ArticleCard } from '../components/ArticleCard';
import { getPostsByTag } from '../services/api';
import { analyticsService } from '../services/analytics';
import { Colors } from '../theme/colors';

type TagArticlesRouteProp = RouteProp<RootStackParamList, 'CategoryArticles'>;
type TagArticlesNavigationProp = StackNavigationProp<RootStackParamList, 'CategoryArticles'>;

interface TagArticlesScreenProps {
  route: TagArticlesRouteProp;
  navigation: TagArticlesNavigationProp;
}

export const TagArticlesScreen: React.FC<TagArticlesScreenProps> = ({ route, navigation }) => {
  const { categoryId, categoryName, isTag } = route.params;
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const isTagScreen = isTag === true;
  const screenTitle = categoryName || (isTagScreen ? 'Mots-clés' : 'Catégorie');

  useEffect(() => {
    navigation.setOptions({
      title: screenTitle,
    });
  }, [navigation, screenTitle]);

  useEffect(() => {
    loadPosts();
  }, [categoryId, isTagScreen]);

  const loadPosts = async (pageNum = 1) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      }

      const newPosts = await getPostsByTag(categoryId, pageNum, 10);

      if (pageNum === 1) {
        setPosts(newPosts || []);
      } else {
        setPosts(prev => [...prev, ...(newPosts || [])]);
      }

      setHasMore(newPosts && newPosts.length === 10);
      setPage(pageNum);

      // 📊 Track tag view
      analyticsService.trackScreenView(isTagScreen ? `Tag: ${categoryName}` : `Category: ${categoryName}`);

    } catch (error) {
      console.error('Erreur chargement articles:', error);
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
});
