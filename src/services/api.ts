// src/services/api.ts
import { WORDPRESS_CONFIG } from '../config/env';

// Use environment variable for WordPress API URL
const WORDPRESS_API_URL = WORDPRESS_CONFIG.apiUrl || "https://femmedafrique.net/wp-json/wp/v2/";

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
  categories: 60 * 60 * 1000, // 1 HEURE pour les catégories (était 10min)
  ads: 5 * 60 * 1000,        // 5 minutes pour les pubs
  magazines: 30 * 60 * 1000,  // 30 minutes pour les magazines (était 5min)
  media: 60 * 60 * 1000,     // 1 HEURE pour les médias (PDF/images)
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

// Fonction de retry avec backoff exponentiel
const withRetry = async <T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = RETRY_DELAY
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      // Attendre avec backoff exponentiel
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

/**
 * Fonctions ajoutées pour restaurer la compatibilité avec les écrans existants
 */

// Récupérer une publicité par ID
export const getAdById = async (id: number) => {
  try {
    const url = `${WORDPRESS_API_URL}app-ad/${id}?_embed=true`;
    return await withRetry(() => apiRequest(url));
  } catch (error) {
    console.error("Erreur récupération ad by ID:", error);
    return null;
  }
};

// Récupérer toutes les publicités
export const getAds = async () => {
  try {
    const url = `${WORDPRESS_API_URL}app-ad?per_page=50&_embed=true`;
    return await withRetry(() => apiRequest(url));
  } catch (error) {
    console.error("Erreur récupération ads:", error);
    return [];
  }
};

// Récupérer les publicités par Zone ID
export const getAdsByZoneId = async (zoneId: number) => {
  try {
    const url = `${WORDPRESS_API_URL}app-ad?app_ad_zone=${zoneId}&per_page=50&_embed=true`;
    return await withRetry(() => apiRequest(url));
  } catch (error) {
    console.error("Erreur récupération ads by zone:", error);
    return [];
  }
};

// Récupérer un tag par son ID
export const getTagById = async (id: number) => {
  try {
    const url = `${WORDPRESS_API_URL}tags/${id}`;
    return await withRetry(() => apiRequest(url));
  } catch (error) {
    console.error("Erreur récupération tag:", error);
    throw error;
  }
};

// Récupérer un média par son ID
export const getMedia = async (id: number) => {
  try {
    const url = `${WORDPRESS_API_URL}media/${id}`;
    return await withRetry(() => apiRequest(url));
  } catch (error) {
    console.error("Erreur récupération media:", error);
    throw error;
  }
};

// Instance compatible Axios pour les appels legacy
export const api = {
  get: async (endpoint: string, config: any = {}) => {
    let url = endpoint.startsWith('http') ? endpoint : `${WORDPRESS_API_URL}${endpoint}`;

    if (config.params) {
      const params = new URLSearchParams();
      Object.entries(config.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
      const queryString = params.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout || 30000);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      // Simuler l'objet de réponse Axios
      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        config,
        request: {},
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
};

// Fonction fetch avec timeout et retry
const API_TIMEOUT = 8000; // 8 secondes (était probablement 10s+)

const apiRequest = async (url: string, options: RequestInit = {}): Promise<any> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FemmeDAfrique-App/1.0',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.error(`⏰ Timeout API: ${url} (8s)`);
      throw new Error('La connexion est trop lente. Veuillez réessayer.');
    }
    
    console.error(`❌ Erreur API: ${url}`, error);
    throw error;
  }
};

// Fonction pour récupérer les magazines (avec cache)
export const getMagazines = async (page = 1, perPage = 10) => {
  const cacheKey = `magazines_${page}_${perPage}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${WORDPRESS_API_URL}mag?page=${page}&per_page=${perPage}&_embed=true`;
    const response = await withRetry(() => apiRequest(url));
    setCache(cacheKey, response, CACHE_TTL.magazines);
    return response;
  } catch (error) {
    console.error("Erreur récupération magazines:", error);
    const expiredCache = cache.get(cacheKey);
    if (expiredCache) return expiredCache.data;
    throw error;
  }
};

