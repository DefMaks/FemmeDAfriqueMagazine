// src/models/Magazine.ts
export interface Magazine {
  id: number;
  date: string;
  slug: string;
  status: string;
  title: {
    rendered: string;
  };
  link: string;
  acf: {
    numero: number;
    periode: string;
    pages: string;
    prix_mag: number;
    tva: number;
    pdf: number; // ID du fichier PDF
  };
  better_featured_image?: {
    source_url: string;
    sizes?: {
      [key: string]: {
        url: string;
        width: number;
        height: number;
      };
    };
  };
  dmks_featured_image?: {
    src: string;
  };
}
