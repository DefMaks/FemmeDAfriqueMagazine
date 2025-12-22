// src/services/transactionService.ts
// Service pour enregistrer les transactions d'achat dans Supabase DefMaks

import { createClient } from '@supabase/supabase-js';

// Configuration Supabase DefMaks
const SUPABASE_URL = process.env.EXPO_PUBLIC_DEFMAKS_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://hcpogyjdbtcxndzpyjvd.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_DEFMAKS_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Wallet ID FDA pour les transactions
const FDA_WALLET_ID = '840e8cd1-d4b2-4bdf-afb7-d5fe5f35bfc9';

// Client Supabase pour les transactions
const supabaseTransactions = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Types de devises supportées
export type CurrencyType = 'CDF' | 'USD';

// Types de transactions
export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';

// Interface pour une transaction
export interface Transaction {
  id?: string;
  wallet_id: string;
  amount: string;
  currency: CurrencyType;
  transaction_type: TransactionType;
  description: string | null;
  external_reference: string | null;
  defmaks_revenue_cdf: string;
  defmaks_revenue_usd: string;
  transaction_date?: string;
  created_at?: string;
}

// Interface pour le résultat d'insertion
export interface TransactionResult {
  success: boolean;
  transaction_id?: string;
  message?: string;
  error?: string;
}

// Taux de commission DefMaks (2%)
const DEFMAKS_COMMISSION_RATE = 0.02;

/**
 * Calcule les revenus DefMaks basé sur le montant et la devise
 */
const calculateDefmaksRevenue = (amount: number, currency: CurrencyType): { cdf: string; usd: string } => {
  const revenue = amount * DEFMAKS_COMMISSION_RATE;
  
  if (currency === 'USD') {
    return {
      cdf: '0.00',
      usd: revenue.toFixed(2),
    };
  } else {
    return {
      cdf: revenue.toFixed(2),
      usd: '0.00',
    };
  }
};

/**
 * Enregistre une transaction d'achat de magazine dans Supabase
 */
export const recordMagazineTransaction = async (
  amount: number,
  currency: CurrencyType,
  magazineTitle: string,
  externalReference?: string
): Promise<TransactionResult> => {
  try {
    console.log('💰 Enregistrement transaction Supabase...');
    
    // Calculer les revenus DefMaks
    const revenues = calculateDefmaksRevenue(amount, currency);
    
    // Préparer la transaction
    const transaction: Transaction = {
      wallet_id: FDA_WALLET_ID,
      amount: amount.toFixed(2),
      currency,
      transaction_type: 'DEPOSIT',
      description: `Achat Magazine: ${magazineTitle}`,
      external_reference: externalReference || null,
      defmaks_revenue_cdf: revenues.cdf,
      defmaks_revenue_usd: revenues.usd,
    };

    // Insérer dans Supabase
    const { data, error } = await supabaseTransactions
      .from('transactions')
      .insert(transaction)
      .select('id')
      .single();

    if (error) {
      console.error('❌ Erreur Supabase transaction:', error.message);
      return {
        success: false,
        message: 'Erreur lors de l\'enregistrement de la transaction',
        error: error.message,
      };
    }

    console.log('✅ Transaction Supabase enregistrée:', data?.id);
    return {
      success: true,
      transaction_id: data?.id,
      message: 'Transaction enregistrée avec succès',
    };
  } catch (error: any) {
    console.error('❌ Exception transactionService:', error.message);
    return {
      success: false,
      message: 'Erreur inattendue',
      error: error.message,
    };
  }
};

/**
 * Enregistre une transaction générique
 */
export const recordTransaction = async (
  amount: number,
  currency: CurrencyType,
  transactionType: TransactionType,
  description: string,
  externalReference?: string
): Promise<TransactionResult> => {
  try {
    const revenues = calculateDefmaksRevenue(amount, currency);
    
    const transaction: Transaction = {
      wallet_id: FDA_WALLET_ID,
      amount: amount.toFixed(2),
      currency,
      transaction_type: transactionType,
      description,
      external_reference: externalReference || null,
      defmaks_revenue_cdf: revenues.cdf,
      defmaks_revenue_usd: revenues.usd,
    };

    const { data, error } = await supabaseTransactions
      .from('transactions')
      .insert(transaction)
      .select('id')
      .single();

    if (error) {
      console.error('❌ Erreur Supabase transaction:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      transaction_id: data?.id,
    };
  } catch (error: any) {
    console.error('❌ Exception transaction:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Récupère les transactions du wallet FDA
 */
export const getTransactionHistory = async (limit: number = 50): Promise<Transaction[]> => {
  try {
    const { data, error } = await supabaseTransactions
      .from('transactions')
      .select('*')
      .eq('wallet_id', FDA_WALLET_ID)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Erreur récupération transactions:', error.message);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('❌ Exception getTransactionHistory:', error);
    return [];
  }
};

export default {
  recordMagazineTransaction,
  recordTransaction,
  getTransactionHistory,
  FDA_WALLET_ID,
};
