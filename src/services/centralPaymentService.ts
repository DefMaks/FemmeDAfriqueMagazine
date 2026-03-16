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

// Configuration
const isTest = true;
const TEST_PRICE_CDF = 100;
const STORAGE_KEY_PHONE = '@fda_user_phone';

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
    const envWalletId = process.env.EXPO_PUBLIC_WALLET_ID || '';
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
        description: `Magazine FDA N°${request.magazineNumber}`,
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
        'Merci pour votre paiement, le magazine est en cours de téléchargement',
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
      console.log('💾 Enregistrement transaction Supabase:', transactionData);

      // Validation finale du wallet_id
      if (!this.walletId || this.walletId === '00000000-0000-0000-0000-000000000000') {
        console.warn('⚠️ Wallet ID fallback détecté, enregistrement annulé');
        return { 
          success: false, 
          message: 'Configuration du wallet invalide. Veuillez contacter le support.', 
          error: 'INVALID_WALLET_ID' 
        };
      }

      console.log('transactionData: ',transactionData);

      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select();

      if (error) {
        console.error('❌ Erreur enregistrement Supabase:', error);
        return { success: false, message: error.message, error: 'SUPABASE_ERROR' };
      }

      console.log('✅ Transaction enregistrée:', data[0]?.id);
      return {
        success: true,
        transactionId: data[0]?.id,
        message: 'Transaction enregistrée avec succès'
      };

    } catch (error) {
      console.error('❌ Erreur enregistrement transaction:', error);
      return { success: false, message: (error as any).message, error: 'NETWORK_ERROR' };
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
