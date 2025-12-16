import axios from 'axios';
import { getPosts, getPostById, searchPosts } from '../api';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPosts', () => {
    it('should fetch posts successfully', async () => {
      const mockPosts = [
        { id: 1, title: { rendered: 'Test Post 1' } },
        { id: 2, title: { rendered: 'Test Post 2' } },
      ];

      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue({ data: mockPosts }),
      } as any);

      const posts = await getPosts();
      expect(posts).toEqual(mockPosts);
    });

    it('should handle errors when fetching posts', async () => {
      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error('Network error')),
      } as any);

      await expect(getPosts()).rejects.toThrow('Network error');
    });
  });

  describe('getPostById', () => {
    it('should fetch a single post by ID', async () => {
      const mockPost = { id: 1, title: { rendered: 'Test Post' } };

      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue({ data: mockPost }),
      } as any);

      const post = await getPostById(1);
      expect(post).toEqual(mockPost);
    });
  });

  describe('searchPosts', () => {
    it('should search posts with query', async () => {
      const mockResults = [
        { id: 1, title: { rendered: 'Searched Post' } },
      ];

      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue({ data: mockResults }),
      } as any);

      const results = await searchPosts('test query');
      expect(results).toEqual(mockResults);
    });
  });
});
