// src/services/favorites.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Post } from "../models/Post";

const FAVORITES_KEY = "fda_favorites";

export const saveFavorite = async (post: Post) => {
  const favs = await getFavorites();
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify([...favs, post]));
};

export const getFavorites = async (): Promise<Post[]> => {
  const data = await AsyncStorage.getItem(FAVORITES_KEY);
  return data ? JSON.parse(data) : [];
};
