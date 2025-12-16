// src/services/twigaPaie.ts
import axios from "axios";

// 🔑 Configuration API
const TWIGA_API_URL = process.env.EXPO_PUBLIC_TWIGAPAIE_API_URL;
// ⚠️ Remplace ceci par ta vraie clé API (en production, utilise un backend sécurisé !)
const API_KEY =
  process.env.EXPO_PUBLIC_TWIGAPAIE_API_KEY || '';

// 🔧 Instance Axios configurée
const twigaApi = axios.create({
  baseURL: TWIGA_API_URL,
  headers: {
    "Authorization": `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  },
});

// 🧾 Types de réponse
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

// 💳 1. Lancer un paiement
export const initiatePayment = async (
  customer_phone: string,
  amount: string,
  client_order_id: string
): Promise<TwigaPaymentInitResponse> => {
  try {
    const response = await twigaApi.post("/payments/payment-service", {
      customer_phone,
      amount,
      currency: "USD", // ou 'XOF' selon ton besoin
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
        "Impossible d’initier le paiement. Veuillez réessayer."
    );
  }
};

// 🔍 2. Vérifier le statut d’un paiement
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
