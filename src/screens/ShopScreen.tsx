// src/screens/ShopScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    Image,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Alert,
    TextInput,
    Keyboard,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMagazines, getMedia } from '../services/api';
import { Magazine } from '../models/Magazine';
import { Colors } from '../theme/colors';
import TrustBadge from '../components/TrustBadge';
import {
    PaymentMethod,
    formatPhoneAndDeduceProvider,
    isPaymentSuccessful,
    isPaymentFailed
} from '../services/twigaPaie';
// import * as FileSystem from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { centralPaymentService, PaymentRequest } from '../services/centralPaymentService';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

const STORAGE_KEY_PHONE = '@fda_user_phone';

const isTest = false;
const TEST_PRICE_CDF = 100;

const ShopScreen = () => {
    const [magazines, setMagazines] = useState<Magazine[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedMagazine, setSelectedMagazine] = useState<Magazine | null>(null);
    const [phone, setPhone] = useState('243');
    const [defaultPhone, setDefaultPhone] = useState('243');
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [loadingPayment, setLoadingPayment] = useState(false);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [detectedProvider, setDetectedProvider] = useState<string>('');
    const [showSecurityNotice, setShowSecurityNotice] = useState(false);
    const [paymentStatusMessage, setPaymentStatusMessage] = useState<string>('');
    const [showDownloadPopup, setShowDownloadPopup] = useState(false);

    // Fonction de téléchargement unique et sécurisée
    const downloadPdf = async (magazine = selectedMagazine) => {
        if (!magazine) return;

        setDownloadingPdf(true);

        try {
            console.log(`📄 Début récupération media pour magazine N°${magazine.acf.numero}`);

            // 1. Récupération de l'URL du PDF
            const media = await getMedia(magazine.acf.pdf);

            if (!media || !media.source_url) {
                throw new Error('URL du PDF non disponible');
            }

            // S'assurer que l'URL utilise HTTPS
            let pdfUrl = media.source_url;
            if (pdfUrl.startsWith('http://')) {
                pdfUrl = pdfUrl.replace('http://', 'https://');
            }

            const filename = `FDA_N${magazine.acf.numero}.pdf`;
            const documentDir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
            const localUri = `${documentDir}${filename}`;

            console.log(`⬇️ Téléchargement depuis : ${pdfUrl}`);

            // 2. Téléchargement direct avec FileSystem
            const downloadResult = await FileSystem.downloadAsync(pdfUrl, localUri);

            console.log('📥 Résultat téléchargement :', downloadResult);

            // 3. Vérification du statut
            if (downloadResult && downloadResult.status === 200) {
                Alert.alert(
                    '✅ PDF Téléchargé',
                    `Le magazine FDA N°${magazine.acf.numero} a été téléchargé avec succès !`,
                    [
                        {
                            text: 'Ouvrir le PDF',
                            onPress: async () => {
                                try {
                                    await Sharing.shareAsync(localUri, {
                                        mimeType: 'application/pdf',
                                        dialogTitle: `FDA N°${magazine.acf.numero}`,
                                        UTI: 'com.adobe.pdf',
                                    });
                                } catch (shareError) {
                                    Alert.alert('Erreur', 'Impossible d\'ouvrir le fichier PDF.');
                                }
                            }
                        },
                        { text: 'Plus tard', style: 'cancel' }
                    ]
                );
            } else {
                throw new Error(`Statut HTTP reçu: ${downloadResult?.status || 'Inconnu'}`);
            }
        } catch (error: any) {
            console.error('❌ Erreur PDF détaillée:', error);

            let errorMessage = 'Impossible de télécharger le PDF.';
            if (error?.message?.includes('URL du PDF')) {
                errorMessage = 'Le fichier PDF n\'est pas encore attaché à ce magazine.';
            } else if (error?.message) {
                errorMessage = `Erreur : ${error.message}`;
            }

            Alert.alert('Erreur de téléchargement', errorMessage);
        } finally {
            setDownloadingPdf(false);
        }
    };

    useEffect(() => {
        fetchMagazines();
        loadDefaultPhone();
    }, []);

    const loadDefaultPhone = async () => {
        try {
            const savedPhone = await AsyncStorage.getItem(STORAGE_KEY_PHONE);
            if (savedPhone && savedPhone.length >= 5) {
                setDefaultPhone(savedPhone);
            }
        } catch (error) {
            console.log('Erreur chargement numéro par défaut');
        }
    };

    const fetchMagazines = async () => {
        try {
            const data = await getMagazines(1, 10);
            setMagazines(data);
        } catch (error) {
            Alert.alert(
                'Problème de connexion',
                'Impossible de charger les magazines. Veuillez vérifier votre connexion et réessayer.',
                [{ text: 'Réessayer', onPress: fetchMagazines }]
            );
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            const data = await getMagazines(1, 10);
            setMagazines(data);
        } catch (error) {
            console.error('❌ Erreur refresh magazines:', error);
        } finally {
            setRefreshing(false);
        }
    }, []);

    const totalPrice = isTest
        ? TEST_PRICE_CDF
        : (selectedMagazine ? selectedMagazine.acf.prix_mag + selectedMagazine.acf.tva : 0);

    const currency = isTest ? 'CDF' : 'USD';

    const handleOpenCheckout = async (mag: Magazine) => {
        if (selectedMagazine?.id === mag.id && showCheckoutModal) return;

        setSelectedMagazine(mag);
        setShowCheckoutModal(true);
        setShowSecurityNotice(true);
        setPaymentMethod(null);
        setPhone(defaultPhone || '243');

        const walletId = Constants.expoConfig?.extra?.EXPO_PUBLIC_WALLET_ID;
        console.log("=> getting Cuts", walletId)

        const { data, error } = await supabase.rpc("get_cuts", { p_wallet_id: walletId });
        console.log({ data, error });

        if (error) console.error(error);
        else console.log(data);


        if (defaultPhone && defaultPhone.length >= 5) {
            try {
                const { providerName } = formatPhoneAndDeduceProvider(defaultPhone);
                setDetectedProvider(providerName);
            } catch {
                setDetectedProvider('');
            }
        } else {
            setDetectedProvider('');
        }
    };

    const closeCheckout = () => {
        setSelectedMagazine(null);
        setPhone('243');
        setPaymentSuccess(false);
        setShowCheckoutModal(false);
        setPaymentMethod(null);
        setDetectedProvider('');
        setShowSecurityNotice(false);
        setShowDownloadPopup(false);
        setPaymentStatusMessage('');
        setLoadingPayment(false);
        setDownloadingPdf(false);
        Keyboard.dismiss();
    };

    const handlePhoneChange = (text: string) => {
        if (!text.startsWith('243')) {
            text = '243' + text.replace(/^243/, '');
        }
        setPhone(text);

        if (text.length >= 5) {
            try {
                const { providerName } = formatPhoneAndDeduceProvider(text);
                setDetectedProvider(providerName);
            } catch {
                setDetectedProvider('');
            }
        } else {
            setDetectedProvider('');
        }
    };

    const processPaymentWithCentralService = async (
        paymentMethod: 'emoney' | 'ecard',
        phone?: string
    ): Promise<{ success: boolean; message: string; error?: string; orderId?: string }> => {
        if (!selectedMagazine) return { success: false, message: 'Aucun magazine sélectionné' };

        try {
            const paymentRequest: PaymentRequest = {
                magazineId: selectedMagazine.id.toString(),
                magazineNumber: selectedMagazine.acf.numero.toString(),
                magazineTitle: selectedMagazine.title.rendered,
                amount: Constants.expoConfig?.extra?.EXPO_PUBLIC_IS_PROD ? totalPrice : 10,
                currency: Constants.expoConfig?.extra?.EXPO_PUBLIC_IS_PROD ? currency : 'CDF',
                paymentMethod: paymentMethod,
                phone: phone
            };

            return await centralPaymentService.processPayment(paymentRequest);
        } catch (error) {
            return { success: false, message: (error as any).message };
        }
    };

    const handleEmoneyPayment = async () => {
        if (!selectedMagazine) return;

        if (phone.length < 12) {
            Alert.alert('Erreur', 'Veuillez entrer un numéro de téléphone valide (12 chiffres)');
            return;
        }

        setLoadingPayment(true);
        setPaymentStatusMessage('🔄 Traitement du paiement...');

        try {
            const result = await processPaymentWithCentralService('emoney', phone);

            if (result.success) {
                setPaymentStatusMessage('');
                setPaymentSuccess(true);
                setShowDownloadPopup(true);
            } else {
                setPaymentStatusMessage('');
                if (result.error === 'PAYMENT_PENDING') {
                    Alert.alert(
                        'Paiement en attente',
                        'Le paiement n\'a pas encore été confirmé.\n\nVeuillez vérifier si vous avez reçu une demande de confirmation sur votre téléphone.',
                        [{ text: 'OK' }]
                    );
                } else {
                    Alert.alert('Erreur de paiement', result.message);
                }
            }
        } catch (error: any) {
            setPaymentStatusMessage('');
            Alert.alert('Erreur', error.message || 'Une erreur est survenue lors du paiement');
        } finally {
            setLoadingPayment(false);
        }
    };

    const handleCardPayment = async () => {
        if (!selectedMagazine) return;

        setLoadingPayment(true);
        setPaymentStatusMessage('🔄 Traitement du paiement par carte...');

        try {
            const result = await processPaymentWithCentralService('ecard');

            if (result.success) {
                setPaymentStatusMessage('');
                setPaymentSuccess(true);
                setShowDownloadPopup(true);
            } else {
                setPaymentStatusMessage('');
                if (result.error === 'CARD_PAYMENT_PENDING') {
                    Alert.alert(
                        '🔍 Vérification du paiement',
                        'Avez-vous complété le paiement par carte ?',
                        [
                            { text: 'Non, annuler', style: 'cancel' },
                            {
                                text: 'Oui, vérifier',
                                onPress: () => verifyCardPayment(result.orderId!)
                            }
                        ]
                    );
                } else {
                    Alert.alert('Erreur de paiement', result.message);
                }
            }
        } catch (error: any) {
            setPaymentStatusMessage('');
            Alert.alert('Erreur', error.message || 'Une erreur est survenue lors du paiement');
        } finally {
            setLoadingPayment(false);
        }
    };

    const verifyCardPayment = async (orderNumber: string) => {
        setLoadingPayment(true);
        setPaymentStatusMessage('🔄 Vérification en cours...');

        try {
            const result = await centralPaymentService.checkPaymentStatus(orderNumber, 'ecard');

            if (isPaymentSuccessful(result.status)) {
                setPaymentStatusMessage('');
                setPaymentSuccess(true);
                setShowDownloadPopup(true);
            } else if (isPaymentFailed(result.status)) {
                setPaymentStatusMessage('');
                Alert.alert(
                    '❌ Paiement échoué',
                    `Le paiement a échoué: ${result.rawStatus || result.status}`
                );
            } else {
                setPaymentStatusMessage('');
                Alert.alert(
                    '⏳ Paiement en attente',
                    'Le paiement n\'a pas encore été confirmé.',
                    [
                        { text: 'OK' },
                        { text: 'Revérifier', onPress: () => verifyCardPayment(orderNumber) }
                    ]
                );
            }
        } catch (error) {
            setPaymentStatusMessage('');
            Alert.alert('Erreur', 'Une erreur est survenue lors de la vérification');
        } finally {
            setLoadingPayment(false);
        }
    };

    const formatMagazineDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    };

    const renderMagazine = ({ item }: { item: Magazine }) => {
        const displayPrice = isTest
            ? `${TEST_PRICE_CDF} CDF`
            : `$${(item.acf.prix_mag + item.acf.tva).toFixed(2)} TTC`;

        return (
            <TouchableOpacity
                style={styles.magazineCard}
                onPress={() => handleOpenCheckout(item)}
            >
                <View style={styles.imageContainer}>
                    <Image
                        source={{
                            uri: item.better_featured_image?.source_url || item.dmks_featured_image?.src,
                        }}
                        style={styles.coverMagImage}
                    />
                    <View style={styles.dateBadge}>
                        <Text style={styles.dateBadgeText}>{formatMagazineDate(item.date)}</Text>
                    </View>
                </View>

                <View style={styles.magazineCardInfo}>
                    <Text style={styles.title}>N°{item.acf.numero}</Text>
                    <Text style={styles.info}>{item.acf.pages} pages</Text>
                    <Text style={styles.price}>{displayPrice}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Chargement...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: "auto" }}>
                <Image source={require('../../assets/FDA-white.png')} style={{ width: 60, height: 25, marginTop: -15 }} resizeMode="contain" />
                <Text style={styles.header}>Boutique</Text>
            </View>
            <TrustBadge
                contentKey="shop_screen_default"
                appName="fam"
                language="fr"
                onCtaPress={() => console.log('Trust CTA pressed')}
                style={styles.trustBadge}
            />

            <FlatList
                data={magazines}
                renderItem={renderMagazine}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.list}
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                    />
                }
            />

            {/* Modal principal de checkout */}
            <Modal
                visible={showCheckoutModal}
                transparent={true}
                animationType="slide"
                onRequestClose={closeCheckout}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => Keyboard.dismiss()}
                >
                    <View style={styles.checkoutPanel}>
                        <View style={styles.checkoutHeader}>
                            <View style={styles.headerLeft}>
                                <Image
                                    source={{ uri: 'https://ucarecdn.com/8504e1cb-f329-4c11-af72-d279e2171df3/-/preview/1000x666/' }}
                                    style={styles.twigaLogo}
                                    resizeMode="contain"
                                />
                                <Text style={styles.checkoutTitle}>Paiement sécurisé</Text>
                            </View>
                            <TouchableOpacity onPress={closeCheckout}>
                                <Ionicons name="close-circle" size={28} color="#888" />
                            </TouchableOpacity>
                        </View>

                        {selectedMagazine && !paymentSuccess && (
                            <>
                                <View style={styles.magazineInfo}>
                                    <Image
                                        source={{
                                            uri: selectedMagazine.better_featured_image?.source_url ||
                                                selectedMagazine.dmks_featured_image?.src
                                        }}
                                        style={styles.checkoutCover}
                                    />
                                    <View style={styles.magazineDetails}>
                                        <Text style={styles.magazineTitle}>{selectedMagazine.title.rendered}</Text>
                                        <Text style={styles.magazineSubtitle}>
                                            N°{selectedMagazine.acf.numero} • {selectedMagazine.acf.pages} pages
                                        </Text>
                                        <Text style={styles.totalPrice}>
                                            {isTest ? `${totalPrice} CDF` : `$${totalPrice.toFixed(2)}`} TTC
                                        </Text>
                                    </View>
                                </View>

                                {!paymentMethod && (
                                    <View style={styles.paymentMethods}>
                                        <Text style={styles.sectionTitle}>Choisir le mode de paiement</Text>
                                        <TouchableOpacity
                                            style={styles.paymentOption}
                                            onPress={() => setPaymentMethod('emoney')}
                                        >
                                            <View style={styles.paymentOptionIcon}>
                                                <Ionicons name="phone-portrait-outline" size={24} color={Colors.primary} />
                                            </View>
                                            <View style={styles.paymentOptionText}>
                                                <Text style={styles.paymentOptionTitle}>E-Money</Text>
                                                <Text style={styles.paymentOptionSubtitle}>M-Pesa, Orange Money, Airtel Money</Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={20} color="#888" />
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.paymentOption}
                                            onPress={() => setPaymentMethod('ecard')}
                                        >
                                            <View style={styles.paymentOptionIcon}>
                                                <Ionicons name="card-outline" size={24} color={Colors.primary} />
                                            </View>
                                            <View style={styles.paymentOptionText}>
                                                <Text style={styles.paymentOptionTitle}>E-Card</Text>
                                                <Text style={styles.paymentOptionSubtitle}>Visa, Mastercard via FlexPaie</Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={20} color="#888" />
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {paymentMethod === 'emoney' && (
                                    <View style={styles.paymentForm}>
                                        <TouchableOpacity
                                            style={styles.backToMethods}
                                            onPress={() => setPaymentMethod(null)}
                                        >
                                            <Ionicons name="arrow-back" size={20} color={Colors.primary} />
                                            <Text style={styles.backText}>Changer de méthode</Text>
                                        </TouchableOpacity>

                                        <Text style={styles.sectionTitle}>Paiement E-Money</Text>
                                        <Text style={styles.phoneLabel}>Numéro de téléphone (243...)</Text>
                                        <TextInput
                                            style={styles.phoneInput}
                                            placeholder="243XXXXXXXXX"
                                            value={phone}
                                            onChangeText={handlePhoneChange}
                                            keyboardType="phone-pad"
                                            maxLength={12}
                                        />
                                        {detectedProvider ? (
                                            <Text style={styles.providerDetected}>📱 {detectedProvider} détecté</Text>
                                        ) : null}

                                        <TouchableOpacity
                                            style={[styles.payButton, loadingPayment && styles.payButtonDisabled]}
                                            onPress={handleEmoneyPayment}
                                            disabled={loadingPayment}
                                        >
                                            {loadingPayment ? (
                                                <ActivityIndicator color="#FFF" />
                                            ) : (
                                                <Text style={styles.payButtonText}>
                                                    Payer {isTest ? `${totalPrice} CDF` : `$${totalPrice.toFixed(2)}`}
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {paymentMethod === 'ecard' && (
                                    <View style={styles.paymentForm}>
                                        <TouchableOpacity
                                            style={styles.backToMethods}
                                            onPress={() => setPaymentMethod(null)}
                                        >
                                            <Ionicons name="arrow-back" size={20} color={Colors.primary} />
                                            <Text style={styles.backText}>Changer de méthode</Text>
                                        </TouchableOpacity>

                                        <Text style={styles.sectionTitle}>Paiement par Carte</Text>
                                        <Text style={styles.cardInfo}>
                                            Vous serez redirigé vers la page de paiement sécurisée FlexPaie.
                                        </Text>

                                        <TouchableOpacity
                                            style={[styles.payButton, styles.cardPayButton, loadingPayment && styles.payButtonDisabled]}
                                            onPress={handleCardPayment}
                                            disabled={loadingPayment}
                                        >
                                            {loadingPayment ? (
                                                <ActivityIndicator color="#FFF" />
                                            ) : (
                                                <Text style={styles.payButtonText}>
                                                    Payer {isTest ? `${totalPrice} CDF` : `$${totalPrice.toFixed(2)}`}
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </>
                        )}

                        {paymentSuccess && (
                            <View style={styles.successContainer}>
                                <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
                                <Text style={styles.successTitle}>Paiement réussi !</Text>
                                <Text style={styles.successSubtitle}>
                                    Merci pour votre achat du Magazine N°{selectedMagazine?.acf.numero}
                                </Text>

                                <TouchableOpacity
                                    style={styles.downloadButton}
                                    disabled={downloadingPdf}
                                    onPress={() => downloadPdf(selectedMagazine)}
                                >
                                    <Ionicons name="download-outline" size={20} color="#FFF" />
                                    <Text style={styles.downloadButtonText}>
                                        {downloadingPdf ? 'Téléchargement...' : 'Télécharger le PDF'}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.backButton} onPress={closeCheckout}>
                                    <Text style={styles.backButtonText}>← Retour à la boutique</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Modal Pop-up de Téléchargement (Placé au niveau racine) */}
            <Modal
                visible={showDownloadPopup}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowDownloadPopup(false)}
            >
                <View style={styles.downloadPopupOverlay}>
                    <View style={styles.downloadPopupModal}>
                        <View style={styles.downloadPopupIconContainer}>
                            <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
                        </View>
                        <Text style={styles.downloadPopupTitle}>🎉 Paiement réussi !</Text>
                        <Text style={styles.downloadPopupSubtitle}>
                            Votre magazine N°{selectedMagazine?.acf.numero} est prêt !
                        </Text>
                        <Text style={styles.downloadPopupText}>
                            Téléchargez dès maintenant votre magazine en PDF pour le lire hors-ligne.
                        </Text>
                        <TouchableOpacity
                            style={styles.downloadPopupButton}
                            disabled={downloadingPdf}
                            onPress={() => {
                                setShowDownloadPopup(false);
                                downloadPdf();
                            }}
                        >
                            <Ionicons name="download-outline" size={22} color="#FFF" />
                            <Text style={styles.downloadPopupButtonText}>
                                {downloadingPdf ? 'Téléchargement...' : 'Télécharger le PDF'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.downloadPopupLaterButton}
                            onPress={() => setShowDownloadPopup(false)}
                        >
                            <Text style={styles.downloadPopupLaterText}>Plus tard</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Modal notification sécurité */}
            <Modal
                visible={showSecurityNotice}
                transparent={true}
                animationType="fade"
                statusBarTranslucent={true}
            >
                <View style={styles.securityOverlay}>
                    <View style={styles.securityModal}>
                        <Image
                            source={{ uri: 'https://ucarecdn.com/8504e1cb-f329-4c11-af72-d279e2171df3/-/preview/1000x666/' }}
                            style={styles.securityLogo}
                            resizeMode="contain"
                        />
                        <Ionicons name="shield-checkmark" size={48} color="#4CAF50" />
                        <Text style={styles.securityTitle}>Paiement 100% Sécurisé</Text>
                        <Text style={styles.securityText}>
                            Votre transaction est sécurisée par TwigaPaie, conformément aux termes établis entre{' '}
                            <Text style={styles.boldText}>Femme d'Afrique Magazine</Text> et{' '}
                            <Text style={styles.boldText}>DefMaks</Text>.
                        </Text>
                        <TouchableOpacity
                            style={styles.securityButton}
                            onPress={() => setShowSecurityNotice(false)}
                        >
                            <Text style={styles.securityButtonText}>J'ai compris</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

/* Garder la même feuille de style qu'initialement */
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111', paddingTop: 50, paddingHorizontal: 16 },
    header: { fontSize: 24, fontWeight: '200', marginBottom: 16, color: '#FFF', textAlign: 'center' },
    list: { paddingBottom: 100 },
    columnWrapper: { justifyContent: 'space-between' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
    loadingText: { marginTop: 12, color: '#888', fontSize: 16 },
    magazineCard: { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 16, width: '48%', overflow: 'hidden' },
    imageContainer: { position: 'relative' },
    coverMagImage: { width: '100%', height: 250, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
    dateBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    dateBadgeText: { fontSize: 12, fontWeight: '600', color: '#333' },
    magazineCardInfo: { paddingHorizontal: 15, paddingTop: 10, paddingBottom: 15 },
    title: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
    info: { fontSize: 13, color: '#666', marginBottom: 6 },
    price: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    checkoutPanel: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
    checkoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    twigaLogo: { width: 32, height: 32, marginRight: 10 },
    checkoutTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    securityOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    securityModal: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, alignItems: 'center', width: '100%', maxWidth: 340 },
    securityLogo: { width: 60, height: 60, marginBottom: 12 },
    securityTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 12, marginBottom: 12 },
    securityText: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 20, marginBottom: 8 },
    boldText: { fontWeight: 'bold', color: Colors.primary },
    securityButton: { backgroundColor: Colors.primary, paddingVertical: 14, paddingHorizontal: 40, borderRadius: 25 },
    securityButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
    magazineInfo: { flexDirection: 'row', marginBottom: 20, padding: 12, backgroundColor: '#F8F8F8', borderRadius: 12 },
    checkoutCover: { width: 80, height: 110, borderRadius: 8 },
    magazineDetails: { flex: 1, marginLeft: 16, justifyContent: 'center' },
    magazineTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
    magazineSubtitle: { fontSize: 13, color: '#666', marginBottom: 8 },
    totalPrice: { fontSize: 20, fontWeight: 'bold', color: Colors.primary },
    paymentMethods: { marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },
    paymentOption: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#F8F8F8', borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EEE' },
    paymentOptionIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    paymentOptionText: { flex: 1 },
    paymentOptionTitle: { fontSize: 15, fontWeight: '600', color: '#333' },
    paymentOptionSubtitle: { fontSize: 12, color: '#888', marginTop: 2 },
    paymentForm: { paddingTop: 8 },
    backToMethods: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    backText: { color: Colors.primary, marginLeft: 6, fontSize: 14 },
    phoneLabel: { fontSize: 14, color: '#555', marginBottom: 8 },
    phoneInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 10, padding: 14, fontSize: 16, backgroundColor: '#FAFAFA', marginBottom: 8 },
    providerDetected: { fontSize: 13, color: '#4CAF50', marginBottom: 16 },
    cardInfo: { fontSize: 14, color: '#666', marginBottom: 16, lineHeight: 20 },
    payButton: { backgroundColor: Colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
    cardPayButton: { backgroundColor: '#1A1F71' },
    payButtonDisabled: { opacity: 0.7 },
    payButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    successContainer: { alignItems: 'center', paddingVertical: 20 },
    successTitle: { fontSize: 22, fontWeight: 'bold', color: '#4CAF50', marginTop: 12, marginBottom: 8 },
    successSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24 },
    downloadButton: { backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10, width: '80%', justifyContent: 'center', marginBottom: 12 },
    downloadButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600', marginLeft: 8 },
    backButton: { padding: 10 },
    backButtonText: { color: Colors.primary, fontSize: 14 },
    downloadPopupOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    downloadPopupModal: { backgroundColor: '#FFF', borderRadius: 24, padding: 28, alignItems: 'center', width: '100%', maxWidth: 340 },
    downloadPopupIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    downloadPopupTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 8, textAlign: 'center' },
    downloadPopupSubtitle: { fontSize: 16, fontWeight: '600', color: Colors.primary, marginBottom: 12, textAlign: 'center' },
    downloadPopupText: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    downloadPopupButton: { backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, width: '100%', marginBottom: 12 },
    downloadPopupButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600', marginLeft: 8 },
    downloadPopupLaterButton: { paddingVertical: 10 },
    downloadPopupLaterText: { color: '#888', fontSize: 14 },
    trustBadge: { marginHorizontal: 0, marginTop: 16, marginBottom: 8 },
});

export default ShopScreen;