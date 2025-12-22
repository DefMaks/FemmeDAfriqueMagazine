// src/services/defmaksApi.ts
// Service pour enregistrer les achats sur la base de données DefMaks

import { Platform } from 'react-native';

// Configuration API DefMaks
const DEFMAKS_API_URL = process.env.EXPO_PUBLIC_DEFMAKS_API_URL || 'https://api.defmaks.com';
const DEFMAKS_API_KEY = process.env.EXPO_PUBLIC_DEFMAKS_API_KEY || '';

const headers = {
  'Authorization': `Bearer ${DEFMAKS_API_KEY}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// Types
export interface PurchaseRecord {
  order_id: string;
  customer_phone: string;
  magazine_id: number;
  magazine_number: string;
  magazine_title: string;
  amount: string;
  currency: string;
  payment_method: 'emoney' | 'ecard';
  payment_provider?: string;
  payment_status: 'success' | 'pending' | 'failed';
  transaction_date: string;
  platform: string;
  app_version?: string;
  device_info?: string;
}

export interface PurchaseResponse {
  success: boolean;
  message: string;
  purchase_id?: string;
  error?: string;
}

/**
 * Enregistre un achat réussi sur la base de données DefMaks
 * Note: Si l'API n'est pas configurée, l'erreur est ignorée silencieusement
 */
export const recordPurchase = async (purchase: PurchaseRecord): Promise<PurchaseResponse> => {
  // Vérifier si l'API est configurée
  if (!DEFMAKS_API_URL || DEFMAKS_API_URL === 'https://api.defmaks.com') {
    console.log('ℹ️ API DefMaks non configurée - enregistrement ignoré');
    return {
      success: true,
      message: 'API non configurée (mode local)',
      purchase_id: `local_${Date.now()}`,
    };
  }

  try {
    console.log('📝 Enregistrement de l\'achat sur DefMaks...');

    const response = await fetch(`${DEFMAKS_API_URL}/api/purchases`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...purchase,
        platform: Platform.OS,
        recorded_at: new Date().toISOString(),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.warn('⚠️ Erreur enregistrement DefMaks (non bloquant):', data?.message);
      return {
        success: false,
        message: data?.message || 'Erreur lors de l\'enregistrement',
        error: data?.error || 'API_ERROR',
      };
    }

    console.log('✅ Achat enregistré avec succès sur DefMaks');
    return {
      success: true,
      message: data?.message || 'Achat enregistré avec succès',
      purchase_id: data?.purchase_id || data?.id,
    };
  } catch (error: any) {
    // Erreur silencieuse - ne pas bloquer le flux principal
    console.warn('⚠️ DefMaks indisponible (non bloquant):', error.message);
    return {
      success: false,
      message: error.message || 'Impossible d\'enregistrer l\'achat',
      error: 'NETWORK_ERROR',
    };
  }
};

/**
 * Enregistre un achat de magazine avec les détails complets
 */
export const recordMagazinePurchase = async (
  orderId: string,
  customerPhone: string,
  magazine: {
    id: number;
    numero: string;
    title: string;
  },
  amount: string,
  currency: string,
  paymentMethod: 'emoney' | 'ecard',
  paymentProvider?: string
): Promise<PurchaseResponse> => {
  const purchase: PurchaseRecord = {
    order_id: orderId,
    customer_phone: customerPhone,
    magazine_id: magazine.id,
    magazine_number: magazine.numero,
    magazine_title: magazine.title,
    amount,
    currency,
    payment_method: paymentMethod,
    payment_provider: paymentProvider,
    payment_status: 'success',
    transaction_date: new Date().toISOString(),
    platform: Platform.OS,
  };

  return recordPurchase(purchase);
};

/**
 * Vérifie si un magazine a déjà été acheté par un utilisateur
 */
export const checkPurchaseExists = async (
  customerPhone: string,
  magazineId: number
): Promise<boolean> => {
  try {
    const response = await fetch(
      `${DEFMAKS_API_URL}/api/purchases/check?phone=${encodeURIComponent(customerPhone)}&magazine_id=${magazineId}`,
      {
        method: 'GET',
        headers,
      }
    );

    const data = await response.json();
    return data?.exists === true;
  } catch (error) {
    console.error('❌ Erreur vérification achat DefMaks:', error);
    return false;
  }
};

/**
 * Récupère l'historique des achats d'un utilisateur
 */
export const getPurchaseHistory = async (customerPhone: string): Promise<PurchaseRecord[]> => {
  try {
    const response = await fetch(
      `${DEFMAKS_API_URL}/api/purchases/history?phone=${encodeURIComponent(customerPhone)}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data?.purchases || [];
  } catch (error) {
    console.error('❌ Erreur récupération historique DefMaks:', error);
    return [];
  }
};

export default {
  recordPurchase,
  recordMagazinePurchase,
  checkPurchaseExists,
  getPurchaseHistory,
};
