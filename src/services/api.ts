// src/services/api.ts
import axios, { AxiosError } from "axios";

// Use environment variable for WordPress API URL
const WORDPRESS_API_URL = process.env.EXPO_PUBLIC_WORDPRESS_API_URL || "https://femmedafrique.net/wp-json/wp/v2/";

// Configuration optimisée
const TIMEOUT = 30000; // 30 secondes
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 seconde initial

// Cache simple en mémoire
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheItem<any>>();

const CACHE_TTL = {
  posts: 2 * 60 * 1000,      // 2 minutes pour les posts
  categories: 10 * 60 * 1000, // 10 minutes pour les catégories
  ads: 5 * 60 * 1000,        // 5 minutes pour les pubs
  magazines: 5 * 60 * 1000,  // 5 minutes pour les magazines
};

// Vérifier si le cache est valide
const getCached = <T>(key: string): T | null => {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < item.ttl) {
    return item.data as T;
  }
  cache.delete(key);
  return null;
};

// Mettre en cache
const setCache = <T>(key: string, data: T, ttl: number): void => {
  cache.set(key, { data, timestamp: Date.now(), ttl });
};

// Vider le cache (utile pour refresh manuel)
export const clearCache = (prefix?: string): void => {
  if (prefix) {
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) cache.delete(key);
    }
  } else {
    cache.clear();
  }
};

const api = axios.create({
  baseURL: WORDPRESS_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: TIMEOUT,
});

// Fonction de retry avec backoff exponentiel
const withRetry = async <T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = RETRY_DELAY
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    const axiosError = error as AxiosError;
    
    // Ne pas retry si c'est une erreur 4xx (sauf timeout)
    if (axiosError.response?.status && axiosError.response.status >= 400 && axiosError.response.status < 500) {
      throw error;
    }
    
    if (retries > 0) {
      // Attendre avec backoff exponentiel
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

// Fonction pour récupérer les articles avec cache et retry
export const getPosts = async (page = 1, perPage = 10) => {
  const cacheKey = `posts_${page}_${perPage}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await withRetry(() => 
      api.get("posts", {
        params: {
          page,
          per_page: perPage,
          _embed: true,
        },
      })
    );
    setCache(cacheKey, response.data, CACHE_TTL.posts);
    return response.data;
  } catch (error) {
    console.error("Erreur récupération articles:", error instanceof AxiosError ? error.message : error);
    // Retourner cache expiré si disponible en cas d'erreur
    const expiredCache = cache.get(cacheKey);
    if (expiredCache) return expiredCache.data;
    throw error;
  }
};

// Fonction pour récupérer un article par ID
export const getPostById = async (id: number) => {
  const cacheKey = `post_${id}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;

  try {
    const response = await withRetry(() =>
      api.get(`posts/${id}`, {
        params: { _embed: true },
      })
    );
    setCache(cacheKey, response.data, CACHE_TTL.posts);
    return response.data;
  } catch (error) {
    console.error("Erreur récupération article:", error instanceof AxiosError ? error.message : error);
    throw error;
  }
};

// Fonction pour récupérer les magazines
export const getMagazines = async (page = 1, perPage = 10) => {
  const cacheKey = `magazines_${page}_${perPage}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await withRetry(() =>
      api.get("mag", {
        params: {
          page,
          per_page: perPage,
          _embed: true,
        },
      })
    );
    setCache(cacheKey, response.data, CACHE_TTL.magazines);
    return response.data;
  } catch (error) {
    console.error("Erreur récupération magazines:", error instanceof AxiosError ? error.message : error);
    const expiredCache = cache.get(cacheKey);
    if (expiredCache) return expiredCache.data;
    throw error;
  }
};

// Fonction pour récupérer un magazine par ID
export const getMagazineById = async (id: number) => {
  const cacheKey = `magazine_${id}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;

  try {
    const response = await withRetry(() =>
      api.get(`mag/${id}`, {
        params: { _embed: true },
      })
    );
    setCache(cacheKey, response.data, CACHE_TTL.magazines);
    return response.data;
  } catch (error) {
    console.error("Erreur récupération magazine:", error instanceof AxiosError ? error.message : error);
    throw error;
  }
};

// Fonction pour récupérer les détails d'un fichier média (PDF)
export const getMedia = async (id: number) => {
  const cacheKey = `media_${id}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;

  try {
    const response = await withRetry(() => api.get(`media/${id}`));
    setCache(cacheKey, response.data, CACHE_TTL.magazines);
    return response.data;
  } catch (error) {
    console.error("Erreur récupération média:", error instanceof AxiosError ? error.message : error);
    throw error;
  }
};

// Fonction pour récupérer les catégories (avec long cache)
export const getCategories = async () => {
  const cacheKey = 'categories_all';
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await withRetry(() =>
      api.get("categories", {
        params: {
          per_page: 100,
          orderby: 'count',
          order: 'desc',
        },
      })
    );
    setCache(cacheKey, response.data, CACHE_TTL.categories);
    return response.data;
  } catch (error) {
    console.error("Erreur récupération catégories:", error instanceof AxiosError ? error.message : error);
    const expiredCache = cache.get(cacheKey);
    if (expiredCache) return expiredCache.data;
    throw error;
  }
};

// Fonction pour récupérer une catégorie par ID
export const getCategoryById = async (id: number) => {
  const cacheKey = `category_${id}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;

  try {
    const response = await withRetry(() => api.get(`categories/${id}`));
    setCache(cacheKey, response.data, CACHE_TTL.categories);
    return response.data;
  } catch (error) {
    console.error("Erreur récupération catégorie:", error instanceof AxiosError ? error.message : error);
    throw error;
  }
};

// Fonction pour récupérer les posts d'une catégorie
export const getPostsByCategory = async (categoryId: number, page = 1, perPage = 10) => {
  const cacheKey = `posts_cat_${categoryId}_${page}_${perPage}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await withRetry(() =>
      api.get("posts", {
        params: {
          categories: categoryId,
          page,
          per_page: perPage,
          _embed: true,
        },
      })
    );
    setCache(cacheKey, response.data, CACHE_TTL.posts);
    return response.data;
  } catch (error) {
    console.error("Erreur récupération posts par catégorie:", error instanceof AxiosError ? error.message : error);
    const expiredCache = cache.get(cacheKey);
    if (expiredCache) return expiredCache.data;
    throw error;
  }
};

// Fonction pour récupérer les posts avec un tag spécifique
export const getPostsByTag = async (tagId: number, page = 1, perPage = 10) => {
  const cacheKey = `posts_tag_${tagId}_${page}_${perPage}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await withRetry(() =>
      api.get("posts", {
        params: {
          tags: tagId,
          page,
          per_page: perPage,
          _embed: true,
        },
      })
    );
    setCache(cacheKey, response.data, CACHE_TTL.posts);
    return response.data;
  } catch (error) {
    console.error("Erreur récupération posts par tag:", error instanceof AxiosError ? error.message : error);
    throw error;
  }
};

