// src/services/cache.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Post } from "../models/Post";
import { Magazine } from "../models/Magazine";

const POSTS_CACHE_KEY = "posts_cache";
const MAGAZINES_CACHE_KEY = "magazines_cache";
const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes

// Cache des articles
export const cachePosts = async (posts: Post[]) => {
  const payload = {
    data: posts,
    timestamp: Date.now(),
  };
  await AsyncStorage.setItem(POSTS_CACHE_KEY, JSON.stringify(payload));
};

export const getCachedPosts = async (): Promise<Post[] | null> => {
  try {
    const data = await AsyncStorage.getItem(POSTS_CACHE_KEY);
    if (!data) return null;
    const payload = JSON.parse(data);
    if (Date.now() - payload.timestamp > CACHE_EXPIRY) {
      return null; // Expiré
    }
    return payload.data;
  } catch (error) {
    console.error("Erreur cache posts:", error);
    return null;
  }
};

// Cache des magazines
export const cacheMagazines = async (magazines: Magazine[]) => {
  const payload = {
    data: magazines,
    timestamp: Date.now(),
  };
  await AsyncStorage.setItem(MAGAZINES_CACHE_KEY, JSON.stringify(payload));
};

export const getCachedMagazines = async (): Promise<Magazine[] | null> => {
  try {
    const data = await AsyncStorage.getItem(MAGAZINES_CACHE_KEY);
    if (!data) return null;
    const payload = JSON.parse(data);
    if (Date.now() - payload.timestamp > CACHE_EXPIRY) {
      return null;
    }
    return payload.data;
  } catch (error) {
    console.error("Erreur cache magazines:", error);
    return null;
  }
};
