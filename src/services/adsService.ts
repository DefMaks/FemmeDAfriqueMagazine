// src/services/adsService.ts
import { supabase, getDeviceId } from '../lib/supabase';

export interface Advertisement {
  id: number;
  title: string;
  description: string | null;
  image_url: string;
  start_date: string;
  end_date: string;
  status: string;
  is_active: boolean;
  external_link: string | null;
  inner_link: string | null;
  target: string[] | null;
}

const SUPABASE_STORAGE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';

/**
 * Récupère les publicités ciblées FDA
 */
export const getFDAAdvertisements = async (): Promise<Advertisement[]> => {
  try {
    const { data, error } = await supabase
      .from('advertisements')
      .select('*')
      .eq('is_active', true)
      .contains('target', ['FDA'])
      .gte('end_date', new Date().toISOString())
      .lte('start_date', new Date().toISOString());

    if (error) {
      console.error('Erreur récupération publicités:', error);
      return [];
    }

    // Transformer les URLs d'images
    return (data || []).map(ad => ({
      ...ad,
      image_url: ad.image_url.startsWith('http') 
        ? ad.image_url 
        : `${SUPABASE_STORAGE_URL}/storage/v1/object/public/${ad.image_url}`
    }));
  } catch (error) {
    console.error('Erreur getFDAAdvertisements:', error);
    return [];
  }
};

/**
 * Enregistre une vue de publicité
 * NOTE: Insertions suspendues temporairement
 */
export const trackAdView = async (adId: number, zone: string = 'home'): Promise<void> => {
  // Tracking suspendu temporairement
  console.log(`👁️ Ad view (tracking suspendu): ${adId}, zone: ${zone}`);
  
  /* INSERTIONS SUSPENDUES
  try {
    await supabase
      .from('ad_views')
      .insert({
        ad_id: adId,
        zone: zone,
        viewed_at: new Date().toISOString(),
      });
      
    console.log(`👁️ Ad view tracked: ${adId}`);
  } catch (error) {
    console.log('Ad view tracking skipped');
  }
  */
};

/**
 * Enregistre un clic sur une publicité
 * NOTE: Insertions suspendues temporairement
 */
export const trackAdClick = async (adId: number, zone: string = 'home'): Promise<void> => {
  // Tracking suspendu temporairement
  console.log(`👆 Ad click (tracking suspendu): ${adId}, zone: ${zone}`);
  
  /* INSERTIONS SUSPENDUES
  try {
    await supabase
      .from('ad_clicks')
      .insert({
        ad_id: adId,
        zone: zone,
        clicked_at: new Date().toISOString(),
      });
      
    console.log(`👆 Ad click tracked: ${adId}`);
  } catch (error) {
    console.log('Ad click tracking skipped');
  }
  */
};
