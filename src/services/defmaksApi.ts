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
 */
export const recordPurchase = async (purchase: PurchaseRecord): Promise<PurchaseResponse> => {
  try {
    console.log('📝 Enregistrement de l\'achat sur DefMaks...');
    console.log('   📦 Données:', JSON.stringify(purchase, null, 2));

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
    console.log('📥 Réponse DefMaks:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('❌ Erreur enregistrement DefMaks:', data);
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
    console.error('❌ Erreur DefMaks - recordPurchase:', error);
    
    // Ne pas bloquer le flux principal en cas d'erreur
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
