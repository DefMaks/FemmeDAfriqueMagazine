import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Colors } from '../theme/colors';
import { getCategories, getTags, generateColor, Category, Tag } from '../services/api.simple';

const DiscoverScreen = () => {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Charger les catégories et tags en parallèle
      const [categoriesData, tagsData] = await Promise.all([
        getCategories(),
        getTags()
      ]);

      setCategories(categoriesData.slice(0, 6)); // Limiter à 6 catégories principales
      setTags(tagsData.slice(0, 10)); // Limiter à 10 tags populaires

    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      setError('Impossible de charger les catégories et tags. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCategoryPress = (category: Category) => {
    console.log('Catégorie sélectionnée:', category.name);
    // TODO: Naviguer vers l'écran de la catégorie
  };

  const handleTagPress = (tag: Tag) => {
    console.log('Tag sélectionné:', tag.name);
    // TODO: Naviguer vers l'écran du tag
  };

  const getCategoryIcon = (name: string): string => {
    const icons: { [key: string]: string } = {
      'beauté': '💄',
      'business': '💼',
      'gastronomie': '🍽️',
      'mode': '👗',
      'santé': '🏥',
      'éducation': '📚',
      'lifestyle': '🌟',
      'culture': '🎭',
      'tendresse': '💕',
      'entrepreneuriat': '🚀',
    };
    
    const lowerName = name.toLowerCase();
    for (const [key, icon] of Object.entries(icons)) {
      if (lowerName.includes(key)) {
        return icon;
      }
    }
    return '📂';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Chargement des catégories...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>⚠️ Erreur</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Découvrir</Text>
        <Text style={styles.headerSubtitle}>Explorez nos contenus</Text>
      </View>

      {/* Categories */}
      {categories.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Catégories</Text>
          <View style={styles.categoriesGrid}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[styles.categoryCard, { backgroundColor: generateColor(category.id) }]}
                onPress={() => handleCategoryPress(category)}
              >
                <Text style={styles.categoryIcon}>{getCategoryIcon(category.name)}</Text>
                <Text style={styles.categoryName} numberOfLines={1}>
                  {category.name}
                </Text>
                <Text style={styles.categoryCount}>{category.count} articles</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags populaires</Text>
          <View style={styles.tagsContainer}>
            {tags.map((tag) => (
              <TouchableOpacity
                key={tag.id}
                style={styles.tagCard}
                onPress={() => handleTagPress(tag)}
              >
                <Text style={styles.tagName}>#{tag.name}</Text>
                <Text style={styles.tagCount}>{tag.count}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Empty State */}
      {categories.length === 0 && tags.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>Aucune catégorie disponible</Text>
          <Text style={styles.emptySubtitle}>
            Revenez plus tard pour découvrir nos contenus
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.background,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.error,
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
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
    marginBottom: 5,
  },
  categoryCount: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
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
    alignItems: 'center',
  },
  tagName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  tagCount: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyContainer: {
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
});

export default DiscoverScreen;
