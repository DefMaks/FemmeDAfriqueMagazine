// src/screens/ArticleDetailScreen
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, TouchableOpacity, Share, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Post } from '../models/Post';
import { savedArticlesService } from '../services/supabaseService';
import axios from 'axios';
import { CommentsSection } from '../components/CommentsSection';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import RenderHtml from 'react-native-render-html';
import { WebView } from 'react-native-webview';
import { analyticsService } from '../services/analytics';



const { width } = Dimensions.get('window');
const screenWidth = Dimensions.get('window').width;
const height = Dimensions.get('window').height;

type ArticleDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'ArticleDetail'>;



const ArticleDetailScreen = ({ route, navigation }: ArticleDetailScreenProps) => {
  const { article } = route.params;
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 📊 Track article view
    analyticsService.trackArticleView(
      article.id.toString(),
      article.title.rendered,
      'article_detail'
    );
  }, [article.id, article.title.rendered]);

  const loadComments = async () => {
    // Les commentaires sont maintenant gérés par CommentsSection
    try {
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
      const shareMessage = `${decodeHtmlEntities(article.title.rendered)}

Lire sur Femme d'Afrique : ${article.link}

Téléchargez notre application sur
Playstore: https://bit.ly/461FINi
AppStore : Bientôt disponible`;

      await Share.share({
        message: shareMessage,
        url: article.link,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Fonction de décodage des entités HTML
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
          <Text style={styles.title} selectable>{decodeHtmlEntities(article.title.rendered)}</Text>

          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.metaText}>{formatDate(article.date)}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* <Text style={styles.body}>{stripHtml(article.content.rendered)}</Text> */}
          {/* <View style={styles.body}> */}
          <RenderHtml
            contentWidth={screenWidth - 40}
            source={{ html: article.content.rendered }}
            defaultTextProps={{
              selectable: true, // Activer la sélection de texte
            }}
            baseStyle={{
              fontSize: 17,
              lineHeight: 28,
              color: Colors.text,
            }}
            tagsStyles={{
              img: { maxWidth: screenWidth - 52, borderRadius: 8, marginVertical: 5, overflow: 'hidden' },
              figure: { marginVertical: 10, marginHorizontal: 5, width: screenWidth - 52, height: 'auto' },
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
            }}
            classesStyles={{
              'wp-block-image': { backgroundColor: '#f5f5f5', borderRadius: 8 },
              'MsoNormal': { fontSize: 17, color: Colors.text, lineHeight: 28 },
            }}
          />
          {/* <WebView
            originWhitelist={['*']}
            style={{ height: height - 30, width: width - 40 }}
            source={{ html: article.content.rendered }}
          /> */}
          {/* </View> */}

        </View>

        {/* Section Commentaires */}
        <CommentsSection postId={article.id} />
        
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
    fontSize: 18,
    color: Colors.text,
    lineHeight: 28,
    // paddingHorizontal: 2,

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
