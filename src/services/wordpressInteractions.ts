// src/services/wordpressInteractions.ts
import axios from 'axios';
import { getToken, getAuthHeaders, isLoggedIn } from './wordpressAuth';

// Nettoyer l'URL (enlever le / final si présent)
const WP_API_URL = (process.env.EXPO_PUBLIC_WORDPRESS_API_URL || 'https://femmedafrique.net/wp-json/wp/v2').replace(/\/$/, '');

// ============================================
// 💬 COMMENTAIRES
// ============================================

export interface Comment {
  id: number;
  post: number;
  parent: number;
  author: number;
  author_name: string;
  author_avatar_urls?: { [key: string]: string };
  date: string;
  content: {
    rendered: string;
  };
  status: string;
}

export interface NewComment {
  post: number;
  content: string;
  parent?: number;
  author_name?: string;
  author_email?: string;
}

/**
 * Récupérer les commentaires d'un article
 */
export const getComments = async (postId: number, page: number = 1, perPage: number = 20): Promise<Comment[]> => {
  try {
    const response = await axios.get(`${WP_API_URL}/comments`, {
      params: {
        post: postId,
        page,
        per_page: perPage,
        order: 'desc',
        orderby: 'date',
      },
    });
    return response.data;
  } catch (error: any) {
    console.error('Erreur récupération commentaires:', error.response?.data || error.message);
    return [];
  }
};

/**
 * Poster un commentaire (nécessite authentification JWT)
 */
export const postComment = async (comment: NewComment): Promise<Comment | null> => {
  try {
    const authHeaders = await getAuthHeaders();
    const token = await getToken();
    
    if (!token) {
      throw new Error('Vous devez être connecté pour commenter');
    }

    const response = await axios.post(
      `${WP_API_URL}/comments`,
      {
        post: comment.post,
        content: comment.content,
        parent: comment.parent || 0,
      },
      {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Erreur publication commentaire:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Impossible de publier le commentaire');
  }
};

/**
 * Poster un commentaire en tant qu'invité (si autorisé par WordPress)
 */
export const postGuestComment = async (
  postId: number,
  content: string,
  authorName: string,
  authorEmail: string
): Promise<Comment | null> => {
  try {
    const response = await axios.post(
      `${WP_API_URL}/comments`,
      {
        post: postId,
        content,
        author_name: authorName,
        author_email: authorEmail,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Erreur publication commentaire invité:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Impossible de publier le commentaire');
  }
};

/**
 * Compter les commentaires d'un article
 */
export const getCommentCount = async (postId: number): Promise<number> => {
  try {
    const response = await axios.head(`${WP_API_URL}/comments`, {
      params: { post: postId },
    });
    return parseInt(response.headers['x-wp-total'] || '0', 10);
  } catch (error) {
    return 0;
  }
};

// ============================================
// ❤️ LIKES (via plugin ou custom endpoint)
// ============================================

// Note: WordPress n'a pas de système de likes natif.
// Ceci utilise un endpoint custom ou un plugin comme "WP ULike"

const LIKES_API_URL = `${WP_API_URL.replace('/wp/v2', '')}/fda/v1`;

export interface LikeResponse {
  success: boolean;
  likes: number;
  liked: boolean;
  message?: string;
}

/**
 * Liker un article
 */
export const likePost = async (postId: number): Promise<LikeResponse> => {
  try {
    const authHeaders = await getAuthHeaders();
    
    const response = await axios.post(
      `${LIKES_API_URL}/like`,
      { post_id: postId },
      {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Erreur like:', error.response?.data || error.message);
    // Fallback si l'endpoint n'existe pas
    return { success: false, likes: 0, liked: false, message: 'Fonctionnalité non disponible' };
  }
};

/**
 * Unliker un article
 */
export const unlikePost = async (postId: number): Promise<LikeResponse> => {
  try {
    const authHeaders = await getAuthHeaders();
    
    const response = await axios.post(
      `${LIKES_API_URL}/unlike`,
      { post_id: postId },
      {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Erreur unlike:', error.response?.data || error.message);
    return { success: false, likes: 0, liked: false, message: 'Fonctionnalité non disponible' };
  }
};

/**
 * Récupérer le nombre de likes et l'état de like
 */
export const getLikeStatus = async (postId: number): Promise<{ likes: number; liked: boolean }> => {
  try {
    const authHeaders = await getAuthHeaders();
    
    const response = await axios.get(`${LIKES_API_URL}/likes/${postId}`, {
      headers: authHeaders,
    });

    return response.data;
  } catch (error) {
    return { likes: 0, liked: false };
  }
};

// ============================================
// 📝 SOUMISSION D'ARTICLES (draft)
// ============================================

export interface NewPost {
  title: string;
  content: string;
  excerpt?: string;
  categories?: number[];
  tags?: number[];
  featured_media?: number;
}

/**
 * Soumettre un article en brouillon (nécessite authentification)
 */
export const submitDraftPost = async (post: NewPost): Promise<any> => {
  try {
    const authHeaders = await getAuthHeaders();
    const token = await getToken();
    
    if (!token) {
      throw new Error('Vous devez être connecté pour soumettre un article');
    }

    const response = await axios.post(
      `${WP_API_URL}/posts`,
      {
        title: post.title,
        content: post.content,
        excerpt: post.excerpt,
        categories: post.categories,
        tags: post.tags,
        featured_media: post.featured_media,
        status: 'pending', // En attente de modération
      },
      {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Erreur soumission article:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Impossible de soumettre l\'article');
  }
};

// ============================================
// 🖼️ UPLOAD MÉDIA
// ============================================

/**
 * Uploader une image (nécessite authentification)
 */
export const uploadMedia = async (uri: string, filename: string): Promise<number | null> => {
  try {
    const authHeaders = await getAuthHeaders();
    const token = await getToken();
    
    if (!token) {
      throw new Error('Vous devez être connecté pour uploader des images');
    }

    const formData = new FormData();
    formData.append('file', {
      uri,
      name: filename,
      type: 'image/jpeg',
    } as any);

    const response = await axios.post(
      `${WP_API_URL}/media`,
      formData,
      {
        headers: {
          ...authHeaders,
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data.id;
  } catch (error: any) {
    console.error('Erreur upload média:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Impossible d\'uploader l\'image');
  }
};
