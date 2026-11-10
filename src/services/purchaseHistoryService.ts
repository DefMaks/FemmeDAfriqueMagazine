// src/services/purchaseHistoryService.ts
import { supabase, getDeviceId } from '../lib/supabase';
import { profileService } from './profileService';

export interface PurchaseItem {
  id: string;
  type: 'magazine' | 'subscription' | 'donation';
  title: string;
  amount: number;
  currency: string;
  status: string;
  purchaseDate: string;
  magazineId?: string;
  magazineCover?: string;
  reference?: string;
}

export const purchaseHistoryService = {
  /**
   * Récupérer tous les achats de l'utilisateur (Magazines + Abonnements + Paiements)
   */
  async getUserPurchases(): Promise<PurchaseItem[]> {
    const purchases: PurchaseItem[] = [];

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id || (await getDeviceId());

      // 1. Récupérer les magazines achetés
      const { data: mags, error: magErr } = await supabase
        .from('purchased_magazines')
        .select('*')
        .eq('user_id', userId)
        .order('purchase_date', { ascending: false });

      if (!magErr && mags) {
        for (const m of mags) {
          purchases.push({
            id: m.id,
            type: 'magazine',
            title: m.magazine_title || `Magazine FAM N°${m.magazine_id}`,
            amount: Number(m.amount) || 2,
            currency: m.currency || 'USD',
            status: 'complété',
            purchaseDate: m.purchase_date || m.created_at,
            magazineId: m.magazine_id,
          });
        }
      }

      // 2. Si connecté, récupérer les paiements d'abonnement ou transactions
      if (authData?.user?.id) {
        const { data: payments, error: payErr } = await supabase
          .from('subscription_payments')
          .select('*')
          .eq('user_id', authData.user.id)
          .order('created_at', { ascending: false });

        if (!payErr && payments) {
          for (const p of payments) {
            const planLabel = p.plan === 'yearly' ? 'Abonnement Annuel FAM' : 'Abonnement Mensuel FAM';
            purchases.push({
              id: p.id,
              type: 'subscription',
              title: planLabel,
              amount: Number(p.amount) || 0,
              currency: p.currency || 'USD',
              status: p.status === 'success' ? 'confirmé' : p.status,
              purchaseDate: p.created_at,
              reference: p.reference,
            });
          }
        }
      }

      // Trier par date décroissante
      purchases.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
    } catch (e) {
      console.warn('⚠️ Erreur récupération achats:', e);
    }

    return purchases;
  },

  /**
   * Obtenir le nombre total d'achats
   */
  async getPurchasesCount(): Promise<number> {
    try {
      const items = await this.getUserPurchases();
      return items.length;
    } catch (e) {
      return 0;
    }
  },

  /**
   * Enregistrer un achat de magazine
   */
  async recordMagazinePurchase(params: {
    magazineId: string;
    magazineTitle: string;
    amount: number;
    currency?: string;
  }): Promise<boolean> {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id || (await getDeviceId());

      const { error } = await supabase
        .from('purchased_magazines')
        .upsert(
          {
            user_id: userId,
            magazine_id: params.magazineId,
            magazine_title: params.magazineTitle,
            amount: params.amount,
            currency: params.currency || 'USD',
            purchase_date: new Date().toISOString(),
          },
          { onConflict: 'user_id,magazine_id' }
        );

      if (error) {
        console.error('❌ Erreur enregistrement achat magazine:', error);
        return false;
      }

      return true;
    } catch (e) {
      console.error('❌ Exception enregistrement achat magazine:', e);
      return false;
    }
  },

  /**
   * Migrer les achats device vers l'utilisateur lors du login
   */
  async migrateDevicePurchasesToUser(authenticatedUserId: string): Promise<void> {
    try {
      const deviceId = await getDeviceId();
      if (!deviceId || deviceId === authenticatedUserId) return;

      console.log('🔄 Migration achats device vers utilisateur:', deviceId, '->', authenticatedUserId);
      await supabase
        .from('purchased_magazines')
        .update({ user_id: authenticatedUserId })
        .eq('user_id', deviceId);
    } catch (e) {
      console.warn('⚠️ Erreur migration achats:', e);
    }
  },
};
