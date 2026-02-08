// src/models/Post.ts
export interface Post {
  id: number;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  date: string;
  link: string;
  categories?: number[];
  tags?: number[];
  _embedded?: {
    author: any;
    "wp:featuredmedia"?: Array<{ source_url: string }>;
    "wp:term"?: Array<{
      taxonomy: string;
      slug: string;
      name: string;
    }>;
  };
  dmks_featured_image?: {
    id: number;
    alt: string;
    caption: string;
    description: {
      width: number;
      height: number;
      file: string;
      filesize: number;
      sizes: {
        medium: { file: string; width: number; height: number; "mime-type": string; filesize: number; };
        large: { file: string; width: number; height: number; "mime-type": string; filesize: number; };
        thumbnail: { file: string; width: number; height: number; "mime-type": string; filesize: number; };
        medium_large: { file: string; width: number; height: number; "mime-type": string; filesize: number; };
        "post-thumbnail": { file: string; width: number; height: number; "mime-type": string; filesize: number; };
        [key: string]: { file: string; width: number; height: number; "mime-type": string; filesize: number; };
      };
    };
    image_meta: any;
    src: string;
    sizes: {
      thumbnail: { url: string; width: number; height: number; };
      medium: { url: string; width: number; height: number; };
      medium_large: { url: string; width: number; height: number; };
      large: { url: string; width: number; height: number; };
      "post-thumbnail": { url: string; width: number; height: number; };
      [key: string]: { url: string; width: number; height: number; };
    };
  };
}
