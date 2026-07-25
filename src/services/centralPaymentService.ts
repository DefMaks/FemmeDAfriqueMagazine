import { supabase } from '../lib/supabase';
import {
  initiatePayment,
  initiateCardPayment,
  checkPaymentStatus as twigaCheckPaymentStatus,
  generateOrderId,
  pollPaymentStatus,
  pollCardPaymentStatus,
  isPaymentSuccessful,
  isPaymentFailed,
  PaymentStatusResponse,
  formatPhoneAndDeduceProvider,
  openCardPaymentPageSimple
} from './twigaPaie';
import { getDeviceId } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import Constants from 'expo-constants';

// Configuration
const isTest = true;
const TEST_PRICE_CDF = 100;
const STORAGE_KEY_PHONE = '@fda_user_phone';


const agent_email = Constants?.expoConfig?.extra?.EXPO_PUBLIC_AGENT;
const agent_password = Constants?.expoConfig?.extra?.EXPO_PUBLIC_AGENT_PASS;

export interface PaymentRequest {
  magazineId: string;
  magazineNumber: string;
  magazineTitle: string;
  amount: number;
  currency: string;
  paymentMethod: 'emoney' | 'ecard';
  phone?: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  orderId?: string;
  message: string;
  error?: string;
}

export interface TransactionData {
  wallet_id: string;
  amount: number;
  currency: 'CDF' | 'USD' | 'XOF';
  transaction_type: 'DEPOSIT' | 'WITHDRAWAL' | 'PURCHASE';
  description?: string;
  external_reference?: string;
  transaction_platform?: 'EMONEY' | 'ECARD' | 'BANK_TRANSFER';
}

class CentralPaymentService {
  private walletId: string;

