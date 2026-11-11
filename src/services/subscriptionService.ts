// src/services/subscriptionService.ts
import { supabase, getDeviceId } from '../lib/supabase';
import {
  initiatePayment,
  initiateCardPayment,
  checkPaymentStatus,
  checkCardPaymentStatus,
  isPaymentSuccessful,
  isPaymentFailed,
} from './twigaPaie';
import { profileService } from './profileService';

export type SubscriptionPlan = 'monthly' | 'yearly';
export type SubscriptionMethod = 'emoney' | 'ecard';

export interface PlanDetails {
  id: SubscriptionPlan;
  label: string;
  price: number;
  period: string;
  months: number;
  note: string;
  badge?: string;
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, PlanDetails> = {
  monthly: {
    id: 'monthly',
    label: 'Mensuel',
    price: 5,
    period: 'par mois',
    months: 1,
    note: 'Sans engagement, renouvelable chaque mois.',
  },
  yearly: {
    id: 'yearly',
    label: 'Annuel',
    price: 45,
    period: 'par an',
    months: 12,
    note: 'Deux mois offerts par rapport à la formule mensuelle.',
    badge: '2 mois offerts',
  },
};

export const SUBSCRIPTION_BENEFITS = [
  'Accès illimité à toutes les éditions du magazine (PDF et liseuse)',
  'Accès illimité à tous les articles réservés aux abonnés',
  'Les grands entretiens et portraits en intégralité',
  'Les enquêtes et dossiers longs de la rédaction',
  'Soutien direct à une presse africaine indépendante',
];

export const subscriptionService = {
  /**
   * Récupérer les tarifs depuis l'API WordPress (avec fallback)
   */
  async getPrices(): Promise<{ monthly: number; yearly: number }> {
    try {
      const res = await fetch('https://fam.femmedafrique.net/wp-json/fam/v1/subscription-prices', {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        return {
          monthly: Number(data.monthly || 5),
          yearly: Number(data.yearly || 45),
        };
      }
    } catch {
      // Fallback
    }
    return { monthly: 5, yearly: 45 };
  },

  /**
   * Initialiser une souscription d'abonnement via TwigaPaie (Mobile Money ou Carte)
   */
  async initiateSubscription(params: {
    plan: SubscriptionPlan;
    method: SubscriptionMethod;
    phone?: string;
    autoRenew?: boolean;
    returnUrl?: string;
  }): Promise<{
    ok: boolean;
    orderId: string;
    subscriptionId?: string;
    checkoutUrl?: string | null;
    message: string;
  }> {
    const { plan, method, phone, autoRenew = true, returnUrl } = params;
    const planConfig = SUBSCRIPTION_PLANS[plan];
    const prices = await this.getPrices();
    const currentPrice = plan === 'monthly' ? prices.monthly : prices.yearly;

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;

    if (!userId) {
      return {
        ok: false,
        orderId: '',
        message: 'Vous devez être connecté pour souscrire un abonnement.',
      };
    }

    const orderId = `FAM-SUB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const description = `Femme d'Afrique Magazine - Abonnement ${planConfig.label.toLowerCase()} (${orderId})`;

    // 1. Créer la ligne dans la table subscriptions de Supabase
    const nowIso = new Date().toISOString();
    let subscriptionId: string | undefined;

    try {
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan,
          status: 'pending',
          auto_renew: autoRenew,
          started_at: nowIso,
        })
        .select('id')
        .single();

      if (!subError && subData) {
        subscriptionId = subData.id;
      }
    } catch (e) {
      console.warn('Création subscription Supabase (continuation paiement):', e);
    }

    // 2. Enregistrer le paiement en attente dans subscription_payments
    try {
      await supabase.from('subscription_payments').insert({
        user_id: userId,
        subscription_id: subscriptionId || null,
        reference: orderId,
        plan,
        method,
        amount: currentPrice,
        currency: 'USD',
        status: 'pending',
      });
    } catch (e) {
      console.warn('Création subscription_payment Supabase:', e);
    }

    // 3. Déclencher le paiement TwigaPaie
    if (method === 'emoney') {
      if (!phone) {
        return {
          ok: false,
          orderId,
          subscriptionId,
          message: 'Numéro de téléphone requis pour le paiement Mobile Money.',
        };
      }

      try {
        const paymentRes = await initiatePayment(phone, String(currentPrice), orderId, 'USD');
        return {
          ok: paymentRes.success,
          orderId,
          subscriptionId,
          checkoutUrl: null,
          message: paymentRes.success
            ? 'Veuillez valider la demande de débit sur votre téléphone (code PIN / USSD).'
            : paymentRes.message || 'Échec du paiement Mobile Money.',
        };
      } catch (err: any) {
        return {
          ok: false,
          orderId,
          subscriptionId,
          message: err?.message || 'Erreur lors du paiement Mobile Money.',
        };
      }
    }

    // Paiement par carte bancaire
    try {
      const cardRes = await initiateCardPayment(
        String(currentPrice),
        'USD',
        description,
        orderId
      );

      return {
        ok: cardRes.success,
        orderId: cardRes.order_id || orderId,
        subscriptionId,
        checkoutUrl: cardRes.redirect_url,
        message: cardRes.success
          ? 'Ouverture de la page de paiement sécurisée.'
          : cardRes.message || 'Échec du paiement par carte.',
      };
    } catch (err: any) {
      return {
        ok: false,
        orderId,
        subscriptionId,
        message: err?.message || 'Erreur lors du paiement par carte.',
      };
    }
  },

  /**
   * Vérifier et activer l'abonnement si le paiement est confirmé
   */
  async checkAndActivateSubscription(
    orderId: string,
    plan: SubscriptionPlan,
    method: SubscriptionMethod = 'emoney',
    subscriptionId?: string
  ): Promise<{ status: 'active' | 'pending' | 'failed'; message: string }> {
    try {
      const statusRes =
        method === 'ecard'
          ? await checkCardPaymentStatus(orderId)
          : await checkPaymentStatus(orderId);

      if (isPaymentSuccessful(statusRes.status)) {
        const planConfig = SUBSCRIPTION_PLANS[plan];
        const now = new Date();
        const endsAt = new Date(now.getTime() + planConfig.months * 30 * 24 * 60 * 60 * 1000);

        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;

        if (userId) {
          // Mettre à jour la table subscriptions
          if (subscriptionId) {
            await supabase
              .from('subscriptions')
              .update({
                status: 'active',
                started_at: now.toISOString(),
                ends_at: endsAt.toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', subscriptionId);
          } else {
            await supabase
              .from('subscriptions')
              .update({
                status: 'active',
                started_at: now.toISOString(),
                ends_at: endsAt.toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', userId)
              .eq('plan', plan);
          }

          // Mettre à jour subscription_payments
          await supabase
            .from('subscription_payments')
            .update({
              status: 'success',
              updated_at: new Date().toISOString(),
            })
            .eq('reference', orderId);

          // Forcer le rechargement du profil
          await profileService.getCurrentProfile();
        }

        return {
          status: 'active',
          message: 'Félicitations ! Votre abonnement est désormais actif.',
        };
      }

      if (isPaymentFailed(statusRes.status)) {
        await supabase
          .from('subscription_payments')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('reference', orderId);

        return {
          status: 'failed',
          message: 'Le paiement a échoué ou a été refusé.',
        };
      }

      return {
        status: 'pending',
        message: 'Paiement en attente de confirmation.',
      };
    } catch (e: any) {
      return {
        status: 'pending',
        message: e?.message || 'Vérification en cours...',
      };
    }
  },
};

