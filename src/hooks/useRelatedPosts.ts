import { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Post {
  id: number;
  title: { rendered: string };
  _embedded?: {
    'wp:featuredmedia'?: Array<{ source_url: string }>;
  };
  dmks_featured_image?: {
    src: string;
  };
  categories?: number[];
  tags?: number[];
}

export const useRelatedPosts = (currentArticle: Post, maxPosts: number = 3) => {
  const [relatedPosts, setRelatedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fonction pour récupérer les articles similaires avec retry
  const fetchRelatedPostsWithRetry = async (url: string, params: any, retries = 2) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await api.get(url, { params });
        return response;
      } catch (error) {
        console.error(`Tentative ${attempt + 1} échouée:`, error);
        
        if (attempt === retries) {
          throw error;
        }
        
        // Attendre avant de réessayer (backoff exponentiel)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
    throw new Error('Échec après toutes les tentatives');
  };

  // Fonction pour récupérer les articles similaires
  const fetchRelatedPosts = async () => {
    if (!currentArticle) return;
    
    setLoading(true);
    setError(null);

    try {
      // Priorité 1: Articles de la même catégorie principale
      if (currentArticle.categories && currentArticle.categories.length > 0) {
        try {
          const categoryResponse = await fetchRelatedPostsWithRetry('posts', {
            categories: currentArticle.categories[0], // Première catégorie
            per_page: maxPosts,
            exclude: currentArticle.id, // Exclure l'article actuel
            _embed: false // Simplifier pour éviter l'erreur 500
          });
          
          if (categoryResponse.data && categoryResponse.data.length >= maxPosts) {
            setRelatedPosts(categoryResponse.data);
            setLoading(false);
            return;
          }
        } catch (categoryError) {
          console.error('Erreur récupération posts par catégorie:', categoryError);
        }
      }

      // Priorité 2: Articles avec les mêmes tags si pas assez d'articles
      if (currentArticle.tags && currentArticle.tags.length > 0) {
        try {
          const tagResponse = await fetchRelatedPostsWithRetry('posts', {
            tags: currentArticle.tags.slice(0, 2).join(','), // 2 premiers tags
            per_page: maxPosts,
            exclude: currentArticle.id,
            _embed: false // Simplifier pour éviter l'erreur 500
          });
          
          if (tagResponse.data) {
            setRelatedPosts(tagResponse.data);
            setLoading(false);
            return;
          }
        } catch (tagError) {
          console.error('Erreur récupération posts par tags:', tagError);
        }
      }

      // Priorité 3: Articles récents si tout échoue (sans _embed)
      try {
        const recentResponse = await fetchRelatedPostsWithRetry('posts', {
          per_page: maxPosts,
          exclude: currentArticle.id,
          _embed: false // Simplifier pour éviter l'erreur 500
        });
        
        if (recentResponse.data) {
          setRelatedPosts(recentResponse.data);
        }
      } catch (recentError) {
        console.error('Erreur récupération posts récents:', recentError);
        setError('Impossible de charger les articles similaires');
        setRelatedPosts([]);
      }
    } catch (error) {
      console.error('Erreur générale récupération articles similaires:', error);
      setError('Erreur lors du chargement des articles similaires');
      setRelatedPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRelatedPosts();
  }, [currentArticle?.id]);

  return {
    relatedPosts,
    loading,
    error,
    refetch: fetchRelatedPosts
  };
};
