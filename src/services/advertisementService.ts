// src/services/advertisementService.ts
// Service pour récupérer les publicités depuis Supabase (DefMaks)

import { supabase } from '../lib/supabase';

export type AdZone = 'home' | 'inner' | 'single' | 'page' | 'coinshop' | 'in_read';
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
  zone: AdZone | null;
  inner_link: string | null;
  external_link: string | null;
  target: string[] | null;
}

/**
 * Récupère les publicités actives pour une zone donnée
 */
export const getActiveAdvertisements = async (zone: AdZone): Promise<Advertisement[]> => {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('advertisements')
      .select('*')
      .eq('zone', zone)
      .eq('is_active', true)
      .eq('status', 'en cours')
      .lte('start_date', now)
      .gte('end_date', now)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erreur récupération publicités:', error);
      return [];
    }

    console.log(`📢 ${data?.length || 0} publicité(s) trouvée(s) pour zone: ${zone}`);
    return data || [];
  } catch (error) {
    console.error('❌ Exception advertisementService:', error);
    return [];
  }
};

/**
 * Récupère toutes les publicités actives (toutes zones confondues)
 */
export const getAllActiveAdvertisements = async (): Promise<Advertisement[]> => {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('advertisements')
      .select('*')
      .eq('is_active', true)
      .eq('status', 'en cours')
      .lte('start_date', now)
      .gte('end_date', now)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erreur récupération toutes publicités:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Exception advertisementService:', error);
    return [];
  }
};

/**
 * Récupère les publicités pour plusieurs zones
 */
export const getAdvertisementsByZones = async (zones: AdZone[]): Promise<Advertisement[]> => {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('advertisements')
      .select('*')
      .in('zone', zones)
      .eq('is_active', true)
      .eq('status', 'en cours')
      .lte('start_date', now)
      .gte('end_date', now)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erreur récupération publicités par zones:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Exception advertisementService:', error);
    return [];
  }
};

/**
 * Enregistre un clic sur une publicité
 */
export const trackAdClick = async (adId: number): Promise<void> => {
  try {
    // On pourrait avoir une table ad_clicks pour le tracking
    console.log(`📊 Clic enregistré sur publicité #${adId}`);
    
    // Optionnel: Incrémenter un compteur dans la table advertisements
    // await supabase.rpc('increment_ad_clicks', { ad_id: adId });
  } catch (error) {
    console.error('❌ Erreur tracking clic pub:', error);
  }
};

/**
 * Enregistre une impression (affichage) d'une publicité
 */
export const trackAdImpression = async (adId: number): Promise<void> => {
  try {
    console.log(`👁️ Impression enregistrée pour publicité #${adId}`);
    // Optionnel: await supabase.rpc('increment_ad_impressions', { ad_id: adId });
  } catch (error) {
    console.error('❌ Erreur tracking impression pub:', error);
  }
};

export default {
  getActiveAdvertisements,
  getAllActiveAdvertisements,
  getAdvertisementsByZones,
  trackAdClick,
  trackAdImpression,
};
