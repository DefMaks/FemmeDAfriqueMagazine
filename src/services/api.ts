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
