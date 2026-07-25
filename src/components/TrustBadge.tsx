import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { TrustContent, trustContentService, TrustContent as TrustContentType } from '../services/trustContentService';

interface TrustBadgeProps {
  contentKey?: string;
  language?: string;
  appName?: string;
  onCtaPress?: () => void;
  style?: any;
}

const defaultContent: TrustContent = {
  title: '🛡️ Paiement Sécurisé',
  shortMessage: 'Transactions protégées et garanties par TwigaPaie',
  modalTitle: '🛡️ Paiement 100% Sécurisé & Transparent',
  modalContent: 'Vous finalisez votre achat pour Femmes d\'Afrique. Pour garantir la sécurité de votre transaction, celle-ci est traitée par TwigaPaie, la solution de paiement développée par DefMaks.',
  securityFeatures: [
    '🔒 Transactions chiffrées de bout en bout',
    '✅ Partenariat officiel avec les opérateurs mobiles',
    '🛡️ Conformité aux standards de sécurité OHADA / PCI-DSS',
    '📞 Support disponible 24/7 en cas de problème'
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
      description: 'Traitement des paiements Mobile Money (E-Money)'
    },
    {
      name: 'FlexPaie',
      type: 'ecard',
      description: 'Traitement des paiements Carte Bancaire (E-Card)'
    }
  ],
  ctaText: 'Compris !',
  cancelText: 'Annuler',
  id: '',
  key: '',
  language: '',
  appName: '',
  isActive: false,
  createdAt: '',
  updatedAt: ''
};

const TrustBadge: React.FC<TrustBadgeProps> = ({
  contentKey = 'shop_screen_default',
  language = 'fr',
  appName = 'fam',
  onCtaPress,
  style
}) => {
  const [showModal, setShowModal] = useState(false);
  const [content, setContent] = useState<TrustContentType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrustContent();
  }, [contentKey, language, appName]);

  const loadTrustContent = async () => {
    try {
      setLoading(true);
      const trustContent = await trustContentService.getTrustContent(
        contentKey,
        language,
        appName
      );

      if (trustContent) {
        setContent(trustContent);
      } else {
        // Fallback au contenu par défaut
        const defaultContent = await trustContentService.getDefaultTrustContent();
        setContent(defaultContent);
      }
    } catch (error) {
      console.error('Error loading trust content:', error);
      // Fallback au contenu par défaut
      const defaultContent = await trustContentService.getDefaultTrustContent();
      setContent(defaultContent);
    } finally {
      setLoading(false);
    }
  };

  const handleCtaPress = () => {
    setShowModal(false);
    onCtaPress?.();
  };

  const renderPartner = (partner: TrustContentType['partners'][0], index: number) => (
    <View key={index} style={styles.partnerItem}>
      <View style={styles.partnerHeader}>
        <Text style={styles.partnerName}>{partner.name}</Text>
        <View style={[
          styles.partnerBadge,
          partner.type === 'principal' ? styles.principalBadge : styles.secondaryBadge
        ]}>
          <Text style={[
            styles.partnerBadgeText,
            partner.type === 'principal' && styles.principalBadgeText
          ]}>
            {partner.type === 'principal' ? 'Principal' : 'Partenaire'}
          </Text>
        </View>
      </View>
      <Text style={styles.partnerDescription}>{partner.description}</Text>
    </View>
  );

  return (
    <>
      {loading ? (
        <View style={[styles.trustBadge, style, styles.loadingBadge]}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.trustBadge, style]}
          onPress={() => setShowModal(true)}
          activeOpacity={0.8}
        >
          <View style={styles.badgeContent}>
            <Ionicons name="shield-checkmark" size={20} color={Colors.success} />
            <Text style={styles.badgeText}>{content?.shortMessage || defaultContent.shortMessage}</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
          </View>
        </TouchableOpacity>
      )}

      <Modal
        visible={showModal && !loading}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{content?.modalTitle || defaultContent.modalTitle}</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowModal(false)}
                >
                  <Ionicons name="close" size={24} color={Colors.textLight} />
                </TouchableOpacity>
              </View>

              {/* Main Content */}
              <Text style={styles.modalText}>{content?.modalContent || defaultContent.modalContent}</Text>

              {/* Security Features */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🔒 Pourquoi ce paiement est fiable ?</Text>
                {(content?.securityFeatures || defaultContent.securityFeatures).map((feature: string, index: number) => (
                  <Text key={index} style={styles.featureItem}>• {feature}</Text>
                ))}
              </View>

              {/* Partners Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🤝 Nos partenaires de confiance</Text>
                <View style={styles.partnersList}>
                  {(content?.partners || defaultContent.partners).map(renderPartner)}
                </View>
              </View>

              {/* Warning Message */}
              <View style={styles.warningBox}>
                <Ionicons name="information-circle" size={20} color={Colors.warning} />
                <Text style={styles.warningText}>
                  Ne soyez pas surpris si vous voyez apparaître les noms TwigaPaie, AvadaPay ou FlexPaie
                  dans vos notifications SMS ou relevés bancaires. Cela confirme que votre paiement
                  est bien pris en charge par notre écosystème sécurisé.
                </Text>
              </View>

              {/* CTA Button */}
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={handleCtaPress}
              >
                <Text style={styles.ctaButtonText}>{content?.ctaText || defaultContent.ctaText}</Text>
              </TouchableOpacity>

              {/* Cancel Link */}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelButtonText}>{content?.cancelText || defaultContent.cancelText}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  trustBadge: {
    backgroundColor: Colors.success + '15',
    borderWidth: 1,
    borderColor: Colors.success + '30',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginVertical: 10,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgeText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    width: '100%',
    maxWidth: width - 40,
    maxHeight: '80%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.text,
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  featureItem: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textLight,
    marginBottom: 4,
  },
  partnersList: {
    gap: 12,
  },
  partnerItem: {
    backgroundColor: Colors.borderLight,
    padding: 12,
    borderRadius: 8,
  },
  partnerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  partnerName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  partnerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  principalBadge: {
    backgroundColor: Colors.primary + '20',
  },
  secondaryBadge: {
    backgroundColor: Colors.backgroundLight,
  },
  partnerBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textLight,
  },
  principalBadgeText: {
    color: Colors.primary,
  },
  partnerDescription: {
    fontSize: 13,
    color: Colors.textLight,
    lineHeight: 18,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: Colors.warning + '10',
    borderWidth: 1,
    borderColor: Colors.warning + '30',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
  },
  ctaButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  ctaButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: Colors.textLight,
    fontSize: 14,
    fontWeight: '500',
  },
  loadingBadge: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.textLight,
  },
});

export default TrustBadge;
