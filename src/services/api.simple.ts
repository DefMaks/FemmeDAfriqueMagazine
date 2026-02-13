import { WORDPRESS_CONFIG } from '../config/env';

// Types pour les données WordPress
export interface WordPressPost {
  id: number;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  date: string;
  slug: string;
  featured_media: number;
  _embedded?: {
    'wp:featuredmedia'?: Array<{
      source_url?: string;
      media_details?: {
        width: number;
        height: number;
      };
    }>;
  };
  categories?: number[];
  tags?: number[];
}

export interface WordPressCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
  link: string;
}

export interface WordPressTag {
  id: number;
  name: string;
  slug: string;
  description: string;
  count: number;
}

export interface ApiResponse<T> {
  data: T[];
  total: number;
  totalPages: number;
}

// Service API WordPress avec fetch natif
class WordPressApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = WORDPRESS_CONFIG.apiUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error for ${endpoint}:`, error);
      throw error;
    }
  }

  // Récupérer les articles récents
  async getRecentPosts(page: number = 1, perPage: number = 10): Promise<WordPressPost[]> {
    return this.request<WordPressPost[]>(
      `posts?per_page=${perPage}&page=${page}&_embed=wp:featuredmedia`
    );
  }

  // Récupérer les articles par catégorie
  async getPostsByCategory(categoryId: number, page: number = 1, perPage: number = 10): Promise<WordPressPost[]> {
    return this.request<WordPressPost[]>(
      `posts?categories=${categoryId}&per_page=${perPage}&page=${page}&_embed=wp:featuredmedia`
    );
  }

  // Récupérer les articles par tag
  async getPostsByTag(tagId: number, page: number = 1, perPage: number = 10): Promise<WordPressPost[]> {
    return this.request<WordPressPost[]>(
      `posts?tags=${tagId}&per_page=${perPage}&page=${page}&_embed=wp:featuredmedia`
    );
  }

  // Récupérer les catégories
  async getCategories(): Promise<WordPressCategory[]> {
    return this.request<WordPressCategory[]>('categories?per_page=100');
  }

  // Récupérer les tags
  async getTags(): Promise<WordPressTag[]> {
    return this.request<WordPressTag[]>('tags?per_page=100');
  }

  // Récupérer un article par son slug
  async getPostBySlug(slug: string): Promise<WordPressPost | null> {
    try {
      const posts = await this.request<WordPressPost[]>(
        `posts?slug=${slug}&_embed=wp:featuredmedia`
      );
      return posts.length > 0 ? posts[0] : null;
    } catch (error) {
      console.error('Error getting post by slug:', error);
      return null;
    }
  }

  // Nettoyer le HTML pour les extraits
  stripHtml(html: string): string {
    if (!html) return '';
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  // Générer une couleur aléatoire pour les catégories/tags
  generateColor(seed: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#F8B739', '#52B788',
      '#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6'
    ];
    
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }
}

// Export singleton
export const wordPressApiService = new WordPressApiService();
