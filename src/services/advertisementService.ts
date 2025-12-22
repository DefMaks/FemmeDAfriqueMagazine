// src/services/advertisementService.ts
// Service pour récupérer les publicités depuis Supabase DefMaks

import { createClient } from '@supabase/supabase-js';

// Configuration Supabase DefMaks (URL corrigée)
const SUPABASE_URL = process.env.EXPO_PUBLIC_DEFMAKS_SUPABASE_URL || 'https://hcpogyjdbtcxndzpyjvd.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_DEFMAKS_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Créer le client Supabase pour les publicités
const supabaseAds = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type AdZone = 'home' | 'inner' | 'single' | 'page' | 'coinshop' | 'in_read' | null;
export type AdStatus = 'à venir' | 'en cours' | 'expiré';

export interface Advertisement {
  id: number;
  admin_id: string | null;
  title: string;
  description: string | null;
  image_url: string;
  start_date: string;
  end_date: string;
  status: AdStatus;
  is_active: boolean;
  created_at: string;
  client_id: string | null;
  zone: AdZone;
  inner_link: string | null;
  external_link: string | null;
  target: string[] | null;
}

/**
 * Récupère les publicités actives pour FDA
 * Filtre par target contenant "FDA" et status "en cours"
 */
export const getActiveAdvertisements = async (zone?: AdZone): Promise<Advertisement[]> => {
  try {
    console.log(`📢 Récupération des publicités${zone ? ` pour zone: ${zone}` : ''}...`);
    
    let query = supabaseAds
      .from('advertisements')
      .select('*')
      .eq('is_active', true)
      .eq('status', 'en cours')
      .contains('target', ['FDA']);  // Filtrer par target contenant "FDA"

    // Filtrer par zone si spécifiée
    if (zone) {
      query = query.eq('zone', zone);
    }

    // Filtrer par dates
    const now = new Date().toISOString();
    query = query
      .lte('start_date', now)
      .gte('end_date', now)
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('❌ Erreur récupération publicités:', error.message);
      return [];
    }

    console.log(`✅ ${data?.length || 0} publicité(s) trouvée(s)`);
    return data || [];
  } catch (error: any) {
    console.error('❌ Exception advertisementService:', error.message);
    return [];
  }
};

/**
 * Récupère toutes les publicités actives pour FDA (toutes zones confondues)
 */
export const getAllActiveAdvertisements = async (): Promise<Advertisement[]> => {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabaseAds
      .from('advertisements')
      .select('*')
      .eq('is_active', true)
      .eq('status', 'en cours')
      .contains('target', ['FDA'])
      .lte('start_date', now)
      .gte('end_date', now)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erreur récupération toutes publicités:', error.message);
      return [];
    }

    return data || [];
  } catch (error: any) {
    console.error('❌ Exception advertisementService:', error.message);
    return [];
  }
};

/**
 * Récupère les publicités pour plusieurs zones
 */
export const getAdvertisementsByZones = async (zones: AdZone[]): Promise<Advertisement[]> => {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabaseAds
      .from('advertisements')
      .select('*')
      .in('zone', zones)
      .eq('is_active', true)
      .eq('status', 'en cours')
      .contains('target', ['FDA'])
      .lte('start_date', now)
      .gte('end_date', now)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erreur récupération publicités par zones:', error.message);
      return [];
    }

    return data || [];
  } catch (error: any) {
    console.error('❌ Exception advertisementService:', error.message);
    return [];
  }
};

/**
 * Récupère une publicité aléatoire pour une zone
 */
export const getRandomAdvertisement = async (zone?: AdZone): Promise<Advertisement | null> => {
  try {
    const ads = await getActiveAdvertisements(zone);
    
    if (ads.length === 0) {
      return null;
    }

    // Retourner une pub aléatoire
    const randomIndex = Math.floor(Math.random() * ads.length);
    return ads[randomIndex];
  } catch (error) {
    console.error('❌ Erreur getRandomAdvertisement:', error);
    return null;
  }
};

/**
 * Enregistre un clic sur une publicité (optionnel - pour tracking futur)
 */
export const trackAdClick = async (adId: number): Promise<void> => {
  try {
    console.log(`📊 Clic enregistré sur publicité #${adId}`);
    // TODO: Implémenter le tracking si nécessaire
    // await supabaseAds.rpc('increment_ad_clicks', { ad_id: adId });
  } catch (error) {
    console.error('❌ Erreur tracking clic pub:', error);
  }
};

/**
 * Enregistre une impression (affichage) d'une publicité (optionnel)
 */
export const trackAdImpression = async (adId: number): Promise<void> => {
  try {
    console.log(`👁️ Impression enregistrée pour publicité #${adId}`);
    // TODO: Implémenter le tracking si nécessaire
    // await supabaseAds.rpc('increment_ad_impressions', { ad_id: adId });
  } catch (error) {
    console.error('❌ Erreur tracking impression pub:', error);
  }
};

export default {
  getActiveAdvertisements,
  getAllActiveAdvertisements,
  getAdvertisementsByZones,
  getRandomAdvertisement,
  trackAdClick,
  trackAdImpression,
};
