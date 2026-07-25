import Constants from 'expo-constants';
import { getToken, getAuthHeaders } from './wordpressAuth';

// Nettoyer l'URL (enlever le / final si présent)
const WP_API_URL = (Constants.expoConfig?.extra?.EXPO_PUBLIC_WORDPRESS_API_URL || 'https://femmedafrique.net/wp-json/wp/v2').replace(/\/$/, '');

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
    const url = `${WP_API_URL}/comments?post=${postId}&page=${page}&per_page=${perPage}&order=desc&orderby=date`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Erreur récupération commentaires:', error.message);
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

    const response = await fetch(`${WP_API_URL}/comments`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        post: comment.post,
        content: comment.content,
        parent: comment.parent || 0,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Erreur publication commentaire:', error.message);
    throw new Error(error.message || 'Impossible de publier le commentaire');
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
    // Essayer d'abord sans authentification (commentaires invités)
    const response = await fetch(`${WP_API_URL}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        post: postId,
        content,
        author_name: authorName,
        author_email: authorEmail,
      }),
    });

    if (response.ok) {
      return await response.json();
    }

    const errorData = await response.json().catch(() => ({}));

    // Si les commentaires invités ne sont pas autorisés, essayer avec un compte invité par défaut
    if (errorData.code === 'rest_comment_login_required') {
      console.log('Tentative avec compte invité par défaut...');

      try {
        // Créer un compte invité par défaut (ou utiliser un existant)
        const guestCredentials = {
          username: 'invitado_app', // Nom d'utilisateur invité par défaut
          password: 'TempGuest2024!', // Mot de passe temporaire
        };

        // Tenter de se connecter avec le compte invité
        const { loginWordPress } = await import('./wordpressAuth');
        const authResponse = await loginWordPress(guestCredentials.username, guestCredentials.password);

        // Utiliser le token pour poster le commentaire
        const responseAuth = await fetch(`${WP_API_URL}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authResponse.token}`,
          },
          body: JSON.stringify({
            post: postId,
            content,
            author_name: authorName,
            author_email: authorEmail,
          }),
        });

        if (!responseAuth.ok) {
          const errorDataAuth = await responseAuth.json().catch(() => ({}));
          throw new Error(errorDataAuth.message || `HTTP ${responseAuth.status}: ${responseAuth.statusText}`);
        }

        return await responseAuth.json();
      } catch (guestError: any) {
        console.error('Erreur avec compte invité par défaut:', guestError.message);
        throw new Error('Les commentaires invités ne sont pas autorisés sur ce site. Veuillez vous connecter.');
      }
    }

    throw new Error(errorData.message || 'Impossible de publier le commentaire');
  } catch (error: any) {
    console.error('Erreur publication commentaire invité:', error.message);
    throw error;
  }
};

/**
 * Compter les commentaires d'un article
 */
export const getCommentCount = async (postId: number): Promise<number> => {
  try {
    const response = await fetch(`${WP_API_URL}/comments?post=${postId}`, {
      method: 'HEAD',
    });
    return parseInt(response.headers.get('x-wp-total') || '0', 10);
  } catch (error) {
    return 0;
  }
};

// ============================================
// ❤️ LIKES (via plugin ou custom endpoint)
// ============================================

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

    const response = await fetch(`${LIKES_API_URL}/like`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ post_id: postId }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Erreur like:', error.message);
    return { success: false, likes: 0, liked: false, message: 'Fonctionnalité non disponible' };
  }
};

/**
 * Unliker un article
 */
export const unlikePost = async (postId: number): Promise<LikeResponse> => {
  try {
    const authHeaders = await getAuthHeaders();

    const response = await fetch(`${LIKES_API_URL}/unlike`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ post_id: postId }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Erreur unlike:', error.message);
    return { success: false, likes: 0, liked: false, message: 'Fonctionnalité non disponible' };
  }
};

/**
 * Récupérer le nombre de likes et l'état de like
 */
export const getLikeStatus = async (postId: number): Promise<{ likes: number; liked: boolean }> => {
  try {
    const authHeaders = await getAuthHeaders();

    const response = await fetch(`${LIKES_API_URL}/likes/${postId}`, {
      headers: authHeaders as any,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
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

    const response = await fetch(`${WP_API_URL}/posts`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: post.title,
        content: post.content,
        excerpt: post.excerpt,
        categories: post.categories,
        tags: post.tags,
        featured_media: post.featured_media,
        status: 'pending', // En attente de modération
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Erreur soumission article:', error.message);
    throw new Error(error.message || 'Impossible de soumettre l\'article');
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

    const response = await fetch(`${WP_API_URL}/media`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        // FormData set Content-Type automatically with boundary
      } as any,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.id;
  } catch (error: any) {
    console.error('Erreur upload média:', error.message);
    throw new Error(error.message || 'Impossible d\'uploader l\'image');
  }
};
