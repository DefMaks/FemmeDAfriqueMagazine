// src/services/api.ts
import { WORDPRESS_CONFIG } from '../config/env';
import { offlineService } from './offlineService';
import { networkService } from './networkService';
import { optimizedApiService } from './optimizedApiService';

// Use environment variable for WordPress API URL
const WORDPRESS_API_URL = WORDPRESS_CONFIG.apiUrl || "https://femmedafrique.net/wp-json/wp/v2/";

// Configuration optimisée
const TIMEOUT = 30000; // 30 secondes (réduit pour éviter les timeouts)
const MAX_RETRIES = 2; // Réduit pour éviter les longs cycles
const RETRY_DELAY = 1500; // 1.5 secondes initial
const BACKOFF_MULTIPLIER = 1.5; // Multiplier pour backoff exponentiel

// Cache simple en mémoire
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheItem<any>>();

const CACHE_TTL = {
  posts: 10 * 60 * 1000,     // 10 minutes pour les posts
  posts_critical: 30 * 60 * 1000, // 30 minutes pour les catégories critiques (Entrepreneuriat, Gastronomie)
  categories: 60 * 60 * 1000, // 1 HEURE pour les catégories
  ads: 5 * 60 * 1000,        // 5 minutes pour les pubs
  magazines: 30 * 60 * 1000,  // 30 minutes pour les magazines
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
  retries: number = MAX_RETRIES, 
  delay: number = RETRY_DELAY
): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && shouldRetry(error)) {
      // Ajouter du jitter pour éviter les thundering herd
      const jitter = Math.random() * 0.5; // 0-50% de variation
      const backoffDelay = delay * Math.pow(BACKOFF_MULTIPLIER, MAX_RETRIES - retries) * (1 + jitter);
      
      console.warn(`⏱️ Timeout ou requête abortée, nouvelle tentative dans ${Math.round(backoffDelay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      return withRetry(fn, retries - 1, delay * BACKOFF_MULTIPLIER);
    }
    throw error;
  }
};

const shouldRetry = (error: any): boolean => {
  return error.name === 'AbortError' || 
         error.message?.includes('timeout') || 
         error.message?.includes('aborted') ||
         (error.status >= 500 && error.status < 600);
};

// Fonctions optimisées utilisant le nouveau service
export const getArticles = async (params?: {
  page?: number;
  per_page?: number;
  category?: number;
  search?: string;
  embed?: boolean;
}) => {
  try {
    return await optimizedApiService.getArticles(params);
  } catch (error) {
    console.warn('⚠️ Optimized API failed, falling back to legacy API');
    return getArticlesLegacy(params);
  }
};

export const getArticle = async (id: number, embed: boolean = true) => {
  try {
    return await optimizedApiService.getArticle(id, embed);
  } catch (error) {
    console.warn('⚠️ Optimized API failed, falling back to legacy API');
    return getArticleLegacy(id, embed);
  }
};


// Fonctions legacy (fallback)
const getArticlesLegacy = async (params?: {
  page?: number;
  per_page?: number;
  category?: number;
  search?: string;
  embed?: boolean;
}) => {
  const queryParams = new URLSearchParams();
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
  }

  const endpoint = `posts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const cacheKey = `articles_${queryParams.toString()}`;
  
  // Vérifier le cache
  const cached = getCached(cacheKey);
  if (cached) {
    console.log('📦 Cache hit for articles');
    return cached;
  }

  return withRetry(async () => {
    const url = `${WORDPRESS_API_URL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Mettre en cache
      setCache(cacheKey, data, 10 * 60 * 1000); // 10 minutes

      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      throw error;
    }
  });
};

const getArticleLegacy = async (id: number, embed: boolean = true) => {
  const endpoint = `posts/${id}${embed ? '?_embed=true' : ''}`;
  const cacheKey = `article_${id}`;

  // Vérifier le cache
  const cached = getCached(cacheKey);
  if (cached) {
    console.log('📦 Cache hit for article');
    return cached;
  }

  return withRetry(async () => {
    const url = `${WORDPRESS_API_URL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Mettre en cache
      setCache(cacheKey, data, 30 * 60 * 1000); // 30 minutes

      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      throw error;
    }
  });
};

const getCategoriesLegacy = async () => {
  const endpoint = 'categories?per_page=100';
  const cacheKey = 'categories';

  // Vérifier le cache
  const cached = getCached(cacheKey);
  if (cached) {
    console.log('📦 Cache hit for categories');
    return cached;
  }

  return withRetry(async () => {
    const url = `${WORDPRESS_API_URL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Mettre en cache
      setCache(cacheKey, data, 24 * 60 * 60 * 1000); // 24 heures

      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      throw error;
    }
  });
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

// Récupérer un média par son ID avec cache étendu et fallback
export const getMedia = async (id: number) => {
  const cacheKey = `media_${id}`;
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${WORDPRESS_API_URL}media/${id}`;
    const response = await withRetry(() => apiRequest(url));
    setCache(cacheKey, response, CACHE_TTL.media);
    return response;
  } catch (error) {
    console.error("Erreur récupération media:", error);
    
    // En cas d'erreur, retourner un objet média par défaut si disponible dans le cache expiré
    const expiredCache = cache.get(cacheKey);
    if (expiredCache) {
      console.log('🔄 Utilisation du cache expiré pour le média');
      return expiredCache.data;
    }
    
    // Objet fallback minimal pour éviter les crashes
    return {
      id: id,
      source_url: '',
      title: { rendered: 'Media indisponible' },
      media_details: { sizes: {} }
    };
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
    const timeoutId = setTimeout(() => controller.abort(), config.timeout || TIMEOUT);

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
const API_TIMEOUT = 45000; // 45 secondes (augmenté pour API lente)

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
        'Cache-Control': 'max-age=3600', // Cache côté serveur
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
      console.error(`⏰ Timeout API: ${url} (${API_TIMEOUT/1000}s)`);
      throw new Error('La connexion est trop lente. Veuillez réessayer plus tard.');
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
export const getPosts = async (page = 1, perPage = 10, category?: number, tag?: number) => {
  const cacheKey = `posts_${page}_${perPage}_${category || 'all'}_${tag || 'all'}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached) {
    console.log(`📂 Posts depuis cache: ${cacheKey}`);
    return cached;
  }

  try {
    let url = `${WORDPRESS_API_URL}posts?page=${page}&per_page=${perPage}&_embed=true`;
    
    // Ajouter filtres si spécifiés
    if (category) url += `&categories=${category}`;
    if (tag) url += `&tags=${tag}`;
    
    console.log(`🌐 Récupération posts: ${url}`);
    
    // Vérifier la connectivité avant l'appel
    const isOnline = await networkService.isOnline();
    if (!isOnline) {
      console.log('📵 Mode offline détecté, utilisation cache local');
      const offlinePosts = await offlineService.getOfflinePosts();
      return offlinePosts.length > 0 ? offlinePosts : [];
    }
    
    const response = await withRetry(() => apiRequest(url));
    
    // Cache TTL étendu pour les catégories critiques (Entrepreneuriat: 115, Gastronomie: 20)
    const isCriticalCategory = category === 115 || category === 20;
    const cacheTTL = isCriticalCategory ? CACHE_TTL.posts_critical : CACHE_TTL.posts;
    
    setCache(cacheKey, response, cacheTTL);
    console.log(`✅ Posts récupérés: ${response?.length || 0} articles ${isCriticalCategory ? '(cache critique 30min)' : '(cache 10min)'}`);
    
    // Sauvegarder pour le mode offline
    await offlineService.savePostsOffline(response);
    
    return response;
  } catch (error) {
    console.error("❌ Erreur récupération posts:", error);
    
    // 1. Retourner cache expiré si disponible
    const expiredCache = cache.get(cacheKey);
    if (expiredCache) {
      console.log(`🔄 Utilisation cache expiré: ${expiredCache.data?.length || 0} articles`);
      return expiredCache.data;
    }
    
    // 2. Essayer de récupérer depuis le service offline
    const offlinePosts = await offlineService.getOfflinePosts();
    if (offlinePosts.length > 0) {
      console.log(`💾 Utilisation service offline: ${offlinePosts.length} articles`);
      return offlinePosts;
    }
    
    // 3. Essayer localStorage (fallback)
    const localStorageKey = `posts_offline_${page}_${perPage}`;
    try {
      const stored = localStorage.getItem(localStorageKey);
      if (stored) {
        const data = JSON.parse(stored);
        console.log(`💾 Utilisation localStorage fallback: ${data?.length || 0} articles`);
        return data;
      }
    } catch (localError) {
      console.log("⚠️ Erreur lecture localStorage:", localError);
    }
    
    // 3. Retourner tableau vide pour éviter le crash
    console.log("⚠️ Aucune donnée disponible, retour tableau vide");
    return [];
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
    console.log(`🌐 getPostsByTag URL: ${url}`);
    const response = await withRetry(() => apiRequest(url));
    setCache(cacheKey, response, CACHE_TTL.posts);
    console.log(`✅ getPostsByTag succès: ${response?.length || 0} articles`);
    return response;
  } catch (error) {
    console.error("❌ Erreur récupération posts par tag:", error);
    
    // Fallback: utiliser le cache expiré si disponible
    const expiredCache = cache.get(cacheKey);
    if (expiredCache) {
      console.log(`🔄 getPostsByTag fallback cache expiré: ${expiredCache.data?.length || 0} articles`);
      return expiredCache.data;
    }
    
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
