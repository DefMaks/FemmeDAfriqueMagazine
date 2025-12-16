import AsyncStorage from '@react-native-async-storage/async-storage';
import { cachePosts, getCachedPosts, cacheMagazines, getCachedMagazines } from '../cache';
import { Post } from '../../models/Post';

describe('Cache Service', () => {
  beforeEach(() => {
    AsyncStorage.clear();
  });

  describe('cachePosts', () => {
    it('should cache posts successfully', async () => {
      const mockPosts: Post[] = [
        { id: 1, title: { rendered: 'Post 1' }, date: '2025-01-01' } as Post,
      ];

      await cachePosts(mockPosts);
      
      const cached = await AsyncStorage.getItem('posts_cache');
      expect(cached).toBeTruthy();
      
      const parsed = JSON.parse(cached!);
      expect(parsed.data).toEqual(mockPosts);
      expect(parsed.timestamp).toBeDefined();
    });
  });

  describe('getCachedPosts', () => {
    it('should return cached posts if not expired', async () => {
      const mockPosts: Post[] = [
        { id: 1, title: { rendered: 'Post 1' }, date: '2025-01-01' } as Post,
      ];

      await cachePosts(mockPosts);
      const cached = await getCachedPosts();
      
      expect(cached).toEqual(mockPosts);
    });

    it('should return null if cache is expired', async () => {
      const expiredPayload = {
        data: [],
        timestamp: Date.now() - (31 * 60 * 1000), // 31 minutes ago
      };

      await AsyncStorage.setItem('posts_cache', JSON.stringify(expiredPayload));
      const cached = await getCachedPosts();
      
      expect(cached).toBeNull();
    });

    it('should return null if no cache exists', async () => {
      const cached = await getCachedPosts();
      expect(cached).toBeNull();
    });
  });

  describe('cacheMagazines', () => {
    it('should cache magazines successfully', async () => {
      const mockMagazines = [
        { id: 1, title: { rendered: 'Magazine 1' } },
      ];

      await cacheMagazines(mockMagazines as any);
      
      const cached = await AsyncStorage.getItem('magazines_cache');
      expect(cached).toBeTruthy();
    });
  });

  describe('getCachedMagazines', () => {
    it('should return cached magazines if not expired', async () => {
      const mockMagazines = [
        { id: 1, title: { rendered: 'Magazine 1' } },
      ];

      await cacheMagazines(mockMagazines as any);
      const cached = await getCachedMagazines();
      
      expect(cached).toEqual(mockMagazines);
    });
  });
});
