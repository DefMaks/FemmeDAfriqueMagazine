// src/services/savedArticles.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const SAVED_ARTICLES_KEY = "saved_articles";

export const saveArticle = async (article: any) => {
  try {
    const saved = await AsyncStorage.getItem(SAVED_ARTICLES_KEY);
    const list = saved ? JSON.parse(saved) : [];
    list.push(article);
    await AsyncStorage.setItem(SAVED_ARTICLES_KEY, JSON.stringify(list));
  } catch (error) {
    console.error("Erreur sauvegarde:", error);
  }
};

export const getSavedArticles = async () => {
  try {
    const saved = await AsyncStorage.getItem(SAVED_ARTICLES_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Erreur lecture:", error);
    return [];
  }
};

export const removeArticle = async (id: number) => {
  try {
    const saved = await AsyncStorage.getItem(SAVED_ARTICLES_KEY);
    const list = saved ? JSON.parse(saved) : [];
    const newList = list.filter((item: any) => item.id !== id);
    await AsyncStorage.setItem(SAVED_ARTICLES_KEY, JSON.stringify(newList));
  } catch (error) {
    console.error("Erreur suppression:", error);
  }
};
