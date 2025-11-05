// src/services/savedArticles.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Post } from "../models/Post";

const SAVED_ARTICLES_KEY = "saved_articles";

/**
 * Vérifie si une valeur ressemble à un tableau de Post valide.
 * On ne vérifie que la présence de `id` (number), car c’est l’essentiel pour les favoris.
 */
const isValidPostArray = (value: any): value is Post[] => {
  if (!Array.isArray(value)) return false;
  return value.every(
    (item) =>
      item != null && typeof item === "object" && typeof item.id === "number"
    // On ne vérifie pas title.rendered ici → ce n’est pas critique pour le stockage
  );
};

/**
 * Récupère la liste des articles sauvegardés.
 * En cas d’erreur ou de données invalides, réinitialise le stockage.
 */
export const getSavedArticles = async (): Promise<Post[]> => {
  try {
    const data = await AsyncStorage.getItem(SAVED_ARTICLES_KEY);
    if (!data) return [];

    const cleanData = data.trim();
    if (!cleanData) return [];

    const parsed = JSON.parse(cleanData);

    if (isValidPostArray(parsed)) {
      return parsed;
    } else {
      console.warn("saved_articles: données invalides → réinitialisation");
      await AsyncStorage.removeItem(SAVED_ARTICLES_KEY);
      return [];
    }
  } catch (error) {
    console.error("Erreur lecture savedArticles:", error);
    // En cas d’erreur de parsing, on nettoie et on retourne un tableau vide
    await AsyncStorage.removeItem(SAVED_ARTICLES_KEY);
    return [];
  }
};

/**
 * Vérifie si un article (par ID) est sauvegardé.
 * Ne lève jamais d’exception → retourne `false` en cas d’erreur.
 */
export const isArticleSaved = async (id: number): Promise<boolean> => {
  if (typeof id !== "number" || id <= 0) return false; // 🔹 Protection supplémentaire

  try {
    const saved = await getSavedArticles();
    return saved.some((article) => article.id === id);
  } catch (error) {
    console.error("Error checking if article is saved:", error);
    return false; // Ne jamais casser l’UI
  }
};

/**
 * Sauvegarde un article (si pas déjà présent).
 */
export const saveArticle = async (article: Post): Promise<void> => {
  try {
    const saved = await getSavedArticles();
    const exists = saved.some((item) => item.id === article.id);
    if (!exists) {
      const updated = [...saved, article];
      await AsyncStorage.setItem(SAVED_ARTICLES_KEY, JSON.stringify(updated));
    }
  } catch (error) {
    console.error("Erreur sauvegarde article:", error);
  }
};

/**
 * Supprime un article par ID.
 */
export const removeArticle = async (id: number): Promise<void> => {
  try {
    const saved = await getSavedArticles();
    const filtered = saved.filter((article) => article.id !== id);
    await AsyncStorage.setItem(SAVED_ARTICLES_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Erreur suppression article:", error);
  }
};
