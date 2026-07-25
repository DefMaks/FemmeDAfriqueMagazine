import Constants from 'expo-constants';
import { supabase, getDeviceId } from '../lib/supabase';

// Use environment variables for TwigaPaie configuration
const TWIGAPAIE_API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_TWIGAPAIE_API_URL || '';
const TWIGAPAIE_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_TWIGAPAIE_API_KEY || '';

// Validation: Ensure API URL and key are configured
if (!TWIGAPAIE_API_URL) {
  console.warn('⚠️ WARNING: TwigaPaie API URL is not configured. Payment functionality will not work.');
}
if (!TWIGAPAIE_API_KEY) {
  console.warn('⚠️ WARNING: TwigaPaie API key is not configured. Payment functionality will not work.');
}

export interface PaymentPayload {
  customer_phone: string;
  amount: string;
  currency: string;
  client_order_id: string;
}

export interface PaymentResponse {
  status: string;
  order_id: string;
  message: string;
}

export interface PaymentStatusResponse {
  status: string;
  order_id: string;
  amount: string;
  currency: string;
  transaction_date: string;
}

export const twigaPaieService = {
  async initiatePayment(payload: PaymentPayload): Promise<PaymentResponse> {
    try {
      const response = await fetch(`${TWIGAPAIE_API_URL}/payments/payment-service`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + TWIGAPAIE_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('TwigaPaie payment error:', error);
      throw error;
    }
  },

  async checkPaymentStatus(orderId: string): Promise<PaymentStatusResponse> {
    try {
      const response = await fetch(`${TWIGAPAIE_API_URL}/payments/payment-check`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + TWIGAPAIE_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ order_id: orderId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('TwigaPaie status check error:', error);
      throw error;
    }
  },
};

export interface ProfileData {
  id: string;
  device_id: string;
  email?: string;
  phone?: string;
}

export interface WalletData {
  id: string;
  profile_id: string;
  wallet_address: string;
  balance_cdf: number;
  balance_usd: number;
}

export interface TransactionData {
  wallet_id: string;
  amount: number;
  currency: 'CDF' | 'USD' | 'XOF';
  transaction_type: 'DEPOSIT' | 'WITHDRAWAL' | 'PURCHASE';
  description: string;
  external_reference?: string;
}

export const walletService = {
  async getOrCreateProfile(phone?: string, email?: string): Promise<ProfileData> {
    try {
      const deviceId = await getDeviceId();

      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('device_id', deviceId)
        .maybeSingle();

      if (existingProfile) {
        return existingProfile;
      }

      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          device_id: deviceId,
          phone,
          email,
        })
        .select()
        .single();

      if (createError) throw createError;
      return newProfile;
    } catch (error) {
      console.error('Error getting/creating profile:', error);
      throw error;
    }
  },

  async getOrCreateWallet(profileId: string): Promise<WalletData> {
    try {
      const { data: existingWallet, error: fetchError } = await supabase
        .from('wallets')
        .select('*')
        .eq('profile_id', profileId)
        .maybeSingle();

      if (existingWallet) {
        return existingWallet;
      }

      const { data: newWallet, error: createError } = await supabase
        .from('wallets')
        .insert({
          profile_id: profileId,
          wallet_address: '',
        })
        .select()
        .single();

      if (createError) throw createError;
      return newWallet;
    } catch (error) {
      console.error('Error getting/creating wallet:', error);
      throw error;
    }
  },

  async createTransaction(transaction: TransactionData): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('transactions')
        .insert(transaction);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error creating transaction:', error);
      return false;
    }
  },

  async getWalletBalance(profileId: string): Promise<WalletData | null> {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('profile_id', profileId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      return null;
    }
  },

  async getTransactionHistory(walletId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('wallet_id', walletId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return [];
    }
  },

  async purchaseMagazine(profileId: string, magazineId: string, transactionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('purchased_magazines')
        .insert({
          profile_id: profileId,
          magazine_id: magazineId,
          transaction_id: transactionId,
        });

      if (error) {
        if (error.code === '23505') {
          console.log('Magazine already purchased');
          return true;
        }
        throw error;
      }
      return true;
    } catch (error) {
      console.error('Error recording magazine purchase:', error);
      return false;
    }
  },

  async hasPurchasedMagazine(profileId: string, magazineId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('purchased_magazines')
        .select('id')
        .eq('profile_id', profileId)
        .eq('magazine_id', magazineId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking magazine purchase:', error);
      return false;
    }
  },
};
