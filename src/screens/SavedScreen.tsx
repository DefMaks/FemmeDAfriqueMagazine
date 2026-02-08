// src/screens/SavedScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getSavedArticles, removeArticle } from '../services/savedArticles';
import { Post } from '../models/Post';
import { Colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { decodeHtmlEntities } from '../utils/textUtils';
import { RootStackParamList } from '../navigation/RootNavigator';

const formatTitle = (title: string) => decodeHtmlEntities(title);


type SavedScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SavedScreen = () => {
  const navigation = useNavigation<SavedScreenNavigationProp>();
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);

  useEffect(() => {
    loadSaved();
  }, []);

  const loadSaved = async () => {
    const posts = await getSavedArticles();
    setSavedPosts(posts);
  };

  const handleRemove = async (id: number) => {
    await removeArticle(id);
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
      <Text style={styles.title} numberOfLines={2}>{formatTitle(item.title.rendered)}</Text>
      <TouchableOpacity
        onPress={() => handleRemove(item.id)}
        style={styles.removeButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="trash-outline" size={18} color={Colors.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (savedPosts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Aucun article sauvegardé</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favoris</Text>
      </View>
      <FlatList
        data={savedPosts}
        renderItem={renderSavedPost}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
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
  list: { paddingBottom: 20 },
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
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#666' },
});

export default SavedScreen;