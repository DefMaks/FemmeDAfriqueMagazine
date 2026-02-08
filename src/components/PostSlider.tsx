import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Colors } from '../theme/colors';
import { Post } from '../models/Post';
import { decodeHtmlEntities } from '../utils/textUtils';

const { width } = Dimensions.get('window');
const DEFAULT_SLIDER_WIDTH = width - 40;
const SLIDER_HEIGHT = 290;

interface PostSliderProps {
  posts: Post[];
  onPress: (post: Post) => void;
  autoplay?: boolean;
  fullWidth?: boolean;
  autoplayInterval?: number;
}

export const PostSlider: React.FC<PostSliderProps> = ({
  posts,
  onPress,
  autoplay = false,
  fullWidth = false,
  autoplayInterval = 3000
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const sliderWidth = fullWidth ? width : DEFAULT_SLIDER_WIDTH;

  const getImageUrl = (post: Post) => {
    // Priorité à dmks_featured_image
    if (post.dmks_featured_image?.sizes?.large?.url) {
      return post.dmks_featured_image.sizes.large.url;
    }
    if (post.dmks_featured_image?.sizes?.medium_large?.url) {
      return post.dmks_featured_image.sizes.medium_large.url;
    }
    if (post.dmks_featured_image?.sizes?.medium?.url) {
      return post.dmks_featured_image.sizes.medium.url;
    }
    if (post.dmks_featured_image?.src) {
      return post.dmks_featured_image.src;
    }
    // Fallback vers wp:featuredmedia
    return post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://via.placeholder.com/400x240';
  };

  const stripHtml = (html: string) => {
    return decodeHtmlEntities(html.replace(/<[^>]*>/g, ''));
  };

  useEffect(() => {
    if (autoplay && posts.length > 1) {
      const interval = setInterval(() => {
        const nextIndex = (currentIndex + 1) % posts.length;
        setCurrentIndex(nextIndex);
        scrollViewRef.current?.scrollTo({
          x: nextIndex * (sliderWidth + (fullWidth ? 0 : 20)),
          y: 0,
          animated: true,
        });
      }, autoplayInterval);

      return () => clearInterval(interval);
    }
  }, [autoplay, currentIndex, posts.length, autoplayInterval, sliderWidth, fullWidth]);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={sliderWidth + (fullWidth ? 0 : 20)}
        contentContainerStyle={[
          styles.scrollContent,
          fullWidth ? styles.fullWidthContent : null
        ]}
      >
        {posts.map((post, index) => (
          <TouchableOpacity
            key={`slider_${post.id}_${index}`}
            style={[
              styles.slide,
              fullWidth ? styles.fullWidthSlide : null,
              { width: sliderWidth }
            ]}
            activeOpacity={0.9}
            onPress={() => onPress(post)}
          >
            <Image
              source={{ uri: getImageUrl(post) }}
              style={styles.image}
              resizeMode="cover"
            />
            <View style={styles.gradient}>
              <View style={styles.content}>
                <Text style={styles.title} numberOfLines={2}>
                  {stripHtml(post.title.rendered)}
                </Text>
                <Text style={styles.excerpt} numberOfLines={2}>
                  {stripHtml(post.excerpt.rendered)}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  fullWidthContent: {
    paddingHorizontal: 0,
  },
  slide: {
    width: DEFAULT_SLIDER_WIDTH,
    height: SLIDER_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 20,
    backgroundColor: Colors.backgroundLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fullWidthSlide: {
    marginRight: 0,
    borderRadius: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 26,
  },
  excerpt: {
    fontSize: 14,
    color: '#EEEEEE',
    lineHeight: 20,
  },
});
