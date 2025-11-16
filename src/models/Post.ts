// src/models/Post.ts
export interface Post {
  id: number;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  date: string;
  link: string;
  _embedded?: {
    "wp:featuredmedia"?: Array<{ source_url: string }>;
  };
  dmks_featured_image: any;
}
