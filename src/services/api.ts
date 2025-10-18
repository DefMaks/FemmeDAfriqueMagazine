// src/services/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: "https://femmedafrique.net/wp-json/wp/v2/", // ← supprime les espaces
  headers: {
    "Content-Type": "application/json",
  },
});

// Fonction pour récupérer les articles
export const getPosts = async (page = 1, perPage = 10) => {
  try {
    const response = await api.get("posts", {
      params: {
        page,
        per_page: perPage,
        _embed: true, // Pour inclure les images et auteurs
      },
    });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des articles:", error);
    throw error;
  }
};

// Fonction pour récupérer un article par ID
export const getPostById = async (id: number) => {
  try {
    const response = await api.get(`posts/${id}`, {
      params: {
        _embed: true,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'article:", error);
    throw error;
  }
};

// Fonction pour récupérer les magazines
export const getMagazines = async (page = 1, perPage = 10) => {
  try {
    const response = await api.get("mag", {
      params: {
        page,
        per_page: perPage,
        _embed: true, // Pour inclure les images et autres métadonnées
      },
    });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des magazines:", error);
    throw error;
  }
};

// Fonction pour récupérer un magazine par ID
export const getMagazineById = async (id: number) => {
  try {
    const response = await api.get(`mag/${id}`, {
      params: {
        _embed: true,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération du magazine:", error);
    throw error;
  }
};

// Fonction pour récupérer les détails d'un fichier média (PDF)
export const getMedia = async (id: number) => {
  try {
    const response = await api.get(`media/${id}`);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération du média:", error);
    throw error;
  }
};

// Fonction pour récupérer les catégories
export const getCategories = async () => {
  try {
    const response = await api.get("categories", {
      params: {
        per_page: 100,
        orderby: 'count',
        order: 'desc',
      },
    });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des catégories:", error);
    throw error;
  }
};

// Fonction pour récupérer une catégorie par ID
export const getCategoryById = async (id: number) => {
  try {
    const response = await api.get(`categories/${id}`);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération de la catégorie:", error);
    throw error;
  }
};

// Fonction pour récupérer les posts d'une catégorie
export const getPostsByCategory = async (categoryId: number, page = 1, perPage = 10) => {
  try {
    const response = await api.get("posts", {
      params: {
        categories: categoryId,
        page,
        per_page: perPage,
        _embed: true,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des posts par catégorie:", error);
    throw error;
  }
};

// Fonction pour récupérer les posts avec un tag spécifique (pour featured posts)
export const getPostsByTag = async (tagId: number, page = 1, perPage = 10) => {
  try {
    const response = await api.get("posts", {
      params: {
        tags: tagId,
        page,
        per_page: perPage,
        _embed: true,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des posts par tag:", error);
    throw error;
  }
};

// Fonction pour récupérer les ads
export const getAds = async () => {
  try {
    const response = await api.get("app-ad", {
      params: {
        per_page: 10,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des ads:", error);
    throw error;
  }
};

// Fonction pour récupérer les ad zones
export const getAdZones = async () => {
  try {
    const response = await api.get("app_ad_zone");
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des ad zones:", error);
    throw error;
  }
};

// Fonction pour rechercher des posts
export const searchPosts = async (query: string, page = 1, perPage = 10) => {
  try {
    const response = await api.get("posts", {
      params: {
        search: query,
        page,
        per_page: perPage,
        _embed: true,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la recherche:", error);
    throw error;
  }
};
