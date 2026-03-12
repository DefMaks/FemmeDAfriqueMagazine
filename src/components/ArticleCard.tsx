import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Platform, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Post } from '../models/Post';
import { savedArticlesService } from '../services/supabaseService';
import { decodeHtmlEntities, getShareMessage } from '../utils/textUtils';

interface ArticleCardProps {
  article: Post;
  onPress: () => void;
  variant?: 'horizontal' | 'vertical' | 'compact';
  showActions?: boolean;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  onPress,
  variant = 'horizontal',
  showActions = true
}) => {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkIfSaved();
  }, [article.id]);

  const checkIfSaved = async () => {
    try {
      const saved = await savedArticlesService.isArticleSaved(article.id.toString());
      setIsSaved(saved);
    } catch (error) {
      // Silencieux
    }
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

  const formatTitle = (title: string) => decodeHtmlEntities(title);

  const getImageUrl = (): string | null => {
    if (article.dmks_featured_image?.sizes?.medium_large?.url) {
      return article.dmks_featured_image.sizes.medium_large.url;
    }
    if (article.dmks_featured_image?.sizes?.large?.url) {
      return article.dmks_featured_image.sizes.large.url;
    }
    if (article.dmks_featured_image?.sizes?.medium?.url) {
      return article.dmks_featured_image.sizes.medium.url;
    }
    if (article.dmks_featured_image?.src) {
      return article.dmks_featured_image.src;
    }
    if (article._embedded?.['wp:featuredmedia']?.[0]?.source_url) {
      return article._embedded['wp:featuredmedia'][0].source_url;
    }
    return null;
  };

  const imageUrl = getImageUrl();

  const toggleSave = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      if (isSaved) {
        await savedArticlesService.unsaveArticle(article.id.toString());
        setIsSaved(false);
      } else {
        await savedArticlesService.saveArticle(article);
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
    }
    setIsLoading(false);
  };

  const handleShare = async () => {
    try {
      const message = getShareMessage(article.title.rendered, article.link);
      await Share.share({
        message,
        ...(Platform.OS === 'ios' && { url: article.link }),
      });
    } catch (error) {
      console.error('Erreur partage:', error);
    }
  };

  // Variant compact (sans actions)
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
          {imageUrl && (
            <Image source={{ uri: imageUrl }} style={styles.compactImage} />
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // Variant vertical (pour les listes horizontales)
  if (variant === 'vertical') {
    return (
      <TouchableOpacity style={styles.verticalCard} activeOpacity={0.8} onPress={onPress}>
        <View style={styles.imageWrapper}>
          {imageUrl && (
            <Image source={{ uri: imageUrl }} style={styles.verticalImage} />
          )}
          {showActions && (
            <View style={styles.actionsOverlay}>
              <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={16} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={toggleSave} disabled={isLoading}>
                <Ionicons
                  name={isSaved ? 'heart' : 'heart-outline'}
                  size={16}
                  color={isSaved ? '#FF4D67' : '#FFF'}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View style={styles.verticalContent}>
          <Text style={styles.verticalTitle} numberOfLines={2}>
            {formatTitle(article.title.rendered)}
          </Text>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={12} color={Colors.textLight} />
            <Text style={styles.metaText}>{formatDate(article.date)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Variant horizontal (par défaut)
  return (
    <TouchableOpacity style={styles.horizontalCard} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.horizontalContent}>
        <View style={styles.textContainer}>
          <Text style={styles.horizontalTitle} numberOfLines={3}>
            {formatTitle(article.title.rendered)}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color={Colors.textLight} />
              <Text style={styles.metaText}>{formatDate(article.date)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.imageWithActions}>
          {imageUrl && (
            <Image source={{ uri: imageUrl }} style={styles.horizontalImage} />
          )}
          {showActions && (
            <View style={styles.horizontalActions}>
              <TouchableOpacity style={styles.smallActionBtn} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={14} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallActionBtn} onPress={toggleSave} disabled={isLoading}>
                <Ionicons
                  name={isSaved ? 'heart' : 'heart-outline'}
                  size={14}
                  color={isSaved ? Colors.primary : '#666'}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Horizontal card
  horizontalCard: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  horizontalContent: {
    flexDirection: 'row',
    padding: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
    justifyContent: 'space-between',
  },
  horizontalTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  imageWithActions: {
    alignItems: 'flex-end',
  },
  horizontalImage: {
    width: 100,
    height: 80,
    borderRadius: 10,
    backgroundColor: Colors.borderLight,
  },
  horizontalActions: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 8,
  },
  smallActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Vertical card
  verticalCard: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  imageWrapper: {
    position: 'relative',
  },
  verticalImage: {
    width: '100%',
    height: 140,
    backgroundColor: Colors.borderLight,
  },
  actionsOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verticalContent: {
    padding: 12,
  },
  verticalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 18,
    marginBottom: 8,
  },
  // Common
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  compactImage: {
    width: 80,
    height: 60,
    borderRadius: 8,
    backgroundColor: Colors.borderLight,
  },
});
