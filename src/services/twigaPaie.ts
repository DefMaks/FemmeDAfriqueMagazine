// src/services/twigaPaie.ts
import axios from "axios";

// 🔑 Configuration API
const TWIGA_API_URL = process.env.EXPO_PUBLIC_TWIGAPAIE_API_URL || '';
const API_KEY = process.env.EXPO_PUBLIC_TWIGAPAIE_API_KEY || '';

// 🔧 Instance Axios configurée
const twigaApi = axios.create({
  baseURL: TWIGA_API_URL,
  headers: {
    "Authorization": `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  },
});

// ============================================
// 🧾 Types de réponse
// ============================================

export interface TwigaPaymentInitResponse {
  status: "success";
  order_id: string;
  message: string;
}

export interface TwigaPaymentStatusResponse {
  status: "completed" | "pending" | "failed";
  order_id: string;
  amount: string;
  currency: string;
  transaction_date?: string;
}

// Types pour E-Card (FlexPay)
export interface TwigaCardPaymentInitResponse {
  code: string;
  message: string;
  orderNumber: string;
  url: string;
  gateway_info?: {
    generated_reference: string;
    provider: string;
    payment_type: string;
  };
}

export interface TwigaCardPaymentStatusResponse {
  success: boolean;
  message: string;
  data: {
    reference: string;
    orderNumber: string;
    status: "success" | "pending" | "failed";
    amount: string;
    amountCustomer: string;
    currency: string;
    createdAt: string;
  };
  timestamp: string;
}

// ============================================
// 📱 Formatage et Détection du Provider
// ============================================

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
  // Nettoyer le numéro (retirer espaces, tirets, parenthèses)
  let phone = rawPhone.replace(/\s|-|\(|\)/g, '');
  
  // Normaliser le numéro - retirer le code pays s'il existe
  let normalizedPhone = phone;
  if (normalizedPhone.startsWith('+243')) {
    normalizedPhone = normalizedPhone.substring(4);
  } else if (normalizedPhone.startsWith('243')) {
    normalizedPhone = normalizedPhone.substring(3);
  }
  
  // Retirer le 0 initial si présent
  if (normalizedPhone.startsWith('0')) {
    normalizedPhone = normalizedPhone.substring(1);
  }
  
  if (normalizedPhone.length < 8) {
    throw new Error('Numéro de téléphone trop court.');
  }
  
  const prefix = normalizedPhone.substring(0, 2);
  
  let formattedPhone: string;
  let providerId: string;
  let providerName: string;

  // Déduction basée sur les préfixes RDC
  if (['80', '84', '85', '89'].includes(prefix)) {
    // OrangeMoney (ID 10): Format 0XXXXXXXXX
    providerId = '10';
    providerName = 'Orange Money';
    formattedPhone = `0${normalizedPhone}`;
  } else if (['81', '82', '83'].includes(prefix)) {
    // Vodacom M-Pesa (ID 9): Format +243XXXXXXXXX
    providerId = '9';
    providerName = 'Vodacom M-Pesa';
    formattedPhone = `+243${normalizedPhone}`;
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
    // Par défaut: Vodacom M-Pesa
    console.warn(`⚠️ Préfixe non reconnu: ${prefix}. Utilisation de Vodacom par défaut.`);
    providerId = '9';
    providerName = 'Vodacom M-Pesa';
    formattedPhone = `+243${normalizedPhone}`;
  }

  return { formattedPhone, providerId, providerName };
};

/**
 * Formate un numéro de téléphone pour l'API TwigaPaie (format simple)
 * @param countryCode Le code du pays (ex: '243')
 * @param phoneNumber Le numéro de téléphone (ex: '0810000000')
 * @returns Le numéro formaté (ex: '+243810000000')
 */
export const formatTwigaPaiePhone = (countryCode: string, phoneNumber: string): string => {
  const cleanedCountryCode = countryCode.replace(/\D/g, '');
  let cleanedPhoneNumber = phoneNumber.replace(/\D/g, '');

  if (cleanedPhoneNumber.startsWith('0')) {
    cleanedPhoneNumber = cleanedPhoneNumber.substring(1);
  }

  return `+${cleanedCountryCode}${cleanedPhoneNumber}`;
};

// ============================================
// 💳 Services E-Money (Mobile Money)
// ============================================

/**
 * Lancer un paiement E-Money
 */
export const initiatePayment = async (
  customer_phone: string,
  amount: string,
  client_order_id: string,
  currency: string = "USD"
): Promise<TwigaPaymentInitResponse> => {
  try {
    // Formatter le numéro automatiquement
    const { formattedPhone, providerName } = formatPhoneAndDeduceProvider(customer_phone);
    
    console.log(`📱 Paiement ${providerName} - Numéro formaté: ${formattedPhone}`);
    
    const response = await twigaApi.post("/payments/payment-service", {
      customer_phone: formattedPhone,
      amount,
      currency,
      client_order_id,
    });
    return response.data;
  } catch (error: any) {
    console.error(
      "Erreur TwigaPaie - initiatePayment:",
      error.response?.data || error.message
    );
    throw new Error(
      error.response?.data?.error?.message ||
        "Impossible d'initier le paiement. Veuillez réessayer."
    );
  }
};

/**
 * Vérifier le statut d'un paiement E-Money
 */
export const checkPaymentStatus = async (
  order_id: string
): Promise<TwigaPaymentStatusResponse> => {
  try {
    const response = await twigaApi.post("/payments/payment-check", {
      order_id,
    });
    return response.data;
  } catch (error: any) {
    console.error(
      "Erreur TwigaPaie - checkPaymentStatus:",
      error.response?.data || error.message
    );
    throw new Error(
      error.response?.data?.error?.message ||
        "Impossible de vérifier le statut du paiement."
    );
  }
};

// ============================================
// 💳 Services E-Card (Paiement par Carte)
// ============================================

/**
 * Initialiser un paiement par carte (FlexPay)
 */
export const initiateCardPayment = async (
  amount: string,
  currency: string = "USD",
  description: string,
  approve_url: string,
  cancel_url: string,
  decline_url: string,
  callback_url?: string
): Promise<TwigaCardPaymentInitResponse> => {
  try {
    const response = await twigaApi.post("/flexpay/payment-service", {
      amount,
      currency,
      description,
      callback_url: callback_url || approve_url,
      approve_url,
      cancel_url,
      decline_url,
    });
    return response.data;
  } catch (error: any) {
    console.error(
      "Erreur TwigaPaie - initiateCardPayment:",
      error.response?.data || error.message
    );
    throw new Error(
      error.response?.data?.error?.message ||
        "Impossible d'initier le paiement par carte. Veuillez réessayer."
    );
  }
};

/**
 * Vérifier le statut d'un paiement par carte
 */
export const checkCardPaymentStatus = async (
  order_number: string
): Promise<TwigaCardPaymentStatusResponse> => {
  try {
    const response = await twigaApi.get("/flexpay/payment-check", {
      params: { order_number },
    });
    return response.data;
  } catch (error: any) {
    console.error(
      "Erreur TwigaPaie - checkCardPaymentStatus:",
      error.response?.data || error.message
    );
    throw new Error(
      error.response?.data?.error?.message ||
        "Impossible de vérifier le statut du paiement par carte."
    );
  }
};
