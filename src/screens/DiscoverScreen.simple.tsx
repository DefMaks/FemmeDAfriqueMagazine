import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Colors } from '../theme/colors';

const DiscoverScreen = () => {
  const categories = [
    { id: 1, name: 'Beauté', icon: '💄', color: '#FF6B9D' },
    { id: 2, name: 'Business', icon: '💼', color: '#4ECDC4' },
    { id: 3, name: 'Gastronomie', icon: '🍽️', color: '#FFB347' },
    { id: 4, name: 'Mode', icon: '👗', color: '#B19CD9' },
    { id: 5, name: 'Santé', icon: '🏥', color: '#87CEEB' },
    { id: 6, name: 'Éducation', icon: '📚', color: '#98D8C8' },
  ];

  const tags = [
    { id: 1, name: 'Tendresse', count: 45 },
    { id: 2, name: 'Entrepreneuriat', count: 32 },
    { id: 3, name: 'Inspiration', count: 28 },
    { id: 4, name: 'Culture', count: 51 },
    { id: 5, name: 'Lifestyle', count: 37 },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Découvrir</Text>
        <Text style={styles.headerSubtitle}>Explorez nos contenus</Text>
      </View>

      {/* Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Catégories</Text>
        <View style={styles.categoriesGrid}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[styles.categoryCard, { backgroundColor: category.color }]}
              onPress={() => {
                console.log('Catégorie sélectionnée:', category.name);
              }}
            >
              <Text style={styles.categoryIcon}>{category.icon}</Text>
              <Text style={styles.categoryName}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tags */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tags populaires</Text>
        <View style={styles.tagsContainer}>
          {tags.map((tag) => (
            <TouchableOpacity
              key={tag.id}
              style={styles.tagCard}
              onPress={() => {
                console.log('Tag sélectionné:', tag.name);
              }}
            >
              <Text style={styles.tagName}>{tag.name}</Text>
              <Text style={styles.tagCount}>{tag.count} articles</Text>
            </TouchableOpacity>
          ))}
        </View>
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
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagCard: {
    backgroundColor: Colors.backgroundLight,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  tagCount: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});

export default DiscoverScreen;
