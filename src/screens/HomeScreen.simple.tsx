import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../theme/colors';

const HomeScreen = () => {
  const navigation = useNavigation();

  const articles = [
    {
      id: 1,
      title: 'Beauté naturelle : Les secrets des ingrédients africains',
      excerpt: 'Découvrez les trésors de la cosmétique traditionnelle africaine...',
      category: 'Beauté',
      date: '2024-02-10',
      color: '#FF6B9D'
    },
    {
      id: 2,
      title: 'Entrepreneuriat féminin : Inspiration et succès',
      excerpt: 'Portrait de femmes qui transforment le continent africain...',
      category: 'Business',
      date: '2024-02-09',
      color: '#4ECDC4'
    },
    {
      id: 3,
      title: 'Cuisine : Recettes traditionnelles revisitées',
      excerpt: 'Un voyage culinaire à travers les saveurs d\'Afrique...',
      category: 'Gastronomie',
      date: '2024-02-08',
      color: '#FFB347'
    }
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Femme D'Afrique</Text>
        <Text style={styles.headerSubtitle}>Magazine</Text>
      </View>

      {/* Slider Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>À la une</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.slider}>
          {articles.map((article) => (
            <TouchableOpacity
              key={article.id}
              style={styles.sliderItem}
              onPress={() => {
                console.log('Article pressé:', article.title);
              }}
            >
              <View style={[styles.sliderImage, { backgroundColor: article.color }]}>
                <Text style={styles.sliderImageText}>{article.category}</Text>
              </View>
              <View style={styles.sliderOverlay}>
                <Text style={styles.sliderTitle}>{article.title}</Text>
                <Text style={styles.sliderCategory}>{article.category}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Articles Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Derniers articles</Text>
        {articles.map((article) => (
          <TouchableOpacity
            key={article.id}
            style={styles.articleCard}
            onPress={() => {
              console.log('Article pressé:', article.title);
            }}
          >
            <View style={[styles.articleImage, { backgroundColor: article.color }]}>
              <Text style={styles.articleImageText}>{article.category}</Text>
            </View>
            <View style={styles.articleContent}>
              <Text style={styles.articleCategory}>{article.category}</Text>
              <Text style={styles.articleTitle} numberOfLines={2}>
                {article.title}
              </Text>
              <Text style={styles.articleDate}>{article.date}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 15,
  },
  slider: {
    flexDirection: 'row',
  },
  sliderItem: {
    width: 300,
    height: 200,
    marginRight: 15,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sliderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderImageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sliderOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sliderTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  sliderCategory: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.9,
  },
  articleCard: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  articleImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  articleImageText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  articleContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  articleCategory: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 5,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 5,
  },
  articleDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});

export default HomeScreen;