  constructor() {
    const envWalletId = Constants.expoConfig?.extra?.EXPO_PUBLIC_WALLET_ID || '';
    console.log('Wallet ID from env:', envWalletId);

    // Validation du format UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (envWalletId && uuidRegex.test(envWalletId)) {
      this.walletId = envWalletId;
      console.log('✅ Wallet ID valide:', this.walletId);
    } else {
      // Fallback UUID si l'environnement est invalide
      this.walletId = '00000000-0000-0000-0000-000000000000';
      console.warn('⚠️ Wallet ID invalide, utilisation du fallback:', this.walletId);
      console.warn('⚠️ Veuillez vérifier la variable EXPO_PUBLIC_WALLET_ID dans .env');
    }
  }

  /**
   * Initialise un paiement complet (TwigaPaie + enregistrement Supabase)
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    try {
      console.log('🔄 Début processus paiement centralisé:', request);


      // 1. Validation des données
      if (request.paymentMethod === 'emoney' && !request.phone) {
        return { success: false, message: 'Numéro de téléphone requis pour E-Money', error: 'MISSING_PHONE' };
      }

      if (request.paymentMethod === 'emoney' && request.phone && request.phone.length < 12) {
        return { success: false, message: 'Numéro de téléphone invalide', error: 'INVALID_PHONE' };
      }

      // 2. Initiation paiement TwigaPaie
      const orderId = generateOrderId();
      let paymentResult: any;

      if (request.paymentMethod === 'emoney') {
        paymentResult = await this.processEmoneyPayment(request, orderId);
      } else {
        paymentResult = await this.processEcardPayment(request, orderId);
      }

      if (!paymentResult.success) {
        return paymentResult;
      }

      // 3. Enregistrement dans Supabase
      const transactionData: TransactionData = {
        wallet_id: this.walletId,
        amount: request.amount,
        currency: request.currency as 'CDF' | 'USD' | 'XOF',
        transaction_type: 'DEPOSIT',
        description: `Achat Magazine FDA N°${request.magazineNumber}`,
        external_reference: paymentResult.orderId,
        transaction_platform: request.paymentMethod === 'emoney' ? 'EMONEY' : 'ECARD',
      };

      const supabaseResult = await this.recordTransaction(transactionData);

      if (!supabaseResult.success) {
        console.warn('⚠️ Paiement réussi mais erreur enregistrement:', supabaseResult.message);
        return {
          success: true,
          transactionId: supabaseResult.transactionId,
          orderId: paymentResult.orderId,
          message: 'Paiement effectué mais erreur d\'enregistrement',
          error: 'SUPABASE_ERROR'
        };
      }

      console.log('✅ Processus paiement terminé avec succès');

      // Afficher une alerte de remerciement
      Alert.alert(
        '✅ Paiement réussi',
        'Merci pour votre achat ! Votre contenu est désormais accessible.', // ✅
        [{ text: 'OK' }]
      );

      return {
        success: true,
        transactionId: supabaseResult.transactionId,
        orderId: paymentResult.orderId,
        message: 'Paiement effectué et enregistré avec succès'
      };

    } catch (error) {
      console.error('❌ Erreur processus paiement:', error);
      return {
        success: false,
        message: (error as any).message || 'Erreur lors du traitement du paiement',
        error: 'PROCESSING_ERROR'
      };
    }
  }

  /**
   * Traite le paiement E-Money avec polling
   */
  private async processEmoneyPayment(request: PaymentRequest, orderId: string): Promise<PaymentResult> {
    try {
      console.log('📱 Initiation paiement E-Money:', orderId);

      const result = await initiatePayment(
        request.phone!,
        request.amount.toString(),
        orderId,
        request.currency
      );

      if (!result.success) {
        return { success: false, message: result.message || 'Échec initiation paiement', error: 'INITIATION_FAILED' };
      }

      // Polling pour vérifier le statut
      const finalStatus = await pollPaymentStatus(
        result.order_id,
        20,  // 20 tentatives
        6000,  // 6 secondes d'intervalle
        (status) => {
          console.log(`📊 Statut E-Money: ${status.status}`);
        }
      );

      if (isPaymentSuccessful(finalStatus.status)) {
        return { success: true, orderId: result.order_id, message: 'Paiement E-Money confirmé' };
      } else if (finalStatus.status === 'pending') {
        return { success: false, message: 'Paiement en attente de confirmation', error: 'PAYMENT_PENDING' };
      } else {
        return { success: false, message: 'Échec du paiement', error: 'PAYMENT_FAILED' };
      }

    } catch (error) {
      console.error('❌ Erreur paiement E-Money:', error);
      return { success: false, message: (error as any).message, error: 'EMONEY_ERROR' };
    }
  }

  /**
   * Traite le paiement E-Card avec navigateur in-app
   */
  private async processEcardPayment(request: PaymentRequest, orderId: string): Promise<PaymentResult> {
    try {
      console.log('💳 Initiation paiement E-Card:', orderId);

      const result = await initiateCardPayment(
        request.amount.toString(),
        request.currency,
        `Magazine FDA N°${request.magazineNumber}`,
        orderId
      );

      if (!result.redirect_url) {
        return { success: false, message: 'URL de paiement non disponible', error: 'NO_REDIRECT_URL' };
      }

      // Ouvrir le navigateur in-app
      const browserResult = await openCardPaymentPageSimple(result.redirect_url);
      console.log('📱 Navigateur fermé, résultat:', browserResult);

      // Vérifier le statut après fermeture
      const finalStatus = await pollCardPaymentStatus(
        result.orderNumber || orderId,
        5,  // 5 tentatives
        3000,  // 3 secondes entre chaque
        (status) => {
          console.log(`📊 Statut E-Card: ${status.status}`);
        }
      );

      if (isPaymentSuccessful(finalStatus.status)) {
        return { success: true, orderId: result.orderNumber || orderId, message: 'Paiement E-Card confirmé' };
      } else if (isPaymentFailed(finalStatus.status)) {
        return { success: false, message: 'Échec du paiement par carte', error: 'CARD_PAYMENT_FAILED' };
      } else {
        return { success: false, message: 'Paiement en attente de confirmation', error: 'CARD_PAYMENT_PENDING' };
      }

    } catch (error) {
      console.error('❌ Erreur paiement E-Card:', error);
      return { success: false, message: (error as any).message, error: 'ECARD_ERROR' };
    }
  }

  /**
   * Enregistre une transaction dans Supabase
   */

  private async recordTransaction(transactionData: TransactionData): Promise<PaymentResult> {
    try {
      console.log('Données agent: ', agent_email, agent_password);
      console.log('💾 Enregistrement transaction via Edge Function:', transactionData);

      // 1. Validation du wallet_id
      const targetWalletId = transactionData.wallet_id || this.walletId;
      if (!targetWalletId || targetWalletId === '00000000-0000-0000-0000-000000000000') {
        console.warn('⚠️ Wallet ID invalide ou introuvable, enregistrement annulé');
        return {
          success: false,
          message: 'Configuration du wallet invalide. Veuillez contacter le support.',
          error: 'INVALID_WALLET_ID'
        };
      }

      // 2. Récupération de la session ou connexion automatique avec le compte Agent

      let { data: sessionData } = await supabase.auth.getSession();
      let userToken = sessionData?.session?.access_token;

      if (!userToken) {
        console.log('🔑 Aucune session active. Connexion automatique agent...');
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: agent_email,
          password: agent_password,
        });

        if (authError) {
          console.error('❌ Échec connexion automatique agent:', authError);

        } else {
          userToken = authData.session?.access_token;
          console.log('Données agent: ', agent_email, agent_password, userToken);

          console.log('✅ Session agent établie avec succès !');
        }
      }

      // 3. Récupération des informations des parts et fees (get_cuts)
      const appWalletId = Constants.expoConfig?.extra?.EXPO_PUBLIC_WALLET_ID;
      console.log("=> Getting cuts for wallet:", appWalletId);

      let defmaksRevenueCdf = 0;
      let defmaksRevenueUsd = 0;

      try {
        const { data: cutsData, error: cutsError } = await supabase.rpc("get_cuts", {
          p_wallet_id: appWalletId
        });

        if (cutsError) {
          console.error("❌ Erreur lors de la récupération des cuts:", cutsError);
        } else if (cutsData && cutsData.length > 0) {
          console.log("📊 Cuts récupérés:", cutsData[0]);
          const cuts = cutsData[0];

          // Détermination dynamique des fees selon la monnaie courante
          if (transactionData.currency === 'CDF') {
            defmaksRevenueCdf = cuts.defmaks_fees_cdf ?? 0;
          } else {
            defmaksRevenueUsd = cuts.defmaks_fees_usd ?? 0.5;
          }
        }
      } catch (err) {
        console.error("⚠️ Exception lors de l'appel RPC get_cuts:", err);
      }

      // 4. Préparation dynamique du Payload
      const isCDF = (transactionData.currency || 'CDF') === 'CDF';

      const payload: Record<string, any> = {
        wallet_id: targetWalletId,
        amount: transactionData.amount,
        currency: transactionData.currency || 'CDF',
        transaction_type: transactionData.transaction_type || 'DEPOSIT',
        description: transactionData.description || 'Achat Magazine',
        external_reference: transactionData.external_reference || `ref-${Date.now()}`,
        transaction_platform: transactionData.transaction_platform || 'EMONEY',
        transaction_date: new Date().toISOString(),
      };

      // Injection de la clé de revenus appropriée selon la monnaie
      if (isCDF) {
        payload.defmaks_revenue_cdf = defmaksRevenueCdf;
      } else {
        payload.defmaks_revenue_usd = defmaksRevenueUsd;
      }

      console.log("📤 Payload transaction envoyé à l'Edge Function:", payload);

      // 5. Clés et jetons d'authentification HTTP
      const publishableKey = Constants?.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        || Constants?.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY;

      const authToken = userToken || publishableKey;

      if (!publishableKey) {
        console.error("❌ Aucune clé Supabase Publishable / Anon trouvée dans les configurations.");
        return {
          success: false,
          message: "Erreur de configuration client Supabase.",
          error: "MISSING_API_KEY"
        };
      }

      // 6. Appel HTTP natif (fetch) direct vers l'Edge Function
      const url = 'https://hcpogyjdbtcxndzpyjvd.supabase.co/functions/v1/create-defmaks-transaction';

      console.log("📤 Envoi HTTP Fetch direct vers Edge Function...");

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': publishableKey,
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error(`❌ Erreur Edge Function [${response.status}]:`, responseData);
        return {
          success: false,
          message: responseData.error || responseData.message || 'Erreur lors de la création de la transaction',
          error: 'EDGE_FUNCTION_ERROR'
        };
      }

      console.log('✅ Transaction enregistrée avec succès via Edge Function:', responseData);

      return {
        success: true,
        transactionId: responseData?.id || responseData?.transaction_id || responseData?.data?.id,
        message: 'Transaction enregistrée avec succès'
      };

    } catch (error: any) {
      console.error('❌ Erreur exécution enregistrement transaction:', error);
      return {
        success: false,
        message: error.message || 'Erreur de connexion lors de l\'enregistrement',
        error: 'NETWORK_ERROR'
      };
    }
  }


  /**
   * Vérifie le statut d'un paiement
   */
  async checkPaymentStatus(orderId: string, paymentMethod: 'emoney' | 'ecard'): Promise<PaymentStatusResponse> {
    try {
      if (paymentMethod === 'emoney') {
        const status = await twigaCheckPaymentStatus(orderId);
        return status;
      } else {
        // Pour E-Card, on utilise le polling
        const finalStatus = await pollCardPaymentStatus(orderId, 3, 2000);
        return finalStatus;
      }
    } catch (error) {
      console.error('❌ Erreur vérification statut:', error);
      throw error;
    }
  }

  /**
   * Récupère l'historique des transactions
   */
  async getTransactionHistory(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('wallet_id', this.walletId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Erreur récupération historique:', error);
      return [];
    }
  }

  /**
   * Calcule le prix total (test ou production)
   */
  calculatePrice(basePrice: number, tva: number): { amount: number; currency: string } {
    if (isTest) {
      return { amount: TEST_PRICE_CDF, currency: 'CDF' };
    }
    return { amount: basePrice + tva, currency: 'USD' };
  }

  /**
   * Formate le numéro de téléphone et détecte le provider
   */
  formatPhone(phone: string): { formattedPhone: string; providerName: string } {
    const result = formatPhoneAndDeduceProvider(phone);
    return {
      formattedPhone: result.formattedPhone,
      providerName: result.providerName
    };
  }

  /**
   * Sauvegarde le numéro de téléphone par défaut
   */
  async saveDefaultPhone(phone: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_PHONE, phone);
      console.log('✅ Numéro par défaut sauvegardé:', phone);
    } catch (error) {
      console.error('❌ Erreur sauvegarde numéro par défaut:', error);
    }
  }

  /**
   * Charge le numéro de téléphone par défaut
   */
  async loadDefaultPhone(): Promise<string> {
    try {
      const savedPhone = await AsyncStorage.getItem(STORAGE_KEY_PHONE);
      return savedPhone || '243';
    } catch (error) {
      console.error('❌ Erreur chargement numéro par défaut:', error);
      return '243';
    }
  }
}

// Export singleton
export const centralPaymentService = new CentralPaymentService();