// Fonction pour récupérer les ads
export const getAds = async () => {
  const cacheKey = 'ads_all';
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await withRetry(() =>
      api.get("app-ad", {
        params: { per_page: 10 },
      })
    );
    setCache(cacheKey, response.data, CACHE_TTL.ads);
    return response.data;
  } catch (error) {
    console.error("Erreur récupération ads:", error instanceof AxiosError ? error.message : error);
    return [];
  }
};

// Fonction pour récupérer une pub par ID
export const getAdById = async (id: number) => {
  const cacheKey = `ad_${id}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;

  try {
    const response = await withRetry(() => api.get(`app-ad/${id}`));
    setCache(cacheKey, response.data, CACHE_TTL.ads);
    return response.data;
  } catch (error) {
    console.error("Erreur récupération pub:", error instanceof AxiosError ? error.message : error);
    return null;
  }
};

// Fonction pour récupérer les pubs par zone ID
export const getAdsByZoneId = async (zoneId: number) => {
  const cacheKey = `ads_zone_${zoneId}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await withRetry(() =>
      api.get("app-ad", {
        params: {
          app_ad_zone: zoneId,
          per_page: 10,
        },
      })
    );
    setCache(cacheKey, response.data, CACHE_TTL.ads);
    return response.data;
  } catch (error) {
    console.error("Erreur récupération pubs zone:", error instanceof AxiosError ? error.message : error);
    // Retourner cache expiré si disponible
    const expiredCache = cache.get(cacheKey);
    if (expiredCache) return expiredCache.data;
    return [];
  }
};

// Fonction pour récupérer les pubs par zone slug
export const getAdsByZone = async (zoneSlug: string) => {
  const cacheKey = `ads_zone_slug_${zoneSlug}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await withRetry(() =>
      api.get("app-ad", {
        params: { per_page: 10 },
      })
    );
    setCache(cacheKey, response.data, CACHE_TTL.ads);
    return response.data;
  } catch (error) {
    console.error("Erreur récupération pubs zone slug:", error instanceof AxiosError ? error.message : error);
    return [];
  }
};

// Fonction pour récupérer les ad zones
export const getAdZones = async () => {
  const cacheKey = 'ad_zones';
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await withRetry(() => api.get("app_ad_zone"));
    setCache(cacheKey, response.data, CACHE_TTL.ads);
    return response.data;
  } catch (error) {
    console.error("Erreur récupération ad zones:", error instanceof AxiosError ? error.message : error);
    throw error;
  }
};

// Fonction pour rechercher des posts (pas de cache pour la recherche)
export const searchPosts = async (query: string, page = 1, perPage = 10) => {
  try {
    const response = await withRetry(() =>
      api.get("posts", {
        params: {
          search: query,
          page,
          per_page: perPage,
          _embed: true,
        },
      })
    );
    return response.data;
  } catch (error) {
    console.error("Erreur recherche:", error instanceof AxiosError ? error.message : error);
    throw error;
  }
};
