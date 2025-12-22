import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Colors } from '../theme/colors';
import { Post } from '../models/Post';
import { decodeHtmlEntities } from '../utils/textUtils';

const { width } = Dimensions.get('window');
const SLIDER_WIDTH = width - 40;
const SLIDER_HEIGHT = 240;

interface PostSliderProps {
  posts: Post[];
  onPress: (post: Post) => void;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

export const PostSlider: React.FC<PostSliderProps> = ({ 
  posts, 
  onPress, 
  autoPlay = true,
  autoPlayInterval = 5000 
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isUserInteracting, setIsUserInteracting] = useState(false);

  // Autoplay effect
  useEffect(() => {
    if (!autoPlay || posts.length <= 1 || isUserInteracting) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % posts.length;
        scrollViewRef.current?.scrollTo({
          x: nextIndex * (SLIDER_WIDTH + 20),
          animated: true,
        });
        return nextIndex;
      });
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, posts.length, isUserInteracting]);

  const handleScrollBegin = () => {
    setIsUserInteracting(true);
  };

  const handleScrollEnd = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / (SLIDER_WIDTH + 20));
    setCurrentIndex(newIndex);
    
    // Reprendre l'autoplay après 3 secondes d'inactivité
    setTimeout(() => {
      setIsUserInteracting(false);
    }, 3000);
  };

  const getImageUrl = (post: Post) => {
    return post._embedded?.['wp:featuredmedia']?.[0]?.source_url || 'https://via.placeholder.com/400x240';
  };

  const stripHtml = (html: string) => {
    return decodeHtmlEntities(html.replace(/<[^>]*>/g, ''));
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={SLIDER_WIDTH + 20}
        contentContainerStyle={styles.scrollContent}
        onScrollBeginDrag={handleScrollBegin}
        onMomentumScrollEnd={handleScrollEnd}
      >
        {posts.map((post, index) => (
          <TouchableOpacity
            key={`slider_${post.id}_${index}`}
            style={styles.slide}
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
      
      {/* Indicateurs de pagination */}
      {posts.length > 1 && (
        <View style={styles.pagination}>
          {posts.map((_, index) => (
            <View
              key={`dot_${index}`}
              style={[
                styles.dot,
                index === currentIndex && styles.dotActive
              ]}
            />
          ))}
        </View>
      )}
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
  slide: {
    width: SLIDER_WIDTH,
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
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 24,
  },
});
