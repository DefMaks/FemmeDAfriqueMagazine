// src/services/twigaPaie.ts
import { Alert, Platform, Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

// --- Types et Interfaces ---

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'cancelled' | 'initiated' | 'expired' | 'completed' | 'processing';
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
  rawStatus?: string;
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

// --- URLs de callback pour FlexPay ---
const CALLBACK_URLS = {
  callback_url: 'https://femmedafrique.net/api/webhooks/flexpay/callback',
  approve_url: 'https://femmedafrique.net/payment/success',
  cancel_url: 'https://femmedafrique.net/payment/cancel',
  decline_url: 'https://femmedafrique.net/payment/declined',
};

// --- Utilitaires ---

export const generateOrderId = (): string => {
  return `CMD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Normalise le statut de paiement selon la documentation TwigaPaie
 */
const normalizeStatus = (status: string | undefined): PaymentStatus => {
  if (!status) return 'pending';
  const normalized = status.toLowerCase().trim();
  
  // Statuts de succès
  if (['success', 'succeeded', 'completed', 'paid', '0', '1'].includes(normalized)) return 'success';
  
  // Statuts d'échec
  if (['failed', 'rejected', 'declined', 'error', '2'].includes(normalized)) return 'failed';
  
  // Statuts d'annulation
  if (['cancelled', 'canceled'].includes(normalized)) return 'cancelled';
  
  // Statuts en cours
  if (['initiated', 'pending', 'processing', 'in_progress'].includes(normalized)) return 'pending';
  
  // Statut expiré
  if (['expired'].includes(normalized)) return 'expired';
  
  return 'pending';
};

/**
 * Vérifie si le statut indique un succès
 */
export const isPaymentSuccessful = (status: PaymentStatus): boolean => {
  return status === 'success' || status === 'completed';
};

/**
 * Vérifie si le statut indique un échec définitif
 */
export const isPaymentFailed = (status: PaymentStatus): boolean => {
  return ['failed', 'cancelled', 'expired'].includes(status);
};

/**
 * Vérifie si le paiement est toujours en cours
 */
export const isPaymentPending = (status: PaymentStatus): boolean => {
  return ['pending', 'initiated', 'processing'].includes(status);
};

// --- Formatage et Détection du Provider ---

interface PhoneFormatResult {
  formattedPhone: string;
  providerId: string;
  providerName: string;
}

/**
 * Formate un numéro de téléphone pour l'API TwigaPaie et déduit le provider
 * Format attendu par TwigaPaie: +<CodePays><NuméroSansZeroInitial>
 * @param rawPhone Le numéro de téléphone saisi (commence par 243)
 * @returns Un objet contenant le numéro formaté, l'ID et le nom du fournisseur
 */
export const formatPhoneAndDeduceProvider = (rawPhone: string): PhoneFormatResult => {
  // Nettoyer le numéro de tous les caractères non numériques
  let phone = rawPhone.replace(/[^0-9]/g, '');
  
  // Extraire le numéro local (sans code pays)
  let localNumber = phone;
  if (localNumber.startsWith('243')) {
    localNumber = localNumber.substring(3);
  }
  
  // Supprimer le zéro initial s'il existe
  if (localNumber.startsWith('0')) {
    localNumber = localNumber.substring(1);
  }
  
  if (localNumber.length < 8) {
    throw new PaymentError('Numéro de téléphone trop court.', 'FORMAT_ERROR', {}, false);
  }
  
  const prefix = localNumber.substring(0, 2);
  
  let formattedPhone: string;
  let providerId: string;
  let providerName: string;

  // Format selon la documentation TwigaPaie: +243XXXXXXXXX
  if (['80', '84', '85', '89'].includes(prefix)) {
    // OrangeMoney (ID 10)
    providerId = '10';
    providerName = 'Orange Money';
    formattedPhone = `+243${localNumber}`;
  } else if (['81', '82', '83'].includes(prefix)) {
    // Vodacom M-Pesa (ID 9)
    providerId = '9';
    providerName = 'Vodacom M-Pesa';
    formattedPhone = `+243${localNumber}`;
  } else if (['97', '98', '99'].includes(prefix)) {
    // Airtel Money (ID 17)
    providerId = '17';
    providerName = 'Airtel Money';
    formattedPhone = `+243${localNumber}`;
  } else if (['90'].includes(prefix)) {
    // Africell (ID 19)
    providerId = '19';
    providerName = 'Africell';
    formattedPhone = `+243${localNumber}`;
  } else {
    console.warn(`⚠️ Préfixe non reconnu: ${prefix}. Utilisation de Vodacom par défaut.`);
    providerId = '9';
    providerName = 'Vodacom M-Pesa';
    formattedPhone = `+243${localNumber}`;
  }

  console.log(`📱 Formatage téléphone: ${rawPhone} -> ${formattedPhone} (${providerName})`);
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
    
    console.log(`📱 Initiation paiement ${providerName}`);
    console.log(`   📞 Numéro formaté: ${formattedPhone}`);
    console.log(`   💰 Montant: ${amount} ${currency}`);
    console.log(`   🆔 Order ID: ${client_order_id}`);
    
    const requestBody = {
      customer_phone: formattedPhone,
      amount,
      currency,
      client_order_id,
      metadata: { provider_id: providerId },
    };
    
    console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${API_URL}/payments/payment-service`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    console.log('📥 Response:', JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      throw new PaymentError(
        data?.error?.message || data?.message || 'Erreur lors du paiement',
        data?.error?.code || data?.code || 'API_ERROR',
        data
      );
    }

    return {
      status: normalizeStatus(data.status),
      order_id: data.order_id || client_order_id,
      message: data.message || 'Paiement initié avec succès',
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

/**
 * Vérifie le statut d'un paiement E-Money
 * Endpoint: POST /api/payments/payment-check
 */
export const checkPaymentStatus = async (order_id: string): Promise<PaymentStatusResponse> => {
  try {
    console.log(`🔍 Vérification statut paiement E-Money: ${order_id}`);
    
    const response = await fetch(`${API_URL}/payments/payment-check`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ order_id }),
    });

    const data = await response.json();
    console.log('📥 Statut E-Money Response:', JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      throw new PaymentError(
        data?.error?.message || data?.message || 'Erreur vérification statut',
        data?.error?.code || 'API_ERROR'
      );
    }

    const status = normalizeStatus(data.status);
    console.log(`📊 Statut normalisé: ${data.status} -> ${status}`);

    return {
      status,
      order_id: data.order_id || order_id,
      amount: data.amount || '0',
      currency: data.currency || 'USD',
      transaction_date: data.transaction_date || new Date().toISOString(),
      rawStatus: data.status,
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

/**
 * Polling pour vérifier le statut d'un paiement E-Money avec tentatives multiples
 */
export const pollPaymentStatus = async (
  order_id: string,
  maxAttempts: number = 6,
  intervalMs: number = 5000,
  onStatusChange?: (status: PaymentStatusResponse) => void
): Promise<PaymentStatusResponse> => {
  console.log(`🔄 Début polling paiement E-Money: ${order_id} (max ${maxAttempts} tentatives)`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`   Tentative ${attempt}/${maxAttempts}...`);
      
      const statusResponse = await checkPaymentStatus(order_id);
      
      if (onStatusChange) {
        onStatusChange(statusResponse);
      }
      
      if (isPaymentSuccessful(statusResponse.status)) {
        console.log(`✅ Paiement confirmé après ${attempt} tentative(s)`);
        return statusResponse;
      }
      
      if (isPaymentFailed(statusResponse.status)) {
        console.log(`❌ Paiement échoué: ${statusResponse.status}`);
        return statusResponse;
      }
      
      // Attendre avant la prochaine tentative si ce n'est pas la dernière
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    } catch (error) {
      console.error(`   Erreur tentative ${attempt}:`, error);
      if (attempt === maxAttempts) throw error;
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
  
  // Retourner le dernier statut (pending) si toutes les tentatives sont épuisées
  return {
    status: 'pending',
    order_id,
    amount: '0',
    currency: 'USD',
    transaction_date: new Date().toISOString(),
  };
};

// --- Services E-Card (FlexPay) ---

/**
 * Initialise un paiement par carte via FlexPay
 * Endpoint: POST /api/flexpay/payment-service
 */
export const initiateCardPayment = async (
  amount: string,
  currency: string = 'USD',
  description: string,
  client_order_id: string
): Promise<CardPaymentResponse> => {
  try {
    console.log('💳 Initiation paiement par carte FlexPay');
    console.log(`   💰 Montant: ${amount} ${currency}`);
    console.log(`   📝 Description: ${description}`);
    console.log(`   🆔 Order ID: ${client_order_id}`);
    
    const requestBody = {
      amount,
      currency,
      description,
      ...CALLBACK_URLS,
    };
    
    console.log('📤 Request body:', JSON.stringify(requestBody, null, 2));
    console.log('📤 API URL:', `${API_URL}/flexpay/payment-service`);
    
    const response = await fetch(`${API_URL}/flexpay/payment-service`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    console.log('📥 FlexPay Response:', JSON.stringify(data, null, 2));
    
    // Extraire l'URL de redirection selon la structure de réponse
    const redirectUrl = data.url || data.redirect_url || data.data?.url;
    const orderNumber = data.orderNumber || data.order_number || data.data?.orderNumber || client_order_id;
    
    if (!response.ok || data.success === false || data.code === '-1') {
      console.error('❌ FlexPay API Error:', data);
      const errorMessage = data?.message || data?.error?.message || 'Erreur initialisation paiement carte';
      
      throw new PaymentError(
        errorMessage,
        data?.code || data?.error?.code || 'FLEXPAY_ERROR',
        data,
        false
      );
    }
    
    if (!redirectUrl) {
      console.error('❌ No redirect URL in response:', data);
      throw new PaymentError(
        'Aucune URL de paiement reçue. Veuillez réessayer.',
        'NO_REDIRECT_URL',
        data,
        true
      );
    }

    console.log(`✅ URL de paiement obtenue: ${redirectUrl}`);
    console.log(`✅ Order Number: ${orderNumber}`);

    return {
      status: 'initiated',
      order_id: orderNumber,
      orderNumber: orderNumber,
      message: data.message || 'Redirection vers la page de paiement',
      redirect_url: redirectUrl,
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

/**
 * Vérifie le statut d'un paiement par carte FlexPay
 * Endpoint: GET /api/flexpay/payment-check?order_number=xxx
 */
export const checkCardPaymentStatus = async (order_number: string): Promise<PaymentStatusResponse> => {
  try {
    console.log(`🔍 Vérification statut paiement FlexPay: ${order_number}`);
    
    const response = await fetch(`${API_URL}/flexpay/payment-check?order_number=${encodeURIComponent(order_number)}`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();
    console.log('📥 Statut FlexPay Response:', JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      throw new PaymentError(
        data?.error?.message || data?.message || 'Erreur vérification paiement carte',
        data?.error?.code || 'API_ERROR'
      );
    }

    // Extraire les données selon la structure de réponse
    const result = data.data || data;
    const rawStatus = result.status || data.status;
    const status = normalizeStatus(rawStatus);
    
    console.log(`📊 Statut FlexPay: ${rawStatus} -> ${status}`);
    
    return {
      status,
      order_id: result.orderNumber || order_number,
      amount: result.amount || result.amountCustomer || '0',
      currency: result.currency || 'USD',
      transaction_date: result.createdAt || new Date().toISOString(),
      rawStatus,
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

/**
 * Polling pour vérifier le statut d'un paiement FlexPay avec tentatives multiples
 */
export const pollCardPaymentStatus = async (
  order_number: string,
  maxAttempts: number = 10,
  intervalMs: number = 3000,
  onStatusChange?: (status: PaymentStatusResponse) => void
): Promise<PaymentStatusResponse> => {
  console.log(`🔄 Début polling paiement FlexPay: ${order_number} (max ${maxAttempts} tentatives)`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`   Tentative ${attempt}/${maxAttempts}...`);
      
      const statusResponse = await checkCardPaymentStatus(order_number);
      
      if (onStatusChange) {
        onStatusChange(statusResponse);
      }
      
      if (isPaymentSuccessful(statusResponse.status)) {
        console.log(`✅ Paiement carte confirmé après ${attempt} tentative(s)`);
        return statusResponse;
      }
      
      if (isPaymentFailed(statusResponse.status)) {
        console.log(`❌ Paiement carte échoué: ${statusResponse.status}`);
        return statusResponse;
      }
      
      // Attendre avant la prochaine tentative si ce n'est pas la dernière
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    } catch (error) {
      console.error(`   Erreur tentative ${attempt}:`, error);
      if (attempt === maxAttempts) throw error;
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
  
  // Retourner le dernier statut (pending) si toutes les tentatives sont épuisées
  return {
    status: 'pending',
    order_id: order_number,
    amount: '0',
    currency: 'USD',
    transaction_date: new Date().toISOString(),
  };
};

// --- Ouvrir la page de paiement carte dans le navigateur ---

export interface CardPaymentBrowserResult {
  type: 'success' | 'cancel' | 'dismiss';
  orderNumber: string;
}

/**
 * Ouvre la page de paiement FlexPay dans le navigateur in-app
 * Le navigateur se fermera automatiquement lors de la redirection vers approve_url, cancel_url ou decline_url
 */
export const openCardPaymentPage = async (
  url: string,
  orderNumber: string
): Promise<CardPaymentBrowserResult> => {
  try {
    console.log(`🌐 Ouverture page de paiement: ${url}`);
    
    const result = await WebBrowser.openAuthSessionAsync(
      url,
      'femmedafrique://',  // URL scheme pour le retour
      {
        showInRecents: true,
        preferEphemeralSession: false,
      }
    );
    
    console.log('📱 Résultat navigateur:', result);
    
    if (result.type === 'success' && result.url) {
      // Analyser l'URL de retour pour déterminer le statut
      const returnUrl = result.url.toLowerCase();
      
      if (returnUrl.includes('success') || returnUrl.includes('approve')) {
        return { type: 'success', orderNumber };
      } else if (returnUrl.includes('cancel')) {
        return { type: 'cancel', orderNumber };
      } else if (returnUrl.includes('decline') || returnUrl.includes('failed')) {
        return { type: 'cancel', orderNumber };
      }
    }
    
    // Par défaut, considérer comme dismiss (fermeture manuelle)
    return { type: 'dismiss', orderNumber };
    
  } catch (error) {
    console.error('❌ Erreur ouverture navigateur:', error);
    throw new PaymentError('Impossible d\'ouvrir la page de paiement', 'BROWSER_ERROR');
  }
};

/**
 * Version simplifiée pour ouvrir le navigateur (sans attendre le retour)
 */
export const openCardPaymentPageSimple = async (url: string): Promise<WebBrowser.WebBrowserResult> => {
  try {
    console.log(`🌐 Ouverture page de paiement (simple): ${url}`);
    
    const result = await WebBrowser.openBrowserAsync(url, {
      showTitle: true,
      enableBarCollapsing: true,
    });
    
    console.log('📱 Résultat navigateur:', result);
    return result;
  } catch (error) {
    console.error('❌ Erreur ouverture navigateur:', error);
    throw new PaymentError('Impossible d\'ouvrir la page de paiement', 'BROWSER_ERROR');
  }
};

// --- Gestion des erreurs ---

export const handlePaymentError = (error: any): string => {
  console.error('🚨 Payment Error:', error);

  let errorMessage = 'Une erreur inconnue est survenue. Veuillez réessayer.';
  let errorTitle = '❌ Erreur de Paiement';

  if (error instanceof PaymentError) {
    errorMessage = error.message;
    
    switch (error.code) {
      case 'TIMEOUT_ERROR':
        errorMessage = 'Délai de connexion dépassé. Veuillez réessayer.';
        break;
      case 'NETWORK_ERROR':
        errorMessage = 'Problème de connexion. Vérifiez votre accès internet.';
        break;
      case 'VALIDATION_ERROR':
      case 'FORMAT_ERROR':
        errorTitle = '⚠️ Erreur de Validation';
        break;
      case 'FLEXPAY_ERROR':
        errorTitle = '💳 Erreur Paiement Carte';
        errorMessage = 'Le service de paiement par carte est temporairement indisponible. Veuillez utiliser le paiement mobile money ou réessayer plus tard.';
        break;
      case 'CARD_STATUS_ERROR':
      case 'STATUS_CHECK_ERROR':
        errorTitle = '🔍 Erreur de Vérification';
        break;
    }
  } else if (error instanceof Error && error.message) {
    errorMessage = error.message;
  }

  Alert.alert(errorTitle, errorMessage);
  
  return errorMessage;
};

/**
 * Affiche un message de statut de paiement
 */
export const showPaymentStatusAlert = (status: PaymentStatus, context: string = 'paiement'): void => {
  switch (status) {
    case 'success':
    case 'completed':
      Alert.alert('✅ Succès', `Votre ${context} a été effectué avec succès !`);
      break;
    case 'pending':
    case 'initiated':
    case 'processing':
      Alert.alert('⏳ En cours', `Votre ${context} est en cours de traitement. Veuillez patienter.`);
      break;
    case 'failed':
      Alert.alert('❌ Échec', `Votre ${context} a échoué. Veuillez réessayer.`);
      break;
    case 'cancelled':
      Alert.alert('🚫 Annulé', `Votre ${context} a été annulé.`);
      break;
    case 'expired':
      Alert.alert('⏰ Expiré', `Votre ${context} a expiré. Veuillez recommencer.`);
      break;
  }
};
