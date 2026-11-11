// src/screens/SavedScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { savedArticlesService } from '../services/supabaseService';
import { Post } from '../models/Post';
import { Colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { decodeHtmlEntities } from '../utils/textUtils';
import { RootStackParamList } from '../navigation/RootNavigator';
import { ArticleListSkeleton } from '../components/PageSkeletons';

const formatTitle = (title: string) => decodeHtmlEntities(title);

type SavedScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SavedScreen = () => {
  const navigation = useNavigation<SavedScreenNavigationProp>();
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSaved = useCallback(async () => {
    try {
      const savedArticles = await savedArticlesService.getSavedArticles();
      const posts = savedArticles.map(item => item.article_data).filter(Boolean);
      setSavedPosts(posts);
    } catch (e) {
      console.error('Erreur chargement favoris:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSaved();
    const unsubscribe = navigation.addListener('focus', () => {
      loadSaved();
    });
    return unsubscribe;
  }, [navigation, loadSaved]);

  const handleRemove = async (id: number) => {
    await savedArticlesService.unsaveArticle(id.toString());
    setSavedPosts(prev => prev.filter(p => p.id !== id));
  };

  const handleArticlePress = (article: Post) => {
    navigation.navigate('ArticleDetail', { article });
  };

  const renderSavedPost = ({ item }: { item: Post }) => (
    <TouchableOpacity
      style={styles.postCard}
      onPress={() => handleArticlePress(item)}
      activeOpacity={0.8}
    >
      <Text style={styles.title} numberOfLines={2}>{formatTitle(item.title?.rendered || '')}</Text>
      <TouchableOpacity
        onPress={() => handleRemove(item.id)}
        style={styles.removeButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="trash-outline" size={18} color={Colors.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favoris</Text>
      </View>

      {loading ? (
        <ArticleListSkeleton count={5} />
      ) : savedPosts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="bookmark-outline" size={42} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Aucun article sauvegardé</Text>
          <Text style={styles.emptyText}>
            Enregistrez vos articles préférés pour les retrouver et les lire facilement hors-ligne.
          </Text>
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => navigation.navigate('Main' as any, { screen: 'Accueil' })}
            activeOpacity={0.8}
          >
            <Ionicons name="compass-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.exploreButtonText}>Découvrir des articles</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={savedPosts}
          renderItem={renderSavedPost}
          keyExtractor={(item, idx) => `${item?.id || idx}`}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: Colors.backgroundLight,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 8,
  },
  list: { padding: 16, paddingBottom: 130 },
  postCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: { fontSize: 16, fontWeight: '600', color: Colors.text, flex: 1 },
  removeButton: { padding: 8 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
    paddingBottom: 80,
  },
  emptyIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 25,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default SavedScreen;
