import { supabase } from '../lib/supabase';

export interface TrustPartner {
  name: string;
  type: 'principal' | 'mobile_money' | 'ecard' | 'other';
  description: string;
}

export interface TrustContent {
  id: string;
  key: string;
  title: string;
  shortMessage: string;
  modalTitle: string;
  modalContent: string;
  securityFeatures: string[];
  partners: TrustPartner[];
  ctaText: string;
  cancelText: string;
  language: string;
  appName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const stripEmojis = (str?: string): string => {
  if (!str) return '';
  return str.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
};

class TrustContentService {
  /**
   * Récupère le contenu de confiance par clé
   */
  async getTrustContent(
    key: string,
    language: string = 'fr',
    appName: string = 'fam'
  ): Promise<TrustContent | null> {
    try {
      const { data } = await supabase
        .from('trust_content')
        .select('*')
        .eq('key', key)
        .eq('language', language)
        .eq('app_name', appName)
        .eq('is_active', true)
        .maybeSingle();

      if (data) {
        return this.transformData(data);
      }

      // Essayer de récupérer le contenu par défaut (sans app_name)
      const { data: defaultData } = await supabase
        .from('trust_content')
        .select('*')
        .eq('key', key)
        .eq('language', language)
        .eq('is_active', true)
        .is('app_name', null)
        .maybeSingle();

      if (defaultData) {
        return this.transformData(defaultData);
      }

      return await this.getDefaultTrustContent();
    } catch {
      return await this.getDefaultTrustContent();
    }
  }

  /**
   * Récupère tous les contenus de confiance actifs
   */
  async getAllTrustContent(
    language: string = 'fr',
    appName?: string
  ): Promise<TrustContent[]> {
    try {
      let query = supabase
        .from('trust_content')
        .select('*')
        .eq('language', language)
        .eq('is_active', true);

      if (appName) {
        query = query.eq('app_name', appName);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching all trust content:', error);
        return [];
      }

      return data ? data.map(item => this.transformData(item)) : [];
    } catch (error) {
      console.error('Unexpected error fetching all trust content:', error);
      return [];
    }
  }

  /**
   * Met à jour un contenu de confiance
   */
  async updateTrustContent(
    id: string,
    updates: Partial<Omit<TrustContent, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('trust_content')
        .update({
          title: updates.title,
          short_message: updates.shortMessage,
          modal_title: updates.modalTitle,
          modal_content: updates.modalContent,
          security_features: updates.securityFeatures,
          partners: updates.partners,
          cta_text: updates.ctaText,
          cancel_text: updates.cancelText,
          language: updates.language,
          app_name: updates.appName,
          is_active: updates.isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating trust content:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Unexpected error updating trust content:', error);
      return false;
    }
  }

  /**
   * Crée un nouveau contenu de confiance
   */
  async createTrustContent(
    content: Omit<TrustContent, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('trust_content')
        .insert({
          key: content.key,
          title: content.title,
          short_message: content.shortMessage,
          modal_title: content.modalTitle,
          modal_content: content.modalContent,
          security_features: content.securityFeatures,
          partners: content.partners,
          cta_text: content.ctaText,
          cancel_text: content.cancelText,
          language: content.language,
          app_name: content.appName,
          is_active: content.isActive
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating trust content:', error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error('Unexpected error creating trust content:', error);
      return null;
    }
  }

  /**
   * Transforme les données de la base de données vers le format TrustContent
   */
  private transformData(data: any): TrustContent {
    return {
      id: data.id,
      key: data.key,
      title: stripEmojis(data.title),
      shortMessage: stripEmojis(data.short_message),
      modalTitle: stripEmojis(data.modal_title),
      modalContent: stripEmojis(data.modal_content),
      securityFeatures: (data.security_features || []).map((f: string) => stripEmojis(f)),
      partners: (data.partners || []).map((p: any) => ({
        ...p,
        description: stripEmojis(p.description),
      })),
      ctaText: stripEmojis(data.cta_text),
      cancelText: stripEmojis(data.cancel_text),
      language: data.language,
      appName: data.app_name,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  /**
   * Récupère le contenu par défaut si aucun n'est trouvé
   */
  async getDefaultTrustContent(): Promise<TrustContent> {
    const defaultContent: TrustContent = {
      id: 'default',
      key: 'default',
      title: 'Paiement Sécurisé',
      shortMessage: 'Transactions protégées et garanties par TwigaPaie',
      modalTitle: 'Paiement 100% Sécurisé & Transparent',
      modalContent: 'Vous finalisez votre achat. Pour garantir la sécurité de votre transaction, celle-ci est traitée par TwigaPaie, la solution de paiement développée par DefMaks.',
      securityFeatures: [
        'Transactions chiffrées de bout en bout',
        'Partenariat officiel avec les opérateurs mobiles',
        'Conformité aux standards de sécurité OHADA / PCI-DSS',
        'Support disponible 24/7 en cas de problème'
      ],
      partners: [
        {
          name: 'TwigaPaie',
          type: 'principal',
          description: 'Solution de paiement principale développée par DefMaks'
        },
        {
          name: 'AvadaPay',
          type: 'mobile_money',
          description: 'Traitement des paiements Mobile Money'
        },
        {
          name: 'FlexPaie',
          type: 'ecard',
          description: 'Traitement des paiements E-Card'
        }
      ],
      ctaText: 'Je paie en toute confiance',
      cancelText: 'Annuler',
      language: 'fr',
      appName: 'fam',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return defaultContent;
  }
}

export const trustContentService = new TrustContentService();
