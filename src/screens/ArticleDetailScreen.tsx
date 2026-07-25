// src/screens/ArticleDetailScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Share,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import RenderHtml from 'react-native-render-html';

import { RootStackParamList } from '../navigation/RootNavigator';
import { Colors } from '../theme/colors';
import { Post } from '../models/Post';
import { savedArticlesService } from '../services/supabaseService';
import { CommentsSection } from '../components/CommentsSection';
import { getAds, api } from '../services/api';
import { analyticsService } from '../services/analytics.simple';
import { useTaxonomyMapping } from '../hooks/useTaxonomyMapping';
import { InlineAdBanner } from '../components/InlineAdBanner';

const { width } = Dimensions.get('window');
const screenWidth = Dimensions.get('window').width;

const allowComments = false;

// Zone ID pour les pubs dans l'écran de lecture
const IN_READ_AD_ZONE_ID = 18751;

type ArticleDetailScreenProps = {
  route?: { params?: { article?: Post } };
  navigation: any;
};

const ArticleDetailScreen = ({ route, navigation }: ArticleDetailScreenProps) => {
  // Sécurisation globale contre les params non transmis
  const article = route?.params?.article;

  const [isSaved, setIsSaved] = useState(false);
  const [authorPostCount, setAuthorPostCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inReadAds, setInReadAds] = useState<any[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const navigationHook = useNavigation<StackNavigationProp<RootStackParamList>>();

  // Hook pour mapper les IDs de catégories et tags vers les noms
  const {
    getCategoryName,
    getTagName,
    getCategoryDetails,
    getTagDetails,
    loading: taxonomyLoading,
  } = useTaxonomyMapping();

  // Fonction pour récupérer le nombre d'articles de l'auteur
  const fetchAuthorPostCount = async (authorId: number) => {
    if (!article) return;
    try {
      if (article._embedded?.author?.[0]?.dmks_post_count) {
        setAuthorPostCount(article._embedded.author[0].dmks_post_count);
        return;
      }

      let retries = 0;
      const maxRetries = 2;
      const baseDelay = 1000;
      const maxDelay = 3000;

      while (retries < maxRetries) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);

          const response = await api.get(`posts`, {
            params: {
              author: authorId,
              per_page: 1,
              _fields: 'id',
            },
            timeout: 3000,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          const totalPosts = response.headers['x-wp-total'];
          setAuthorPostCount(parseInt(totalPosts) || 0);
          console.log("✅ Nombre d'articles auteur récupéré:", totalPosts);
          return;
        } catch (error: any) {
          retries++;
          console.error(`Tentative ${retries} échouée:`, error);

          if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
            console.warn('⏱️ Timeout ou requête abortée, nouvelle tentative...');
          }

          if (retries >= maxRetries) {
            console.error(
              "Erreur récupération nombre d'articles auteur après",
              maxRetries,
              'tentatives, utilisation du fallback'
            );
            setAuthorPostCount(null);
          } else {
            const delay = Math.min(
              baseDelay * Math.pow(2, retries - 1) + Math.random() * 500,
              maxDelay
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }
    } catch (error) {
      console.error("Erreur générale récupération nombre d'articles auteur:", error);
      setAuthorPostCount(null);
    }
  };

  // Fonction pour charger les pubs
  const loadAds = async () => {
    try {
      const adsData = await getAds();
      const filteredAds = adsData.filter(
        (ad: any) => ad.app_ad_zone && ad.app_ad_zone.includes(IN_READ_AD_ZONE_ID)
      );
      setInReadAds(filteredAds);
    } catch (error) {
      console.error('Erreur chargement des pubs:', error);
    }
  };

  // Fonction pour vérifier si l'article est sauvegardé
  const checkIfArticleIsSaved = async () => {
    if (!article?.id) return;
    const saved = await savedArticlesService.isArticleSaved(article.id.toString());
    setIsSaved(saved);
  };

  // Fonction pour incrémenter les articles lus
  const incrementArticlesRead = async () => {
    try {
      const { profileService } = await import('../services/profileService');
      const currentProfile = await profileService.getCurrentProfile();
      if (currentProfile && currentProfile.profile_data) {
        const profileStats = currentProfile.profile_data.stats || {};
        const newArticlesRead = (profileStats.articles_read || 0) + 1;

        await profileService.updatePreferences({
          stats: {
            ...profileStats,
            articles_read: newArticlesRead,
          },
        });

        console.log(`📈 Articles lus: ${newArticlesRead}`);
      }
    } catch (error) {
      console.error('❌ Erreur incrément articles lus:', error);
    }
  };

  useEffect(() => {
    if (!article) return;

    analyticsService.trackArticleView(
      article.id.toString(),
      article.title?.rendered || '',
      // 'article_detail'
    );

    if (article._embedded?.author?.[0]?.id) {
      fetchAuthorPostCount(article._embedded.author[0].id);
    }

    loadAds();
    checkIfArticleIsSaved();
    incrementArticlesRead();
  }, [article, navigation]);

  const toggleSave = async () => {
    if (!article) return;
    setIsLoading(true);
    if (isSaved) {
      await savedArticlesService.unsaveArticle(article.id.toString());
      setIsSaved(false);
    } else {
      await savedArticlesService.saveArticle(article);
      setIsSaved(true);
    }
    setIsLoading(false);
  };

  const handleShare = async () => {
    if (!article) return;
    try {
      const shareMessage = `${decodeHtmlEntities(article.title?.rendered || '')}

Lire sur Femme d'Afrique : ${article.link}

Téléchargez notre application sur
Playstore: https://bit.ly/461FINi
AppStore : Bientôt disponible`;

      await Share.share({
        message: shareMessage,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const decodeHtmlEntities = (text: string): string => {
    if (!text) return '';
    return text
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&#039;/g, "'")
      .replace(/&#8217;/g, "'")
      .replace(/&ldquo;/g, '"')
      .replace(/&rdquo;/g, '"')
      .replace(/&quot;/g, '"')
      .replace(/&eacute;/g, 'é')
      .replace(/&egrave;/g, 'è')
      .replace(/&ecirc;/g, 'ê')
      .replace(/&agrave;/g, 'à')
      .replace(/&acirc;/g, 'â')
      .replace(/&ocirc;/g, 'ô')
      .replace(/&ucirc;/g, 'û')
      .replace(/&ccedil;/g, 'ç')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/&ndash;/g, '–')
      .replace(/&mdash;/g, '—')
      .replace(/&hellip;/g, '…');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleCategoryPress = (categoryId: number) => {
    const categoryDetails = getCategoryDetails(categoryId);
    if (categoryDetails) {
      navigationHook.navigate('CategoryArticles', {
        categoryId,
        categoryName: categoryDetails.name,
      });
    }
  };

  const goBack = () => {
    navigation.goBack();
  };

  const scrollToComments = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  // Écran de repli si aucun article n'est transmis
  if (!article) {
    return (
      <View style={[styles.container, styles.emptyStateContainer]}>
        <Text style={styles.emptyText}>Aucun article sélectionné.</Text>
        <TouchableOpacity style={styles.headerButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, styles.glassmorphismHeader]}>
        <TouchableOpacity style={styles.headerButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          {allowComments && (
            <TouchableOpacity style={styles.headerButton} onPress={scrollToComments}>
              <Ionicons name="chatbubble-outline" size={24} color={Colors.text} />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={24} color={Colors.text} />
          </TouchableOpacity>

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
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} ref={scrollViewRef}>
        {/* Featured Image */}
        {article.dmks_featured_image?.src ? (
          <Image
            source={{ uri: article.dmks_featured_image.src }}
            style={styles.featuredImage}
            resizeMode="cover"
          />
        ) : article._embedded?.['wp:featuredmedia']?.[0]?.source_url ? (
          <Image
            source={{ uri: article._embedded['wp:featuredmedia'][0].source_url }}
            style={styles.featuredImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.featuredImagePlaceholder}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.placeholderLogo}
              resizeMode="contain"
            />
          </View>
        )}

        <View style={styles.content}>
          {/* Catégorie */}
          {article.categories && article.categories.length > 0 && (
            <TouchableOpacity
              onPress={() => handleCategoryPress(article.categories![0])}
              style={styles.categoryContainer}
            >
              <Text style={styles.category}>
                {taxonomyLoading
                  ? 'Chargement...'
                  : getCategoryName(article.categories[0])}
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.title} selectable>
            {decodeHtmlEntities(article.title?.rendered || '')}
          </Text>

          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.metaText}>{formatDate(article.date)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Pub avant le contenu */}
          {inReadAds.length > 0 && (
            <View style={styles.inContentAd}>
              <InlineAdBanner
                ad={inReadAds.length > 1 ? inReadAds[1] : inReadAds[0]}
              />
            </View>
          )}

          {/* Contenu HTML */}
          <RenderHtml
            contentWidth={screenWidth - 40}
            source={{ html: article.content?.rendered || '' }}
            defaultTextProps={{
              selectable: true,
            }}
            baseStyle={{
              fontSize: 17,
              lineHeight: 28,
              color: Colors.text,
            }}
            tagsStyles={{
              img: {
                maxWidth: screenWidth - 52,
                borderRadius: 8,
                marginVertical: 5,
                overflow: 'hidden',
              },
              figure: {
                marginVertical: 10,
                marginHorizontal: 5,
                width: screenWidth - 52,
                height: 'auto',
              },
              p: { marginBottom: 15, marginTop: 5, fontSize: 17, lineHeight: 28 },
              strong: { fontWeight: '700' },
              h1: { fontSize: 24, fontWeight: '700', marginBottom: 10, marginTop: 20 },
              h2: { fontSize: 22, fontWeight: '700', marginBottom: 10, marginTop: 18 },
              h3: { fontSize: 20, fontWeight: '700', marginBottom: 10, marginTop: 16 },
              h4: { fontSize: 18, fontWeight: '700', marginBottom: 10, marginTop: 14 },
              h5: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
              h6: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
              em: { fontStyle: 'italic' },
              a: { color: Colors.primary, textDecorationLine: 'underline' },
              blockquote: {
                borderLeftWidth: 4,
                borderLeftColor: Colors.primary,
                paddingLeft: 16,
                marginVertical: 16,
                fontStyle: 'italic',
                backgroundColor: '#f5f5f5',
                padding: 12,
                borderRadius: 8,
              },
              ul: { marginVertical: 10 },
              ol: { marginVertical: 10 },
              li: { marginBottom: 8 },
              figcaption: {
                fontSize: 14,
                color: Colors.textSecondary,
                textAlign: 'center',
                marginTop: 8,
                marginBottom: 16,
              },
            }}
            classesStyles={{
              'wp-block-image': { backgroundColor: '#f5f5f5', borderRadius: 8 },
              MsoNormal: { fontSize: 17, color: Colors.text, lineHeight: 28 },
              'wp-element-caption': {
                textAlign: 'center',
                fontSize: 13,
                color: Colors.textSecondary,
                marginTop: 8,
                marginBottom: 16,
              },
            }}
          />
        </View>

        {/* Bloc Informations Auteur */}
        <View>
          {article._embedded?.author?.[0] && (
            <>
              <View style={styles.postArticleInfo}>
                <View style={styles.authorBox}>
                  {article._embedded.author[0].mpp_avatar?.[300] ? (
                    <Image
                      source={{ uri: article._embedded.author[0].mpp_avatar[300] }}
                      style={styles.authorAvatar}
                      resizeMode="cover"
                    />
                  ) : null}
                  <View style={styles.authorInfo}>
                    <Text>Par </Text>
                    <Text style={styles.authorName}>
                      {article._embedded.author[0].name}
                    </Text>
                    {article._embedded.author[0].description ? (
                      <Text style={styles.authorDescription}>
                        {article._embedded.author[0].description}
                      </Text>
                    ) : null}
                    <Text style={styles.milestone}>
                      {authorPostCount !== null
                        ? `${authorPostCount} article${authorPostCount > 1 ? 's' : ''}`
                        : 'Non disponible'}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.disclaimer}>
                <Text>Vous avez des réclamations ? Veuillez les signaler ici.</Text>
              </View>
            </>
          )}
        </View>

        {/* Pub après le contenu */}
        {inReadAds.length > 0 && (
          <View style={styles.afterContentAd}>
            <InlineAdBanner
              ad={inReadAds.length > 1 ? inReadAds[1] : inReadAds[0]}
            />
          </View>
        )}

        {/* Mots-clés */}
        {article.tags && article.tags.length > 0 && (
          <View style={styles.keywordsSection}>
            <Text style={styles.keywordsTitle}>Mots-clés</Text>
            <View style={styles.keywordsContainer}>
              {article.tags.map(
                (tagId: number, index: number) =>
                  tagId !== 184 && (
                    <View key={index} style={styles.keywordTag}>
                      <Text style={styles.keywordText}>
                        {taxonomyLoading ? 'Chargement...' : getTagName(tagId)}
                      </Text>
                    </View>
                  )
              )}
            </View>
          </View>
        )}

        {/* Section Commentaires */}
        {allowComments && (
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>Commentaires</Text>
            <CommentsSection postId={article.id} />
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  emptyStateContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  glassmorphismHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  featuredImagePlaceholder: {
    width: width,
    height: width * 0.6,
    backgroundColor: Colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postArticleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 20,
  },
  authorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    borderRadius: 20,
    padding: 12,
  },
  authorAvatar: {
    width: width * 0.23,
    height: width * 0.23,
    borderRadius: (width * 0.23) / 2,
    borderColor: Colors.textSecondary,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 24,
  },
  authorInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  authorDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  milestone: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    fontWeight: '600',
  },
  disclaimer: {
    marginTop: 28,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    flex: 1,
    textAlignVertical: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderLogo: {
    width: width * 0.23,
    height: width * 0.23,
    opacity: 0.3,
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
    marginBottom: 12,
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
    marginBottom: 12,
  },
  commentsSection: {
    marginTop: 32,
    marginBottom: 32,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  commentsTitle: {
    fontSize: 20,
    paddingHorizontal: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  inContentAd: {
    marginHorizontal: -20,
    marginBottom: 16,
  },
  afterContentAd: {
    marginHorizontal: 20,
    marginVertical: 20,
  },
  category: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  categoryContainer: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  keywordsSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.backgroundLight,
    marginVertical: 16,
  },
  keywordsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  keywordTag: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  keywordText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
});

export default ArticleDetailScreen;