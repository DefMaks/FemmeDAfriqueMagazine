// src/services/twigaPaie.ts
import axios from "axios";

const TWIGA_API_URL = "https://api-gateway-production-9ad5.up.railway.app/api";
const API_KEY = "votre_clé_api_secrète"; // À stocker dans .env ou secure storage

const twigaApi = axios.create({
  baseURL: TWIGA_API_URL,
  headers: {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json",
  },
});

export const initiatePayment = async (
  phone: string,
  amount: string,
  orderId: string
) => {
  try {
    const response = await twigaApi.post("/payments/payment-service", {
      customer_phone: phone,
      amount,
      currency: "XOF", // ou autre selon ton besoin
      client_order_id: orderId,
    });
    return response.data;
  } catch (error) {
    console.error("Erreur paiement:", error);
    throw error;
  }
};

export const checkPaymentStatus = async (orderId: string) => {
  try {
    const response = await twigaApi.post("/payments/payment-check", {
      order_id: orderId,
    });
    return response.data;
  } catch (error) {
    console.error("Erreur vérification paiement:", error);
    throw error;
  }
};