// Fonction pour récupérer les articles avec cache et retry
export const getPosts = async (page = 1, perPage = 10) => {
  const cacheKey = `posts_${page}_${perPage}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${WORDPRESS_API_URL}posts?page=${page}&per_page=${perPage}&_embed=true`;
    const response = await withRetry(() => apiRequest(url));
    setCache(cacheKey, response, CACHE_TTL.posts);
    return response;
  } catch (error) {
    console.error("Erreur récupération articles:", error);
    // Retourner cache expiré si disponible en cas d'erreur
    const expiredCache = cache.get(cacheKey);
  const cacheKey = `magazines_${page}_${perPage}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${WORDPRESS_API_URL}mag?page=${page}&per_page=${perPage}&_embed=true`;
    const response = await withRetry(() => apiRequest(url));
    setCache(cacheKey, response, CACHE_TTL.magazines);
    return response;
  } catch (error) {
    console.error("Erreur récupération magazines:", error);
    const expiredCache = cache.get(cacheKey);
    if (expiredCache) return expiredCache.data;
    throw error;
  }
};

// Fonction pour récupérer les catégories (avec localStorage persistant)
export const getCategories = async () => {
  const cacheKey = 'categories_all';
  const localStorageKey = 'categories_persistent';
  
  // Essayer localStorage d'abord (plus persistant)
  try {
    const stored = localStorage.getItem(localStorageKey);
    if (stored) {
      const data = JSON.parse(stored);
      console.log('📂 Catégories chargées depuis localStorage');
      return data;
    }
  } catch (error) {
    console.log('📂 localStorage non disponible, utilisation du cache');
  }
  
  // Essayer le cache mémoire
  const cached = getCached<any[]>(cacheKey);
  if (cached) {
    console.log('📂 Catégories chargées depuis le cache mémoire');
    return cached;
  }

  // Récupérer depuis l'API
  try {
    const response = await withRetry(() => apiRequest(`${WORDPRESS_API_URL}categories?per_page=100`));
    setCache(cacheKey, response, CACHE_TTL.categories);
    
    // Sauvegarder dans localStorage pour persistance
    try {
      localStorage.setItem(localStorageKey, JSON.stringify(response));
      console.log('💾 Catégories sauvegardées dans localStorage');
    } catch (error) {
      console.log('⚠️ Impossible de sauvegarder dans localStorage');
    }
    
    return response;
  } catch (error) {
    console.error("Erreur récupération catégories:", error);
    
    // Essayer le cache expiré en dernier recours
    const expiredCache = cache.get(cacheKey);
    if (expiredCache) {
      console.log('🔄 Utilisation du cache expiré comme fallback');
      return expiredCache.data;
    }
    
    throw error;
  }
};

// Fonction pour récupérer les tags
export const getTags = async () => {
  const cacheKey = 'tags_all';
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${WORDPRESS_API_URL}tags?per_page=100&orderby=count&order=desc`;
    const response = await withRetry(() => apiRequest(url));
    setCache(cacheKey, response, CACHE_TTL.categories);
    return response;
  } catch (error) {
    console.error("Erreur récupération tags:", error);
    const expiredCache = cache.get(cacheKey);
    if (expiredCache) return expiredCache.data;
    throw error;
  }
};

// Fonction pour récupérer les posts d'une catégorie
export const getPostsByCategory = async (categoryId: number, page = 1, perPage = 10) => {
  const cacheKey = `posts_cat_${categoryId}_${page}_${perPage}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${WORDPRESS_API_URL}posts?categories=${categoryId}&page=${page}&per_page=${perPage}&_embed=true`;
    const response = await withRetry(() => apiRequest(url));
    setCache(cacheKey, response, CACHE_TTL.posts);
    return response;
  } catch (error) {
    console.error("Erreur récupération posts par catégorie:", error);
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
    const url = `${WORDPRESS_API_URL}posts?tags=${tagId}&page=${page}&per_page=${perPage}&_embed=true`;
    const response = await withRetry(() => apiRequest(url));
    setCache(cacheKey, response, CACHE_TTL.posts);
    return response;
  } catch (error) {
    console.error("Erreur récupération posts par tag:", error);
    throw error;
  }
};

// Fonction pour rechercher des posts (pas de cache pour la recherche)
export const searchPosts = async (query: string, page = 1, perPage = 10) => {
  try {
    const url = `${WORDPRESS_API_URL}posts?search=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&_embed=true`;
    const response = await withRetry(() => apiRequest(url));
    return response;
  } catch (error) {
    console.error("Erreur recherche:", error);
    throw error;
  }
};
