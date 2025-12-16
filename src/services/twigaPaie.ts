// src/services/twigaPaie.ts
import { Alert, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

// --- Types et Interfaces ---

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'cancelled' | 'initiated' | 'expired';
export type PaymentMethod = 'emoney' | 'ecard';

export interface PaymentRequest {
  customer_phone: string;
  amount: string;
  currency: string;
  client_order_id: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface PaymentCardRequest {
  amount: string;
  currency: string;
  description: string;
}

export interface PaymentResponse {
  status: PaymentStatus;
  order_id: string;
  message: string;
  provider_id?: string;
  timestamp?: string;
}

export interface CardPaymentResponse extends PaymentResponse {
  redirect_url: string;
  orderNumber?: string;
}

export interface PaymentStatusResponse {
  status: PaymentStatus;
  order_id: string;
  amount: string;
  currency: string;
  transaction_date: string;
  provider_id?: string;
}

// --- Classe d'Erreur Personnalisée ---

export class PaymentError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: Record<string, any>,
    public isRetryable: boolean = true
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

// --- Configuration API ---

const API_URL = process.env.EXPO_PUBLIC_TWIGAPAIE_API_URL || '';
const API_KEY = process.env.EXPO_PUBLIC_TWIGAPAIE_API_KEY || '';

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// --- Utilitaires ---

export const generateOrderId = (): string => {
  return `CMD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const normalizeStatus = (status: string | undefined): PaymentStatus => {
  if (!status) return 'pending';
  const normalized = status.toLowerCase().trim();
  if (['success', 'succeeded', 'completed', 'paid'].includes(normalized)) return 'success';
  if (['failed', 'rejected', 'declined', 'error'].includes(normalized)) return 'failed';
  if (['cancelled', 'canceled'].includes(normalized)) return 'cancelled';
  if (['initiated', 'pending', 'processing', 'in_progress'].includes(normalized)) return 'pending';
  if (['expired'].includes(normalized)) return 'expired';
  return 'pending';
};

// --- Formatage et Détection du Provider ---

interface PhoneFormatResult {
  formattedPhone: string;
  providerId: string;
  providerName: string;
}

/**
 * Formate un numéro de téléphone pour l'API TwigaPaie et déduit le provider
 * @param rawPhone Le numéro de téléphone saisi (commence par 243)
 * @returns Un objet contenant le numéro formaté, l'ID et le nom du fournisseur
 */
export const formatPhoneAndDeduceProvider = (rawPhone: string): PhoneFormatResult => {
  const phone = rawPhone.replace(/\s|-|\(|\)/g, '');
  
  let normalizedPhone = phone;
  if (normalizedPhone.startsWith('+243')) {
    normalizedPhone = normalizedPhone.substring(4);
  } else if (normalizedPhone.startsWith('243')) {
    normalizedPhone = normalizedPhone.substring(3);
  }
  
  if (normalizedPhone.startsWith('0')) {
    normalizedPhone = normalizedPhone.substring(1);
  }
  
  if (normalizedPhone.length < 8) {
    throw new PaymentError('Numéro de téléphone trop court.', 'FORMAT_ERROR', {}, false);
  }
  
  const prefix = normalizedPhone.substring(0, 2);
  
  let formattedPhone: string;
  let providerId: string;
  let providerName: string;

  if (['80', '84', '85', '89'].includes(prefix)) {
    // OrangeMoney (ID 10): Format 0XXXXXXXXX
    providerId = '10';
    providerName = 'Orange Money';
    formattedPhone = `0${normalizedPhone}`;
  } else if (['81', '82', '83'].includes(prefix)) {
    // Vodacom M-Pesa (ID 9): Format 243XXXXXXXXX
    providerId = '9';
    providerName = 'Vodacom M-Pesa';
    formattedPhone = `243${normalizedPhone}`;
  } else if (['97', '98', '99'].includes(prefix)) {
    // Airtel Money (ID 17): Format XXXXXXXXX (pas de 0)
    providerId = '17';
    providerName = 'Airtel Money';
    formattedPhone = normalizedPhone;
  } else if (['90'].includes(prefix)) {
    // Africell (ID 19): Format 0XXXXXXXXX
    providerId = '19';
    providerName = 'Africell';
    formattedPhone = `0${normalizedPhone}`;
  } else {
    console.warn(`⚠️ Préfixe non reconnu: ${prefix}. Utilisation de Vodacom par défaut.`);
    providerId = '9';
    providerName = 'Vodacom M-Pesa';
    formattedPhone = `243${normalizedPhone}`;
  }

  return { formattedPhone, providerId, providerName };
};

// --- Services E-Money ---

export const initiatePayment = async (
  customer_phone: string,
  amount: string,
  client_order_id: string,
  currency: string = 'USD'
): Promise<PaymentResponse> => {
  try {
    const { formattedPhone, providerId, providerName } = formatPhoneAndDeduceProvider(customer_phone);
    
    console.log(`📱 Paiement ${providerName} - Numéro formaté: ${formattedPhone}`);
    
    const response = await fetch(`${API_URL}/payments/payment-service`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customer_phone: formattedPhone,
        amount,
        currency,
        client_order_id,
        metadata: { provider_id: providerId },
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new PaymentError(
        data?.error?.message || 'Erreur lors du paiement',
        data?.error?.code || 'API_ERROR',
        data
      );
    }

    return {
      status: normalizeStatus(data.status),
      order_id: data.order_id || client_order_id,
      message: data.message || 'Paiement initié',
      provider_id: providerId,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('❌ Erreur TwigaPaie - initiatePayment:', error);
    if (error instanceof PaymentError) throw error;
    throw new PaymentError(
      error.message || 'Impossible d\'initier le paiement',
      'PAYMENT_ERROR',
      { originalError: error.toString() }
    );
  }
};

export const checkPaymentStatus = async (order_id: string): Promise<PaymentStatusResponse> => {
  try {
    const response = await fetch(`${API_URL}/payments/payment-check`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ order_id }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new PaymentError(
        data?.error?.message || 'Erreur vérification statut',
        data?.error?.code || 'API_ERROR'
      );
    }

    return {
      status: normalizeStatus(data.status),
      order_id: data.order_id || order_id,
      amount: data.amount || '0',
      currency: data.currency || 'USD',
      transaction_date: data.transaction_date || new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('❌ Erreur TwigaPaie - checkPaymentStatus:', error);
    if (error instanceof PaymentError) throw error;
    throw new PaymentError(
      error.message || 'Impossible de vérifier le statut',
      'STATUS_CHECK_ERROR'
    );
  }
};

// --- Services E-Card (FlexPay) ---

export const initiateCardPayment = async (
  amount: string,
  currency: string = 'USD',
  description: string,
  client_order_id: string
): Promise<CardPaymentResponse> => {
  try {
    const response = await fetch(`${API_URL}/flexpay/payment-service`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        amount,
        currency,
        description,
        client_order_id,
        callback_url: 'https://femmedafrique.net/payment/callback',
        approve_url: 'https://femmedafrique.net/payment/success',
        cancel_url: 'https://femmedafrique.net/payment/cancel',
        decline_url: 'https://femmedafrique.net/payment/declined',
      }),
    });

    const data = await response.json();
    
    if (!response.ok || !data.url) {
      throw new PaymentError(
        data?.error?.message || 'Erreur initialisation paiement carte',
        data?.error?.code || 'API_ERROR',
        data,
        false
      );
    }

    return {
      status: 'initiated',
      order_id: data.orderNumber || client_order_id,
      orderNumber: data.orderNumber,
      message: data.message || 'Redirection vers la page de paiement',
      redirect_url: data.url,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('❌ Erreur TwigaPaie - initiateCardPayment:', error);
    if (error instanceof PaymentError) throw error;
    throw new PaymentError(
      error.message || 'Impossible d\'initier le paiement par carte',
      'CARD_PAYMENT_ERROR'
    );
  }
};

export const checkCardPaymentStatus = async (order_number: string): Promise<PaymentStatusResponse> => {
  try {
    const response = await fetch(`${API_URL}/flexpay/payment-check?order_number=${order_number}`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new PaymentError(
        data?.error?.message || 'Erreur vérification paiement carte',
        data?.error?.code || 'API_ERROR'
      );
    }

    const result = data.data || data;
    
    return {
      status: normalizeStatus(result.status),
      order_id: result.orderNumber || order_number,
      amount: result.amount || '0',
      currency: result.currency || 'USD',
      transaction_date: result.createdAt || new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('❌ Erreur TwigaPaie - checkCardPaymentStatus:', error);
    if (error instanceof PaymentError) throw error;
    throw new PaymentError(
      error.message || 'Impossible de vérifier le paiement carte',
      'CARD_STATUS_ERROR'
    );
  }
};

// --- Ouvrir la page de paiement carte dans le navigateur ---

export const openCardPaymentPage = async (url: string): Promise<WebBrowser.WebBrowserResult> => {
  try {
    const result = await WebBrowser.openBrowserAsync(url, {
      showTitle: true,
      enableBarCollapsing: true,
    });
    return result;
  } catch (error) {
    console.error('Erreur ouverture navigateur:', error);
    throw new PaymentError('Impossible d\'ouvrir la page de paiement', 'BROWSER_ERROR');
  }
};

// --- Gestion des erreurs ---

export const handlePaymentError = (error: any): string => {
  console.error('Payment Error:', error);

  let errorMessage = 'Une erreur inconnue est survenue. Veuillez réessayer.';

  if (error instanceof PaymentError) {
    errorMessage = error.message;
    
    if (error.code === 'TIMEOUT_ERROR') {
      errorMessage = 'Délai de connexion dépassé. Veuillez réessayer.';
    } else if (error.code === 'NETWORK_ERROR') {
      errorMessage = 'Problème de connexion. Vérifiez votre accès internet.';
    } else if (error.code === 'VALIDATION_ERROR' || error.code === 'FORMAT_ERROR') {
      errorMessage = error.message;
    }
  } else if (error instanceof Error && error.message) {
    errorMessage = error.message;
  }

  Alert.alert('❌ Erreur de Paiement', errorMessage);
  
  return errorMessage;
};
