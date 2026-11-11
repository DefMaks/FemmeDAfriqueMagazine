import React, { useState, useEffect, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Share, Dimensions, StyleProp, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Post } from '../models/Post';
import { savedArticlesService } from '../services/supabaseService';
import { decodeHtmlEntities, getShareMessage } from '../utils/textUtils';
import { AppImage } from './AppImage';

const { width: screenWidth } = Dimensions.get('window');
const GRID_CARD_WIDTH = (screenWidth - 44) / 2;

interface ArticleCardProps {
  article: Post;
  onPress: () => void;
  variant?: 'horizontal' | 'vertical' | 'compact' | 'grid';
  showActions?: boolean;
  showImage?: boolean;
  titleStyle?: StyleProp<TextStyle>;
}

const ArticleCardComponent: React.FC<ArticleCardProps> = ({
  article,
  onPress,
  variant = 'horizontal',
  showActions = true,
  showImage = true,
  titleStyle,
}) => {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    savedArticlesService.isArticleSaved(article.id.toString()).then((saved) => {
      if (mounted) setIsSaved(saved);
    }).catch(() => {});
    return () => {
      mounted = false;
    };
  }, [article.id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return "À l'instant";
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const formatTitle = (title: string) => decodeHtmlEntities(title || '');

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
      const message = getShareMessage(article.title?.rendered || '', article.link);
      await Share.share({
        message,
        ...(Platform.OS === 'ios' && { url: article.link }),
      });
    } catch (error) {
      console.error('Erreur partage:', error);
    }
  };

  // Variant grid (pour le bloc 2 colonnes x 3 lignes comme Mines)
  if (variant === 'grid') {
    return (
      <TouchableOpacity style={styles.gridCard} activeOpacity={0.85} onPress={onPress}>
        {showImage && (
          <View style={styles.imageWrapper}>
            <AppImage
              source={{ uri: imageUrl || undefined }}
              style={styles.gridImage}
              resizeMode="cover"
              borderRadius={12}
              fallbackIcon="newspaper-outline"
            />
          </View>
        )}
        <View style={[styles.gridContent, !showImage && { paddingTop: 12 }]}>
          <Text style={[styles.gridTitle, titleStyle]} numberOfLines={!showImage ? 3 : 2}>
            {formatTitle(article.title?.rendered || '')}
          </Text>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={11} color={Colors.textLight} />
            <Text style={styles.gridMetaText}>{formatDate(article.date)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Variant compact (comme Derniers articles mais un chouya plus compact)
  if (variant === 'compact') {
    return (
      <TouchableOpacity style={[styles.horizontalCard, styles.compactCard]} activeOpacity={0.8} onPress={onPress}>
        <View style={styles.compactContent}>
          <View style={[styles.textContainer, !showImage && { flex: 1, paddingRight: 0 }]}>
            <Text style={[styles.compactTitle, titleStyle]} numberOfLines={!showImage ? 3 : 2}>
              {formatTitle(article.title?.rendered || '')}
            </Text>
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={11} color={Colors.textLight} />
                <Text style={styles.compactMetaText}>{formatDate(article.date)}</Text>
              </View>
              {showActions && (
                <View style={styles.compactActions}>
                  <TouchableOpacity style={styles.tinyActionBtn} onPress={handleShare}>
                    <Ionicons name="share-social-outline" size={12} color="#666" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.tinyActionBtn} onPress={toggleSave} disabled={isLoading}>
                    <Ionicons
                      name={isSaved ? 'heart' : 'heart-outline'}
                      size={12}
                      color={isSaved ? Colors.primary : '#666'}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
          {showImage && (
            <AppImage
              source={{ uri: imageUrl || undefined }}
              style={styles.compactImage}
              resizeMode="cover"
              borderRadius={10}
              fallbackIcon="newspaper-outline"
            />
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // Variant vertical (pour les listes horizontales)
  if (variant === 'vertical') {
    return (
      <TouchableOpacity
        style={[styles.verticalCard, !showImage && styles.textOnlyVerticalCard]}
        activeOpacity={0.8}
        onPress={onPress}
      >
        {showImage && (
          <View style={styles.imageWrapper}>
            <AppImage
              source={{ uri: imageUrl || undefined }}
              style={styles.verticalImage}
              resizeMode="cover"
              borderRadius={12}
              fallbackIcon="newspaper-outline"
            />
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
        )}
        <View style={[styles.verticalContent, !showImage && styles.textOnlyVerticalContent]}>
          <Text
            style={[
              styles.verticalTitle,
              !showImage && styles.textOnlyVerticalTitle,
              titleStyle,
            ]}
            numberOfLines={!showImage ? 3 : 2}
          >
            {formatTitle(article.title?.rendered || '')}
          </Text>
          <View style={styles.metaRowBetween}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color={Colors.textLight} />
              <Text style={styles.metaText}>{formatDate(article.date)}</Text>
            </View>
            {!showImage && showActions && (
              <View style={styles.compactActions}>
                <TouchableOpacity style={styles.tinyActionBtn} onPress={handleShare}>
                  <Ionicons name="share-social-outline" size={13} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.tinyActionBtn} onPress={toggleSave} disabled={isLoading}>
                  <Ionicons
                    name={isSaved ? 'heart' : 'heart-outline'}
                    size={13}
                    color={isSaved ? Colors.primary : '#666'}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Variant horizontal (par défaut)
  return (
    <TouchableOpacity style={styles.horizontalCard} activeOpacity={0.8} onPress={onPress}>
      <View style={styles.horizontalContent}>
        <View style={[styles.textContainer, !showImage && { flex: 1, paddingRight: 0 }]}>
          <Text style={[styles.horizontalTitle, titleStyle]} numberOfLines={3}>
            {formatTitle(article.title?.rendered || '')}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color={Colors.textLight} />
              <Text style={styles.metaText}>{formatDate(article.date)}</Text>
            </View>
            {!showImage && showActions && (
              <View style={styles.compactActions}>
                <TouchableOpacity style={styles.tinyActionBtn} onPress={handleShare}>
                  <Ionicons name="share-social-outline" size={13} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.tinyActionBtn} onPress={toggleSave} disabled={isLoading}>
                  <Ionicons
                    name={isSaved ? 'heart' : 'heart-outline'}
                    size={13}
                    color={isSaved ? Colors.primary : '#666'}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
        {showImage && (
          <View style={styles.imageWithActions}>
            <AppImage
              source={{ uri: imageUrl || undefined }}
              style={styles.horizontalImage}
              resizeMode="cover"
              borderRadius={12}
              fallbackIcon="newspaper-outline"
            />
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
        )}
      </View>
    </TouchableOpacity>
  );
};

export const ArticleCard = memo(ArticleCardComponent);

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
  // Compact card (for Enfer des femmes, slightly smaller than Derniers articles)
  compactCard: {
    borderRadius: 12,
    marginBottom: 8,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 11,
  },
  compactTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 18,
    marginBottom: 6,
  },
  compactMetaText: {
    fontSize: 11,
    color: Colors.textLight,
    marginLeft: 4,
  },
  compactImage: {
    width: 76,
    height: 58,
    borderRadius: 8,
    backgroundColor: Colors.borderLight,
  },
  compactActions: {
    flexDirection: 'row',
    gap: 6,
  },
  tinyActionBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Grid card (2 columns x 3 rows for Mines)
  gridCard: {
    width: GRID_CARD_WIDTH,
    backgroundColor: Colors.backgroundLight,
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  gridImage: {
    width: '100%',
    height: 105,
    backgroundColor: Colors.borderLight,
  },
  placeholderBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContent: {
    padding: 10,
    justifyContent: 'space-between',
    minHeight: 68,
  },
  gridTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 17,
    marginBottom: 6,
  },
  gridMetaText: {
    fontSize: 11,
    color: Colors.textLight,
    marginLeft: 4,
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
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 16,
    marginBottom: 6,
  },
  textOnlyVerticalCard: {
    minHeight: 100,
    justifyContent: 'space-between',
    padding: 12,
  },
  textOnlyVerticalContent: {
    padding: 0,
    flex: 1,
    justifyContent: 'space-between',
  },
  textOnlyVerticalTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 16,
    marginBottom: 6,
  },
  metaRowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
});
