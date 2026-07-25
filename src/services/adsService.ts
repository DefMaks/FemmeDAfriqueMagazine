// src/services/adsService.ts
import { supabase, getDeviceId } from '../lib/supabase';
import Constants from 'expo-constants';

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

const SUPABASE_STORAGE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || '';

/**
 * Récupère les publicités ciblées FDA
 */
export const getFDAAdvertisements = async (): Promise<Advertisement[]> => {
  try {
    // Vérifier que Supabase est configuré
    if (!SUPABASE_STORAGE_URL) {
      console.log('Supabase URL non configurée, pas de publicités');
      return [];
    }

    const { data, error } = await supabase
      .from('advertisements')
      .select('*')
      .eq('is_active', true)
      .contains('target', ['FDA'])
      .gte('end_date', new Date().toISOString())
      .lte('start_date', new Date().toISOString());

    if (error) {
      console.log('Publicités non disponibles:', error.message);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('Aucune publicité FDA active');
      return [];
    }

    // Transformer les URLs d'images de manière sécurisée
    return data.map(ad => ({
      ...ad,
      image_url: ad.image_url
        ? (ad.image_url.startsWith('http')
          ? ad.image_url
          : `${SUPABASE_STORAGE_URL}/storage/v1/object/public/${ad.image_url}`)
        : ''
    })).filter(ad => ad.image_url); // Filtrer les pubs sans image
  } catch (error) {
    console.log('Erreur getFDAAdvertisements (silencieux):', error);
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
