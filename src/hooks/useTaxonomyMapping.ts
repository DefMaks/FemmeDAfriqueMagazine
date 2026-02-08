import { useState, useEffect } from 'react';
import { getCategories, getTagById, getTags } from '../services/api';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
}

export const useTaxonomyMapping = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchedTags, setFetchedTags] = useState<Map<number, Tag>>(new Map());

  useEffect(() => {
    const loadTaxonomies = async () => {
      try {
        setLoading(true);
        
        // Charger les catégories et tags en parallèle
        const [categoriesData, tagsData] = await Promise.all([
          getCategories(),
          getTags()
        ]);

        setCategories(categoriesData || []);
        setTags(tagsData || []);
      } catch (error) {
        console.error('Erreur chargement taxonomies:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTaxonomies();
  }, []);

  // Mapper ID de catégorie vers nom
  const getCategoryName = (categoryId: number): string => {
    const category = categories.find(cat => cat.id === categoryId);
    if (category) {
      // console.log(`Catégorie trouvée: ${categoryId} -> ${category.name}`);
      return category.name;
    }
    // console.log(`Catégorie non trouvée: ${categoryId}`);
    return `Catégorie ${categoryId}`;
  };

  // Mapper ID de tag vers nom
  const getTagName = (tagId: number): string => {
    // Vérifier d'abord dans les tags chargés initialement
    const tag = tags.find(tag => tag.id === tagId);
    if (tag) {
      // console.log(`Tag trouvé: ${tagId} -> ${tag.name}`);
      return tag.name;
    }

    // Vérifier dans les tags récupérés individuellement
    const fetchedTag = fetchedTags.get(tagId);
    if (fetchedTag) {
      // console.log(`Tag trouvé en cache: ${tagId} -> ${fetchedTag.name}`);
      return fetchedTag.name;
    }

    // Si le tag n'est pas trouvé, le récupérer individuellement
    if (!fetchedTags.has(tagId)) {
      // console.log(`Tag non trouvé: ${tagId}, fetch individuel`);
      fetchTagById(tagId);
    }

    return `Tag ${tagId}`;
  };

  // Fonction pour récupérer un tag individuellement et le mettre en cache
  const fetchTagById = async (tagId: number) => {
    try {
      const tagData = await getTagById(tagId);
      if (tagData) {
        // console.log(`Tag récupéré individuellement: ${tagId} -> ${tagData.name}`);
        setFetchedTags(prev => new Map(prev).set(tagId, tagData));
      }
    } catch (error) {
      console.error(`Erreur récupération tag ${tagId}:`, error);
    }
  };

  // Obtenir les détails complets d'une catégorie
  const getCategoryDetails = (categoryId: number): Category | null => {
    return categories.find(cat => cat.id === categoryId) || null;
  };

  // Obtenir les détails complets d'un tag
  const getTagDetails = (tagId: number): Tag | null => {
    // Vérifier d'abord dans les tags chargés initialement
    const tag = tags.find(tag => tag.id === tagId);
    if (tag) return tag;

    // Vérifier dans les tags récupérés individuellement
    return fetchedTags.get(tagId) || null;
  };

  return {
    categories,
    tags,
    loading,
    getCategoryName,
    getTagName,
    getCategoryDetails,
    getTagDetails,
  };
};
