// src/screens/ArticleDetailScreen
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, TouchableOpacity, Share, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Post } from '../models/Post';
import { savedArticlesService } from '../services/supabaseService';
import axios from 'axios';
import { CommentsList } from '../components/CommentsList';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';

const { width } = Dimensions.get('window');

type ArticleDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'ArticleDetail'>;



const ArticleDetailScreen = ({ route, navigation }: ArticleDetailScreenProps) => {
  const { article } = route.params;
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);

  useEffect(() => {
    checkIfSaved();
    loadComments();
  }, []);

  const loadComments = async () => {
    try {
      const response = await axios.get(
        `https://femmedafrique.net/wp-json/wp/v2/comments?post=${article.id}`
      );
      setComments(response.data);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const checkIfSaved = async () => {
    const saved = await savedArticlesService.isArticleSaved(article.id.toString());
    setIsSaved(saved);
  };

  const toggleSave = async () => {
    setIsLoading(true);
    if (isSaved) {
      const success = await savedArticlesService.unsaveArticle(article.id.toString());
      if (success) setIsSaved(false);
    } else {
      const success = await savedArticlesService.saveArticle(article);
      if (success) setIsSaved(true);
    }
    setIsLoading(false);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${article.title.rendered}\n\nLire sur Femme d'Afrique : ${article.link}`,
        url: article.link,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={toggleSave}
            disabled={isLoading}
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={isSaved ? Colors.primary : Colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {article._embedded?.['wp:featuredmedia']?.[0]?.source_url && (
          <Image
            source={{ uri: article._embedded['wp:featuredmedia'][0].source_url }}
            style={styles.featuredImage}
          />
        )}

        <View style={styles.content}>
          <Text style={styles.title}>{article.title.rendered}</Text>

          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.metaText}>{formatDate(article.date)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.body}>{stripHtml(article.content.rendered)}</Text>

          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>Commentaires ({comments.length})</Text>
            {loadingComments ? (
              <Text style={styles.loadingText}>Chargement des commentaires...</Text>
            ) : (
              <CommentsList comments={comments} />
            )}
          </View>
        </View>
      </ScrollView>
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
    paddingHorizontal: 12,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: Colors.backgroundLight,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  featuredImage: {
    width: width,
    height: width * 0.6,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 34,
    marginBottom: 16,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 6,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: 20,
  },
  body: {
    fontSize: 17,
    color: Colors.text,
    lineHeight: 28,
  },
  commentsSection: {
    marginTop: 32,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  commentsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    padding: 20,
  },
});

export default ArticleDetailScreen;
