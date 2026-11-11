// src/screens/SubscriptionScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Colors } from '../theme/colors';
import {
  subscriptionService,
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_BENEFITS,
  SubscriptionPlan,
  SubscriptionMethod,
} from '../services/subscriptionService';
import { formatPhoneAndDeduceProvider } from '../services/twigaPaie';
import { profileService } from '../services/profileService';
import TrustBadge from '../components/TrustBadge';

export const SubscriptionScreen = ({ navigation }: any) => {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('yearly');
  const [method, setMethod] = useState<SubscriptionMethod>('emoney');
  const [phone, setPhone] = useState('');
  const [detectedProvider, setDetectedProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [prices, setPrices] = useState({ monthly: 5, yearly: 45 });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);

  // Modal de suivi du paiement
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [pendingSubId, setPendingSubId] = useState<string | undefined>(undefined);
  const [statusMessage, setStatusMessage] = useState('Paiement initié...');
  const [isVerifying, setIsVerifying] = useState(false);
  const pollIntervalRef = useRef<any>(null);

  useEffect(() => {
    loadInitialData();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const loadInitialData = async () => {
    try {
      const [fetchedPrices, profile] = await Promise.all([
        subscriptionService.getPrices(),
        profileService.getCurrentProfile(),
      ]);

      if (fetchedPrices) setPrices(fetchedPrices);
      if (profile) {
        setCurrentUser(profile);
        if (profile.subscription?.status === 'active') {
          setCurrentSubscription(profile.subscription);
        }
        if (profile.profile_data?.phone) {
          const raw = profile.profile_data.phone;
          setPhone(raw);
          try {
            const { providerName } = formatPhoneAndDeduceProvider(raw);
            setDetectedProvider(providerName);
          } catch {}
        }
      }
    } catch (e) {
      console.warn('Erreur chargement données abonnement:', e);
    }
  };

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    try {
      if (val.length >= 9) {
        const { providerName } = formatPhoneAndDeduceProvider(val);
        setDetectedProvider(providerName);
      } else {
        setDetectedProvider(null);
      }
    } catch {
      setDetectedProvider(null);
    }
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const startPolling = (orderId: string, subId?: string) => {
    stopPolling();
    let attempts = 0;
    pollIntervalRef.current = setInterval(async () => {
      attempts += 1;
      const res = await subscriptionService.checkAndActivateSubscription(
        orderId,
        selectedPlan,
        method,
        subId
      );

      if (res.status === 'active') {
        stopPolling();
        setIsVerifying(false);
        setShowStatusModal(false);
        Alert.alert(
          'Abonnement actif',
          'Votre abonnement est désormais validé. Vous avez un accès illimité à tous les contenus de Femme d\'Afrique Magazine.',
          [{ text: 'Continuer', onPress: () => navigation.navigate('Main') }]
        );
      } else if (res.status === 'failed') {
        stopPolling();
        setIsVerifying(false);
        setStatusMessage(res.message);
      } else if (attempts >= 15) {
        stopPolling();
        setIsVerifying(false);
        setStatusMessage('Délai d\'attente dépassé. Vous pouvez vérifier le statut manuellement.');
      }
    }, 4000);
  };

  const handleManualCheck = async () => {
    if (!pendingOrderId) return;
    setIsVerifying(true);
    const res = await subscriptionService.checkAndActivateSubscription(
      pendingOrderId,
      selectedPlan,
      method,
      pendingSubId
    );
    setIsVerifying(false);

    if (res.status === 'active') {
      stopPolling();
      setShowStatusModal(false);
      Alert.alert('Succès', res.message, [
        { text: 'Super !', onPress: () => navigation.navigate('Main') },
      ]);
    } else {
      setStatusMessage(res.message);
    }
  };

  const handleSubscribe = async () => {
    // Si l'utilisateur n'est pas connecté
    if (!currentUser || !currentUser.id) {
      Alert.alert(
        'Connexion requise',
        'Pour associer votre abonnement à votre compte et en profiter sur tous vos appareils, veuillez vous connecter.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Se connecter', onPress: () => navigation.navigate('AuthScreen') },
        ]
      );
      return;
    }

    if (method === 'emoney' && (!phone || phone.length < 9)) {
      Alert.alert('Numéro incomplet', 'Veuillez saisir un numéro de téléphone Mobile Money valide (ex: 243810000000).');
      return;
    }

    setLoading(true);
    try {
      const res = await subscriptionService.initiateSubscription({
        plan: selectedPlan,
        method,
        phone: method === 'emoney' ? phone : undefined,
      });

      if (!res.ok) {
        Alert.alert('Erreur', res.message);
        setLoading(false);
        return;
      }

      setPendingOrderId(res.orderId);
      setPendingSubId(res.subscriptionId);
      setStatusMessage(res.message);

      if (method === 'ecard' && res.checkoutUrl) {
        setShowStatusModal(true);
        await WebBrowser.openBrowserAsync(res.checkoutUrl);
        startPolling(res.orderId, res.subscriptionId);
      } else {
        setShowStatusModal(true);
        startPolling(res.orderId, res.subscriptionId);
      }
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Une erreur est survenue lors de l\'initialisation.');
    } finally {
      setLoading(false);
    }
  };

  const monthlyPrice = prices.monthly;
  const yearlyPrice = prices.yearly;
  const currentPlanPrice = selectedPlan === 'monthly' ? monthlyPrice : yearlyPrice;
  const currentPlanPeriod = selectedPlan === 'monthly' ? 'mois' : 'an';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Abonnement</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Intro Banner */}
        <View style={styles.introSection}>
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>Formules d'abonnement</Text>
          </View>
          <Text style={styles.heroTitle}>Lisez tout Femme d'Afrique</Text>
          <Text style={styles.heroSubtitle}>
            Accédez en illimité à tous les numéros du magazine, aux enquêtes approfondies et aux grands entretiens de la rédaction.
          </Text>
        </View>

        {/* Abonnement déjà actif */}
        {currentSubscription && (
          <View style={styles.activeSubCard}>
            <View style={styles.activeSubHeader}>
              <Ionicons name="shield-checkmark" size={24} color="#15803D" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.activeSubTitle}>Abonnement actuellement actif</Text>
                <Text style={styles.activeSubText}>
                  Formule {currentSubscription.plan === 'yearly' ? 'Annuelle' : 'Mensuelle'}
                  {currentSubscription.ends_at
                    ? ` • Valide jusqu'au ${new Date(currentSubscription.ends_at).toLocaleDateString('fr-FR')}`
                    : ''}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Sélection des Formules */}
        <Text style={styles.sectionTitle}>Choisissez votre formule</Text>
        <View style={styles.plansContainer}>
          {/* Formule Mensuelle */}
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'monthly' && styles.selectedPlanCard,
            ]}
            onPress={() => setSelectedPlan('monthly')}
            activeOpacity={0.85}
          >
            <View style={styles.planHeader}>
              <View>
                <Text style={styles.planName}>Mensuel</Text>
                <Text style={styles.planNote}>{SUBSCRIPTION_PLANS.monthly.note}</Text>
              </View>
              <View style={[styles.radioCircle, selectedPlan === 'monthly' && styles.selectedRadio]}>
                {selectedPlan === 'monthly' && <View style={styles.radioDot} />}
              </View>
            </View>
            <View style={styles.planPriceRow}>
              <Text style={styles.planPrice}>${monthlyPrice.toFixed(2)}</Text>
              <Text style={styles.planPeriod}> / mois</Text>
            </View>
          </TouchableOpacity>

          {/* Formule Annuelle */}
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'yearly' && styles.selectedPlanCard,
            ]}
            onPress={() => setSelectedPlan('yearly')}
            activeOpacity={0.85}
          >
            <View style={styles.popularBadge}>
              <Text style={styles.popularBadgeText}>2 mois offerts</Text>
            </View>
            <View style={styles.planHeader}>
              <View>
                <Text style={styles.planName}>Annuel</Text>
                <Text style={styles.planNote}>{SUBSCRIPTION_PLANS.yearly.note}</Text>
              </View>
              <View style={[styles.radioCircle, selectedPlan === 'yearly' && styles.selectedRadio]}>
                {selectedPlan === 'yearly' && <View style={styles.radioDot} />}
              </View>
            </View>
            <View style={styles.planPriceRow}>
              <Text style={styles.planPrice}>${yearlyPrice.toFixed(2)}</Text>
              <Text style={styles.planPeriod}> / an</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Avantages inclus */}
        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>Ce qui est inclus dans votre formule :</Text>
          {SUBSCRIPTION_BENEFITS.map((benefit, idx) => (
            <View key={`benefit_${idx}`} style={styles.benefitRow}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.primary} style={{ marginRight: 10, marginTop: 1 }} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        {/* Choix du mode de paiement */}
        <Text style={styles.sectionTitle}>Mode de paiement sécurisé</Text>
        <View style={styles.paymentMethodsRow}>
          <TouchableOpacity
            style={[
              styles.methodTab,
              method === 'emoney' && styles.selectedMethodTab,
            ]}
            onPress={() => setMethod('emoney')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="phone-portrait-outline"
              size={18}
              color={method === 'emoney' ? Colors.primary : Colors.textLight}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.methodTabText, method === 'emoney' && styles.selectedMethodTabText]}>
              Mobile Money
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.methodTab,
              method === 'ecard' && styles.selectedMethodTab,
            ]}
            onPress={() => setMethod('ecard')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="card-outline"
              size={18}
              color={method === 'ecard' ? Colors.primary : Colors.textLight}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.methodTabText, method === 'ecard' && styles.selectedMethodTabText]}>
              Carte bancaire
            </Text>
          </TouchableOpacity>
        </View>

        {/* Détails selon le mode */}
        {method === 'emoney' ? (
          <View style={styles.methodDetailsBox}>
            <Text style={styles.inputLabel}>Numéro de téléphone Mobile Money (RDC)</Text>
            <TextInput
              style={styles.phoneInput}
              placeholder="Ex: 243810000000"
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              maxLength={13}
            />
            {detectedProvider && (
              <View style={styles.providerPill}>
                <Ionicons name="checkmark-circle-outline" size={14} color="#15803D" style={{ marginRight: 4 }} />
                <Text style={styles.providerText}>{detectedProvider} détecté</Text>
              </View>
            )}
            <Text style={styles.operatorList}>
              Opérateurs supportés : Vodacom M-Pesa, Orange Money, Airtel Money, Africell
            </Text>
          </View>
        ) : (
          <View style={styles.methodDetailsBox}>
            <Text style={styles.cardInfoText}>
              Vous serez redirigé vers une page de paiement chiffrée conforme aux normes bancaires PCI-DSS. Cartes acceptées : Visa, Mastercard.
            </Text>
          </View>
        )}

        {/* Badge de confiance TwigaPaie */}
        <TrustBadge
          contentKey="subscription_screen_default"
          appName="fam"
          language="fr"
          style={styles.trustBadge}
        />

        {/* Bouton d'action principal */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubscribe}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>
              S'abonner maintenant — ${currentPlanPrice.toFixed(2)} / {currentPlanPeriod}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de suivi de confirmation */}
      <Modal
        visible={showStatusModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="phone-portrait-outline" size={36} color={Colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Validation du paiement</Text>
            <Text style={styles.modalMessage}>{statusMessage}</Text>

            <View style={styles.modalInfoBox}>
              <Text style={styles.modalInfoText}>
                {method === 'emoney'
                  ? 'Veuillez saisir votre code secret sur le pop-up USSD reçu sur votre téléphone pour approuver le paiement.'
                  : 'Si la page bancaire s\'est fermée, vous pouvez vérifier manuellement le paiement.'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.verifyButton, isVerifying && styles.verifyButtonDisabled]}
              onPress={handleManualCheck}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.verifyButtonText}>Vérifier le paiement</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => {
                stopPolling();
                setShowStatusModal(false);
              }}
            >
              <Text style={styles.closeModalText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.backgroundLight,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  content: {
    padding: 20,
    paddingBottom: 140,
  },
  introSection: {
    marginBottom: 24,
  },
  badgePill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  badgeText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
    lineHeight: 32,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  activeSubCard: {
    backgroundColor: '#DCFCE7',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  activeSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeSubTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#15803D',
  },
  activeSubText: {
    fontSize: 12,
    color: '#166534',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  plansContainer: {
    gap: 12,
    marginBottom: 20,
  },
  planCard: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: Colors.border,
    position: 'relative',
  },
  selectedPlanCard: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '06',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  planNote: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    maxWidth: 240,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedRadio: {
    borderColor: Colors.primary,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary,
  },
  planPeriod: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  benefitsCard: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
    lineHeight: 18,
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  methodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundLight,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  selectedMethodTab: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  methodTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  selectedMethodTabText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  methodDetailsBox: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  phoneInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
    marginBottom: 8,
  },
  providerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  providerText: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '600',
  },
  operatorList: {
    fontSize: 11,
    color: Colors.textLight,
  },
  cardInfoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  trustBadge: {
    marginVertical: 12,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  modalIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  modalInfoBox: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 18,
    width: '100%',
  },
  modalInfoText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  verifyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 22,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  closeModalButton: {
    paddingVertical: 8,
  },
  closeModalText: {
    color: Colors.textSecondary,
    fontSize: 13,
  },
});

export default SubscriptionScreen;
