import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Colors } from '../theme/colors';

const SavedScreen = () => {
  const savedArticles = [
    {
      id: 1,
      title: 'Beauté naturelle : Les secrets des ingrédients africains',
      excerpt: 'Découvrez les trésors de la cosmétique traditionnelle...',
      image: 'https://via.placeholder.com/400x200/A93F55/FFFFFF?text=Beauté',
      category: 'Beauté',
      date: '2024-02-10',
      readTime: '5 min'
    },
    {
      id: 2,
      title: 'Entrepreneuriat féminin : Inspiration et succès',
      excerpt: 'Portrait de femmes qui transforment le continent...',
      image: 'https://via.placeholder.com/400x200/A93F55/FFFFFF?text=Business',
      category: 'Business',
      date: '2024-02-09',
      readTime: '8 min'
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favoris</Text>
        <Text style={styles.headerSubtitle}>{savedArticles.length} articles sauvegardés</Text>
      </View>

      {savedArticles.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💔</Text>
          <Text style={styles.emptyTitle}>Aucun favori</Text>
          <Text style={styles.emptySubtitle}>
            Les articles que vous sauvegardez apparaîtront ici
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {savedArticles.map((article) => (
            <TouchableOpacity
              key={article.id}
              style={styles.articleCard}
              onPress={() => {
                console.log('Article favori pressé:', article.title);
              }}
            >
              <Image source={{ uri: article.image }} style={styles.articleImage} />
              <View style={styles.articleContent}>
                <Text style={styles.articleCategory}>{article.category}</Text>
                <Text style={styles.articleTitle} numberOfLines={2}>
                  {article.title}
                </Text>
                <View style={styles.articleMeta}>
                  <Text style={styles.articleDate}>{article.date}</Text>
                  <Text style={styles.readTime}>{article.readTime}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => {
                  console.log('Retirer des favoris:', article.title);
                }}
              >
                <Text style={styles.removeIcon}>❌</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
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
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
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
  articleMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  articleDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  readTime: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  removeButton: {
    padding: 5,
  },
  removeIcon: {
    fontSize: 16,
  },
});

export default SavedScreen;
