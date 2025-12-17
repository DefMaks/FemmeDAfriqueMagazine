import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Post } from '../models/Post';
import { savedArticlesService } from '../services/supabaseService';
import { decodeHtmlEntities } from '../utils/textUtils';

interface ArticleCardProps {
  article: Post;
  onPress: () => void;
  variant?: 'horizontal' | 'vertical' | 'compact';
}

export const ArticleCard: React.FC<ArticleCardProps> = ({ article, onPress, variant = 'horizontal' }) => {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // checkIfSaved();
  }, [article.id]);

  const checkIfSaved = async () => {
    const saved = await savedArticlesService.isArticleSaved(article.id.toString());
    setIsSaved(saved);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'À l\'instant';
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const stripHtml = (html: string) => {
    const text = html.replace(/<[^>]*>/g, '');
    return decodeHtmlEntities(text).substring(0, 100) + '...';
  };

  // Formater le titre
  const formatTitle = (title: string) => decodeHtmlEntities(title);

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

  if (variant === 'compact') {
    return (
      <TouchableOpacity style={styles.horizontalCard} activeOpacity={0.8} onPress={onPress}>
        <View style={styles.horizontalContent}>
          <View style={styles.textContainer}>
            <Text style={styles.horizontalTitle} numberOfLines={2}>
              {formatTitle(article.title.rendered)}
            </Text>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={12} color={Colors.textLight} />
                <Text style={styles.metaText}>{formatDate(article.date)}</Text>
              </View>
            </View>
          </View>
          {article._embedded?.['wp:featuredmedia']?.[0]?.source_url && (
            <Image
              source={{ uri: article.dmks_featured_image.medium_large.url }}
              // source={{ uri: article._embedded['wp:featuredmedia'][0].source_url }}
              style={styles.compactImage}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  }

  if (variant === 'vertical') {
    return (
      <TouchableOpacity style={styles.verticalCard} activeOpacity={0.8} onPress={onPress}>
        {article._embedded?.['wp:featuredmedia']?.[0]?.source_url && (
          <Image
            source={{ uri: article.dmks_featured_image.medium_large.url }}

            // source={{ uri: article._embedded['wp:featuredmedia'][0].source_url }}
            style={styles.verticalImage}
          />
        )}
        <View style={styles.verticalContent}>
          <Text style={styles.verticalTitle} numberOfLines={2}>
            {article.title.rendered}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color={Colors.textLight} />
              <Text style={styles.metaText}>{formatDate(article.date)}</Text>
            </View>
            <TouchableOpacity onPress={toggleSave} disabled={isLoading}>
              <Ionicons
                name={isSaved ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={isSaved ? Colors.primary : Colors.textLight}
              />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.horizontalCard} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.horizontalContent}>
        <View style={styles.textContainer}>
          <Text style={styles.horizontalTitle} numberOfLines={3}>
            {article.title.rendered}
          </Text>
          <Text style={styles.excerpt} numberOfLines={2}>
            {stripHtml(article.excerpt.rendered)}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color={Colors.textLight} />
              <Text style={styles.metaText}>{formatDate(article.date)}</Text>
            </View>
            <TouchableOpacity onPress={toggleSave} disabled={isLoading}>
              <Ionicons
                name={isSaved ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={isSaved ? Colors.primary : Colors.textLight}
              />
            </TouchableOpacity>
          </View>
        </View>
        {article._embedded?.['wp:featuredmedia']?.[0]?.source_url && (
          <Image
            source={{ uri: article._embedded['wp:featuredmedia'][0].source_url }}
            style={styles.horizontalImage}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  horizontalCard: {
    backgroundColor: Colors.backgroundLight,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  horizontalContent: {
    flexDirection: 'row',
    padding: 16,
  },
  textContainer: {
    flex: 1,
    paddingRight: 12,
  },
  horizontalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 22,
    marginBottom: 8,
  },
  excerpt: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  horizontalImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  compactImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  verticalCard: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  verticalImage: {
    width: '100%',
    height: 150,
  },
  verticalContent: {
    padding: 12,
  },
  verticalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: Colors.textLight,
    marginLeft: 4,
  },
});
