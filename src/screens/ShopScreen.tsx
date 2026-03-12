// src/screens/ShopScreen.tsx
import React, { useEffect, useState } from 'react';
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
    Platform,
    ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMagazines, getMedia } from '../services/api';
import { Magazine } from '../models/Magazine';
import { Colors } from '../theme/colors';
import {
    initiatePayment,
    initiateCardPayment,
    checkPaymentStatus,
    generateOrderId,
    handlePaymentError,
    pollPaymentStatus,
    pollCardPaymentStatus,
    isPaymentSuccessful,
    isPaymentFailed,
    PaymentMethod,
    PaymentStatusResponse,
    formatPhoneAndDeduceProvider,
    openCardPaymentPageSimple
} from '../services/twigaPaie';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const STORAGE_KEY_PHONE = '@fda_user_phone';

// 🧪 Mode test : si true, le prix est de 100 CDF TTC
const isTest = true;
const TEST_PRICE_CDF = 100;


const ShopScreen = () => {
    const [magazines, setMagazines] = useState<Magazine[]>([]);
    const [loading, setLoading] = useState(true);
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
    const [currentOrderNumber, setCurrentOrderNumber] = useState<string>('');
    const [paymentStatusMessage, setPaymentStatusMessage] = useState<string>('');
    const [showDownloadPopup, setShowDownloadPopup] = useState(false);

    // Fonction downloadPdf déclarée au début pour éviter l'erreur de scope
    const downloadPdf = async () => {
        if (!selectedMagazine) return;

        setDownloadingPdf(true); // Début du téléchargement

        try {
            console.log(`📄 Début téléchargement PDF pour magazine N°${selectedMagazine.acf.numero}`);
            console.log(`🔗 PDF ID: ${selectedMagazine.acf.pdf}`);

            const media = await getMedia(selectedMagazine.acf.pdf);
            const pdfUrl = media.source_url;
            const filename = `FDA_N${selectedMagazine.acf.numero}.pdf`;
            const documentDir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
            const localUri = `${documentDir}${filename}`;

            console.log(`📥 Source URL: ${pdfUrl}`);
            console.log(`💾 Destination: ${localUri}`);
            console.log(`📁 Document directory: ${documentDir}`);

            // Utilisation de la nouvelle API FileSystem (non deprecated)
            const downloadResult = await FileSystem.downloadAsync(pdfUrl, localUri);
            console.log(`📊 Download result status: ${downloadResult.status}`);
            console.log(`📊 Download result URI: ${downloadResult.uri}`);

            if (downloadResult.status === 200) {
                console.log('✅ Téléchargement réussi');

                // Alert avec option d'ouverture automatique
                Alert.alert(
                    '✅ PDF Téléchargé',
                    `Le magazine FDA N°${selectedMagazine.acf.numero} a été téléchargé avec succès !`,
                    [
                        {
                            text: 'Ouvrir le PDF',
                            onPress: async () => {
                                try {
                                    await Sharing.shareAsync(localUri);
                                    console.log('📤 PDF ouvert et partagé');
                                } catch (shareError) {
                                    console.error('❌ Erreur ouverture PDF:', shareError);
                                    Alert.alert('Erreur', 'Impossible d\'ouvrir le PDF');
                                }
                            }
                        },
                        {
                            text: 'Plus tard',
                            style: 'cancel'
                        }
                    ]
                );
            } else {
                throw new Error(`Téléchargement échoué avec statut: ${downloadResult.status}`);
            }
        } catch (error) {
            console.error('❌ Erreur PDF:', error);
            console.error('❌ Détails erreur:', {
                pdfId: selectedMagazine?.acf.pdf,
                magazineNumero: selectedMagazine?.acf.numero,
                errorMessage: (error as any)?.message,
                errorCode: (error as any)?.code
            });
            Alert.alert('Erreur', 'Impossible de télécharger le PDF.');
        } finally {
            setDownloadingPdf(false); // Fin du téléchargement
        }
    };

    useEffect(() => {
        fetchMagazines();
        loadDefaultPhone();
    }, []);

    // Charger le numéro par défaut du profil
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
            console.log('📚 Chargement des magazines...');
            const data = await getMagazines(1, 10);
            console.log(`✅ ${data.length} magazines chargés`);
            setMagazines(data);
        } catch (error) {
            console.error('❌ Erreur chargement magazines:', error);
            // Afficher un message d'erreur plus clair
            Alert.alert(
                'Problème de connexion',
                'Impossible de charger les magazines. Veuillez vérifier votre connexion et réessayer.',
                [{ text: 'Réessayer', onPress: fetchMagazines }]
            );
        } finally {
            setLoading(false);
        }
    };

    // Prix total : en mode test = 100 CDF, sinon prix normal en USD
    const totalPrice = isTest
        ? TEST_PRICE_CDF
        : (selectedMagazine ? selectedMagazine.acf.prix_mag + selectedMagazine.acf.tva : 0);

    // Devise selon le mode
    const currency = isTest ? 'CDF' : 'USD';

    const walletId = process.env.wallet_id;
    const recordMagazinePurchase = async (wallet_id: string, amount: string, currency: string, transaction_type: string, description: string, external_reference: string, transaction_platform: string) => {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .insert({
                    wallet_id: wallet_id,
                    amount: parseFloat(amount), // numeric requis par le schéma
                    currency: currency,
                    transaction_type: transaction_type,
                    description: description,
                    external_reference: external_reference,
                    transaction_platform: transaction_platform
                })
                .select();

            if (error) {
                console.error('❌ Erreur enregistrement Supabase:', error);
                return { success: false, message: (error as any).message, error: 'SUPABASE_ERROR' };
            }

            console.log('✅ Transaction enregistrée dans Supabase:', data[0]?.id);
            return { success: true, message: 'Transaction enregistrée', purchase_id: data[0]?.id };
        } catch (error) {
            console.error('❌ Erreur enregistrement Supabase:', error);
            return { success: false, message: (error as any).message, error: 'NETWORK_ERROR' };
        }
    };

    const handleOpenCheckout = async (mag: Magazine) => {
        // Éviter les appels multiples si déjà en cours
        if (selectedMagazine?.id === mag.id) {
            console.log('� Modal déjà ouverte pour ce magazine');
            return;
        }

        console.log(`� Ouverture modal d'achat pour magazine N°${mag.acf.numero}`);

        setSelectedMagazine(mag);
        setShowCheckoutModal(true);
        setShowSecurityNotice(true);
        setPaymentMethod(null);

        // Charger le numéro par défaut du profil
        setPhone(defaultPhone || '243');

        // Détecter le provider si numéro existant
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

        setCurrentOrderNumber('');

        // Récupérer le PDF en parallèle pour optimiser
        try {
            const media = await getMedia(mag.acf.pdf);
            console.log(`📄 PDF Source URL: ${media.source_url}`);
        } catch (error) {
            console.error('❌ Erreur chargement PDF:', error);
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
        setCurrentOrderNumber('');
        setShowDownloadPopup(false);
        setPaymentStatusMessage('');
        // ⚠️ AJOUT DES ÉTATS MANQUANTS POUR RESTAURER LE SCROLL
        setLoadingPayment(false);
        setDownloadingPdf(false);
        // Fermer le clavier si ouvert
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

    // Fonction pour enregistrer l'achat sur DefMaks après succès
    const recordSuccessfulPurchase = async (
        orderId: string,
        paymentMethodUsed: 'emoney' | 'ecard',
        providerName?: string
    ) => {
        if (!selectedMagazine) return;

        try {
            console.log('📝 Enregistrement de l\'achat sur DefMaks...');

            const result = await recordMagazinePurchase(
                walletId,
                totalPrice.toString(),
                currency,
                "DEPOSIT",
                `Magazine FDA N°${selectedMagazine.acf.numero}`,
                orderId, // ✅ Utiliser le paramètre orderId
                paymentMethodUsed === 'emoney' ? 'EMONEY' : 'ECARD' // ✅ Platform dynamique
            );

            if (result.success) {
                console.log('✅ Achat enregistré sur DefMaks:', result.purchase_id);
            } else {
                console.warn('⚠️ Échec enregistrement DefMaks:', result.message);
            }
        } catch (error) {
            console.error('❌ Erreur enregistrement DefMaks:', error);
            // Ne pas bloquer le flux principal
        }
    };

    // Paiement E-Money avec polling optimisé et meilleure gestion des états
    const handleEmoneyPayment = async () => {
        if (!selectedMagazine) return;

        if (phone.length < 12) {
            Alert.alert('Erreur', 'Veuillez entrer un numéro de téléphone valide (12 chiffres)');
            return;
        }

        setLoadingPayment(true);
        setPaymentStatusMessage('');

        try {
            const orderId = generateOrderId();
            const amount = isTest ? TEST_PRICE_CDF.toString() : (selectedMagazine.acf.prix_mag + selectedMagazine.acf.tva).toString();

            console.log(`📱 Initiation paiement E-Money: ${orderId} - ${amount} CDF`);

            const result = await initiatePayment(phone, amount, orderId, 'CDF');

            if (!result.success) {
                throw new Error(result.message || 'Échec initiation paiement');
            }

            // Polling avec timeout étendu pour E-Money (nécessite confirmation client)
            setPaymentStatusMessage('🔄 Vérification en cours...');

            const finalStatus = await pollPaymentStatus(
                result.order_id,
                20,  // 20 tentatives (augmenté)
                6000,  // 6 secondes d'intervalle (augmenté)
                (status) => {
                    const message =
                        status.status === 'pending' ? '🔄 En attente de confirmation sur votre téléphone Airtel...' :
                            status.status === 'success' ? '✅ Paiement E-Money confirmé !' :
                                status.status === 'failed' ? '❌ Échec du paiement' :
                                    status.status === 'cancelled' ? '🚫 Paiement annulé' :
                                        '🔄 Vérification en cours...';

                    setPaymentStatusMessage(message);
                }
            );

            if (isPaymentSuccessful(finalStatus.status)) {
                setPaymentStatusMessage('✅ Paiement E-Money confirmé avec succès !');
                setPaymentSuccess(true);
                setShowCheckoutModal(false);

                // 1. ENREGISTREMENT DANS SUPABASE (priorité absolue)
                setPaymentStatusMessage('💾 Enregistrement de la transaction...');
                try {
                    console.log('💾 Enregistrement transaction dans Supabase...');

                    const transactionData = {
                        wallet_id: walletId,
                        amount: parseFloat(amount), // numeric requis par le schéma
                        currency: currency,
                        transaction_type: 'DEPOSIT',
                        description: `Magazine FDA N°${selectedMagazine.acf.numero}`,
                        external_reference: result.order_id,
                        transaction_platform: 'EMONEY'
                    };

                    console.log('📊 Données transaction Supabase:', JSON.stringify(transactionData, null, 2));

                    const { data, error } = await supabase
                        .from('transactions')
                        .insert(transactionData)
                        .select();

                    if (error) {
                        console.error('❌ Erreur enregistrement Supabase:', error);
                        throw error;
                    }

                    console.log('✅ Transaction enregistrée dans Supabase:', data[0]?.id);
                    setPaymentStatusMessage('✅ Transaction enregistrée avec succès !');
                } catch (supabaseError) {
                    console.error('❌ Erreur critique Supabase:', supabaseError);
                    setPaymentStatusMessage('⚠️ Paiement réussi mais erreur d\'enregistrement');
                    Alert.alert('Attention', 'Paiement effectué mais problème lors de l\'enregistrement. Veuillez contacter le support.');
                }

                // 2. TÉLÉCHARGEMENT PDF (après enregistrement réussi)
                setPaymentStatusMessage('📄 Téléchargement du magazine...');
                try {
                    await downloadPdf();
                    setPaymentStatusMessage('✅ Paiement effectué et magazine disponible !');
                } catch (pdfError) {
                    console.error('❌ Erreur téléchargement PDF:', pdfError);
                    setPaymentStatusMessage('⚠️ Paiement effectué mais erreur de téléchargement');
                    Alert.alert('Attention', 'Paiement effectué mais impossible de télécharger le magazine. Vous pouvez le télécharger plus tard.');
                }

                // 3. Enregistrement DefMaks désactivé (API inexistante)
                console.log('💾 Transaction enregistrée dans Supabase (source unique)');
            } else if (finalStatus.status === 'pending') {
                // Cas spécial : toujours en attente après toutes les tentatives
                Alert.alert(
                    'Paiement en attente',
                    'Le paiement n\'a pas encore été confirmé.\n\nVeuillez vérifier si vous avez reçu une demande de confirmation sur votre téléphone Airtel et l\'accepter.\n\nVous pouvez réessayer plus tard.',
                    [
                        { text: 'OK', style: 'cancel' },
                        {
                            text: 'Revérifier',
                            onPress: async () => {
                                try {
                                    setPaymentStatusMessage('🔄 Nouvelle vérification...');
                                    const retryStatus = await pollPaymentStatus(result.order_id, 5, 3000);
                                    if (isPaymentSuccessful(retryStatus.status)) {
                                        setPaymentStatusMessage('✅ Paiement confirmé !');
                                        setPaymentSuccess(true);
                                        setShowCheckoutModal(false);

                                        // Téléchargement PDF
                                        await downloadPdf();

                                        // Enregistrement DefMaks après succès
                                        try {
                                            await recordMagazinePurchase(
                                                walletId,
                                                amount,
                                                'CDF',
                                                "DEPOSIT",
                                                `Magazine FDA N°${selectedMagazine.acf.numero}`,
                                                result.order_id, // Référence TwigaPaie
                                                "EMONEY" // Platform E-Money
                                            );
                                            console.log('📝 Achat enregistré chez DefMaks');
                                        } catch (recordError) {
                                            console.error('❌ Erreur enregistrement DefMaks:', recordError);
                                        }
                                    }
                                } catch (error: any) {
                                    setPaymentStatusMessage('');
                                    handlePaymentError(error);
                                } finally {
                                    setLoadingPayment(false);
                                }
                            }
                        }
                    ]
                );
            } else {
                setPaymentStatusMessage('❌ Échec du paiement ou timeout');
            }
        } catch (error: any) {
            setPaymentStatusMessage('');
            handlePaymentError(error);
        } finally {
            setLoadingPayment(false);
        }
    };

    // Paiement E-Card avec in-app browser
    const handleCardPayment = async () => {
        if (!selectedMagazine) return;

        setLoadingPayment(true);
        setPaymentStatusMessage('Initialisation du paiement par carte...');

        try {
            const orderId = generateOrderId();
            const result = await initiateCardPayment(
                totalPrice.toString(),
                currency,  // CDF en mode test, USD sinon
                `Magazine FDA N°${selectedMagazine.acf.numero}`,
                orderId
            );

            if (result.redirect_url) {
                setCurrentOrderNumber(result.orderNumber || orderId);
                setPaymentStatusMessage('🌐 Ouverture de la page de paiement...');

                // Ouvrir le navigateur in-app
                const browserResult = await openCardPaymentPageSimple(result.redirect_url);

                console.log('📱 Navigateur fermé, résultat:', browserResult);

                // Après fermeture du navigateur, vérifier le statut
                setPaymentStatusMessage('🔄 Vérification du paiement...');

                // Polling pour vérifier le statut
                const finalStatus = await pollCardPaymentStatus(
                    result.orderNumber || orderId,
                    5,  // 5 tentatives
                    3000,  // 3 secondes entre chaque
                    (status: PaymentStatusResponse) => {
                        console.log('📊 Statut carte mis à jour:', status.status);
                    }
                );

                if (isPaymentSuccessful(finalStatus.status)) {
                    setPaymentStatusMessage('✅ Paiement confirmé !');

                    // Enregistrer l'achat sur DefMaks
                    await recordSuccessfulPurchase(result.orderNumber || orderId, 'ecard', 'FlexPay');

                    setPaymentSuccess(true);
                    setShowDownloadPopup(true);
                } else if (isPaymentFailed(finalStatus.status)) {
                    setPaymentStatusMessage('');
                    Alert.alert(
                        '❌ Paiement échoué',
                        `Le paiement par carte a échoué (${finalStatus.rawStatus || finalStatus.status}).`,
                        [{ text: 'OK' }]
                    );
                } else {
                    // Toujours en attente - demander à l'utilisateur
                    setPaymentStatusMessage('');
                    Alert.alert(
                        '🔍 Vérification du paiement',
                        'Avez-vous complété le paiement par carte ?',
                        [
                            {
                                text: 'Non, annuler',
                                style: 'cancel',
                            },
                            {
                                text: 'Oui, vérifier',
                                onPress: () => verifyCardPayment(result.orderNumber || orderId)
                            }
                        ]
                    );
                }
            }
        } catch (error: any) {
            setPaymentStatusMessage('');
            handlePaymentError(error);
        } finally {
            setLoadingPayment(false);
        }
    };

    const verifyCardPayment = async (orderNumber: string) => {
        setLoadingPayment(true);
        setPaymentStatusMessage('🔄 Vérification en cours...');

        try {
            const status = await pollCardPaymentStatus(orderNumber, 3, 3000);

            if (isPaymentSuccessful(status.status)) {
                setPaymentStatusMessage('✅ Paiement confirmé !');

                // Enregistrer l'achat sur DefMaks
                await recordSuccessfulPurchase(orderNumber, 'ecard', 'FlexPay');

                setPaymentSuccess(true);
                setShowDownloadPopup(true);
            } else if (isPaymentFailed(status.status)) {
                setPaymentStatusMessage('');
                Alert.alert(
                    '❌ Paiement échoué',
                    `Le paiement a échoué: ${status.rawStatus || status.status}`
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
            handlePaymentError(error);
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
                    {isTest && (
                        <View style={styles.testBadge}>
                            <Text style={styles.testBadgeText}>TEST</Text>
                        </View>
                    )}
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
            <Text style={styles.header}>Boutique FAM</Text>

            <FlatList
                data={magazines}
                renderItem={renderMagazine}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.list}
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
            />

            {/* Modal de checkout */}
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
                        {/* En-tête */}
                        <View style={styles.checkoutHeader}>
                            <View style={styles.headerLeft}>
                                <Image
                                    source={require('../../assets/twigapaie-logo.png')}
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
                                {/* Info magazine */}
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
                                        {!isTest && (
                                            <Text style={styles.fees}>*Inclus {selectedMagazine.acf.tva}$ de frais</Text>
                                        )}
                                        {isTest && (
                                            <Text style={styles.testModeLabel}>🧪 Mode Test</Text>
                                        )}
                                    </View>
                                </View>

                                {/* Sélection méthode de paiement */}
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
                                                <Text style={styles.paymentOptionSubtitle}>Visa, Mastercard via FlexPay</Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={20} color="#888" />
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {/* Formulaire E-Money */}
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
                                            <Text style={styles.providerDetected}>
                                                📱 {detectedProvider} détecté
                                            </Text>
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

                                        {/* Message de statut du paiement */}
                                        {paymentStatusMessage ? (
                                            <View style={styles.statusMessageContainer}>
                                                <Text style={styles.statusMessageText}>{paymentStatusMessage}</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                )}

                                {/* Formulaire E-Card */}
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
                                            Vous serez redirigé vers la page de paiement sécurisée FlexPay pour entrer vos informations de carte.
                                        </Text>

                                        <View style={styles.cardIcons}>
                                            <Ionicons name="card" size={36} color="#1A1F71" />
                                            <Ionicons name="card" size={36} color="#FF5F00" style={{ marginLeft: 16 }} />
                                        </View>

                                        <TouchableOpacity
                                            style={[styles.payButton, styles.cardPayButton, loadingPayment && styles.payButtonDisabled]}
                                            onPress={handleCardPayment}
                                            disabled={loadingPayment}
                                        >
                                            {loadingPayment ? (
                                                <ActivityIndicator color="#FFF" />
                                            ) : (
                                                <>
                                                    <Ionicons name="lock-closed" size={18} color="#FFF" />
                                                    <Text style={[styles.payButtonText, { marginLeft: 8 }]}>
                                                        Payer {isTest ? `${totalPrice} CDF` : `$${totalPrice.toFixed(2)}`}
                                                    </Text>
                                                </>
                                            )}
                                        </TouchableOpacity>

                                        {/* Message de statut du paiement */}
                                        {paymentStatusMessage ? (
                                            <View style={styles.statusMessageContainer}>
                                                <Text style={styles.statusMessageText}>{paymentStatusMessage}</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                )}
                            </>
                        )}

                        {/* Succès */}
                        {paymentSuccess && (
                            <View style={styles.successContainer}>
                                <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
                                <Text style={styles.successTitle}>Paiement réussi !</Text>
                                <Text style={styles.successSubtitle}>
                                    Merci pour votre achat du Magazine N°{selectedMagazine?.acf.numero}
                                </Text>
                                <TouchableOpacity style={styles.downloadButton} onPress={downloadPdf}>
                                    <Ionicons name="download-outline" size={20} color="#FFF" />
                                    <Text style={styles.downloadButtonText}>Télécharger le PDF</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.backButton} onPress={closeCheckout}>
                                    <Text style={styles.backButtonText}>← Retour à la boutique</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Pop-up de téléchargement */}
                        <Modal
                            visible={showDownloadPopup}
                            transparent={true}
                            animationType="fade"
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
                                        onPress={() => {
                                            setShowDownloadPopup(false);
                                            downloadPdf();
                                        }}
                                    >
                                        <Ionicons name="download-outline" size={22} color="#FFF" />
                                        <Text style={styles.downloadPopupButtonText}>Télécharger le PDF</Text>
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
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Modal notification sécurité TwigaPaie - Placé en dernier pour être au premier plan sur Android */}
            <Modal
                visible={showSecurityNotice}
                transparent={true}
                animationType="fade"
                statusBarTranslucent={true}
                hardwareAccelerated={true}
            >
                <View style={styles.securityOverlay}>
                    <View style={styles.securityModal}>
                        <Image
                            source={require('../../assets/twigapaie-logo.png')}
                            style={styles.securityLogo}
                            resizeMode="contain"
                        />
                        <Ionicons name="shield-checkmark" size={48} color="#4CAF50" />
                        <Text style={styles.securityTitle}>Paiement 100% Sécurisé</Text>
                        <Text style={styles.securityText}>
                            Votre transaction est sécurisée par TwigaPaie,
                            conformément aux termes établis entre{' '}
                            <Text style={styles.boldText}>Femme d'Afrique Magazine</Text> et{' '}
                            <Text style={styles.boldText}>DefMaks</Text>.
                        </Text>
                        <Text style={styles.securitySubtext}>
                            Vos données de paiement sont cryptées et ne sont jamais stockées sur nos serveurs.
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111',
        paddingTop: 50,
        paddingHorizontal: 16,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#FFF',
        textAlign: 'center',
    },
    list: {
        paddingBottom: 100,
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#111',
    },
    loadingText: {
        marginTop: 12,
        color: '#888',
        fontSize: 16,
    },
    magazineCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        marginBottom: 16,
        width: '48%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
        overflow: 'hidden',
    },
    imageContainer: {
        position: 'relative',
    },
    coverMagImage: {
        width: '100%',
        height: 250,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    dateBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: '#FFF',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
    dateBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#333',
    },
    magazineCardInfo: {
        paddingHorizontal: 15,
        paddingTop: 10,
        paddingBottom: 15,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    info: {
        fontSize: 13,
        color: '#666',
        marginBottom: 6,
    },
    price: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    checkoutPanel: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '85%',
    },
    checkoutHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    twigaLogo: {
        width: 32,
        height: 32,
        marginRight: 10,
    },
    checkoutTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    // Notification sécurité
    securityOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    securityModal: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        width: '100%',
        maxWidth: 340,
    },
    securityLogo: {
        width: 60,
        height: 60,
        marginBottom: 12,
    },
    securityTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 12,
        marginBottom: 12,
    },
    securityText: {
        fontSize: 14,
        color: '#555',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 8,
    },
    boldText: {
        fontWeight: 'bold',
        color: Colors.primary,
    },
    securitySubtext: {
        fontSize: 12,
        color: '#888',
        textAlign: 'center',
        marginBottom: 20,
    },
    securityButton: {
        backgroundColor: Colors.primary,
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 25,
    },
    securityButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    // Info magazine
    magazineInfo: {
        flexDirection: 'row',
        marginBottom: 20,
        padding: 12,
        backgroundColor: '#F8F8F8',
        borderRadius: 12,
    },
    checkoutCover: {
        width: 80,
        height: 110,
        borderRadius: 8,
    },
    magazineDetails: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'center',
    },
    magazineTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    magazineSubtitle: {
        fontSize: 13,
        color: '#666',
        marginBottom: 8,
    },
    totalPrice: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    fees: {
        fontSize: 11,
        color: '#888',
        marginTop: 2,
    },
    paymentMethods: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    paymentOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F8F8F8',
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#EEE',
    },
    paymentOptionIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    paymentOptionText: {
        flex: 1,
    },
    paymentOptionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
    },
    paymentOptionSubtitle: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    paymentForm: {
        paddingTop: 8,
    },
    backToMethods: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    backText: {
        color: Colors.primary,
        marginLeft: 6,
        fontSize: 14,
    },
    phoneLabel: {
        fontSize: 14,
        color: '#555',
        marginBottom: 8,
    },
    phoneInput: {
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 10,
        padding: 14,
        fontSize: 16,
        backgroundColor: '#FAFAFA',
        marginBottom: 8,
    },
    providerDetected: {
        fontSize: 13,
        color: '#4CAF50',
        marginBottom: 16,
    },
    // Style pour le message de statut du paiement
    statusMessageContainer: {
        marginTop: 16,
        padding: 12,
        backgroundColor: '#F0F7FF',
        borderRadius: 8,
        borderLeftWidth: 3,
        borderLeftColor: Colors.primary,
    },
    statusMessageText: {
        fontSize: 14,
        color: '#333',
        textAlign: 'center',
    },
    cardInfo: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
        lineHeight: 20,
    },
    cardIcons: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 20,
    },
    payButton: {
        backgroundColor: Colors.primary,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    cardPayButton: {
        backgroundColor: '#1A1F71',
    },
    payButtonDisabled: {
        opacity: 0.7,
    },
    payButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    successContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    successTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginTop: 12,
        marginBottom: 8,
    },
    successSubtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
    },
    downloadButton: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 10,
        width: '80%',
        justifyContent: 'center',
        marginBottom: 12,
    },
    downloadButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    backButton: {
        padding: 10,
    },
    backButtonText: {
        color: Colors.primary,
        fontSize: 14,
    },
    // Styles pour le mode test
    testBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        backgroundColor: '#FF9800',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    testBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#FFF',
    },
    testModeLabel: {
        fontSize: 12,
        color: '#FF9800',
        fontWeight: '600',
        marginTop: 4,
    },
    // Styles pour le pop-up de téléchargement
    downloadPopupOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    downloadPopupModal: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        width: '100%',
        maxWidth: 340,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    downloadPopupIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    downloadPopupTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
        textAlign: 'center',
    },
    downloadPopupSubtitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.primary,
        marginBottom: 12,
        textAlign: 'center',
    },
    downloadPopupText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    downloadPopupButton: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        width: '100%',
        marginBottom: 12,
    },
    downloadPopupButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    downloadPopupLaterButton: {
        paddingVertical: 10,
    },
    downloadPopupLaterText: {
        color: '#888',
        fontSize: 14,
    },
});

export default ShopScreen;