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
    checkPaymentStatus,
    initiateCardPayment,
    checkCardPaymentStatus,
    openCardPaymentPageSimple,
    formatPhoneAndDeduceProvider,
    generateOrderId,
    handlePaymentError,
    pollPaymentStatus,
    pollCardPaymentStatus,
    isPaymentSuccessful,
    isPaymentFailed,
    PaymentMethod,
    PaymentStatusResponse
} from '../services/twigaPaie';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

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
    const [detectedProvider, setDetectedProvider] = useState<string>('');
    const [showSecurityNotice, setShowSecurityNotice] = useState(false);
    const [currentOrderNumber, setCurrentOrderNumber] = useState<string>('');
    const [paymentStatusMessage, setPaymentStatusMessage] = useState<string>('');
    const [showDownloadPopup, setShowDownloadPopup] = useState(false);

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
            const data = await getMagazines(1, 10);
            setMagazines(data);
        } catch (error) {
            console.error('Erreur:', error);
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

    const handleOpenCheckout = (mag: Magazine) => {
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

    // Paiement E-Money
    const handleEmoneyPayment = async () => {
        if (!selectedMagazine) return;
        
        if (phone.length < 12) {
            Alert.alert('Erreur', 'Veuillez entrer un numéro de téléphone valide (12 chiffres)');
            return;
        }

        setLoadingPayment(true);
        Keyboard.dismiss();

        try {
            const orderId = generateOrderId();
            const result = await initiatePayment(
                phone,
                totalPrice.toString(),
                orderId,
                currency  // CDF en mode test, USD sinon
            );

            Alert.alert(
                '📱 Paiement initié',
                'Veuillez confirmer le paiement sur votre téléphone.\nVous recevrez une notification push.',
                [{ text: 'OK' }]
            );

            // Vérifier le statut après un délai
            setTimeout(async () => {
                try {
                    const status = await checkPaymentStatus(result.order_id);
                    if (status.status === 'success') {
                        setPaymentSuccess(true);
                        setShowDownloadPopup(true);
                    } else {
                        Alert.alert(
                            'Paiement en attente', 
                            'Le paiement n\'a pas encore été confirmé. Réessayez la vérification dans quelques instants.',
                            [
                                { text: 'Annuler', style: 'cancel' },
                                { text: 'Revérifier', onPress: () => recheckPayment(result.order_id) }
                            ]
                        );
                    }
                } catch (err) {
                    handlePaymentError(err);
                } finally {
                    setLoadingPayment(false);
                }
            }, 5000);
        } catch (error: any) {
            handlePaymentError(error);
            setLoadingPayment(false);
        }
    };

    const recheckPayment = async (orderId: string) => {
        setLoadingPayment(true);
        try {
            const status = await checkPaymentStatus(orderId);
            if (status.status === 'success') {
                setPaymentSuccess(true);
                setShowDownloadPopup(true);
            } else {
                Alert.alert('En attente', 'Le paiement n\'est pas encore confirmé.');
            }
        } catch (err) {
            handlePaymentError(err);
        } finally {
            setLoadingPayment(false);
        }
    };

    // Paiement E-Card
    const handleCardPayment = async () => {
        if (!selectedMagazine) return;

        setLoadingPayment(true);

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
                
                // Ouvrir le navigateur avec expo-web-browser
                await openCardPaymentPage(result.redirect_url);
                
                // Après fermeture du navigateur, demander vérification
                Alert.alert(
                    'Vérification du paiement',
                    'Avez-vous complété le paiement par carte ?',
                    [
                        { text: 'Non, annuler', style: 'cancel', onPress: () => setLoadingPayment(false) },
                        { text: 'Oui, vérifier', onPress: () => verifyCardPayment(result.orderNumber || orderId) }
                    ]
                );
            }
        } catch (error: any) {
            handlePaymentError(error);
            setLoadingPayment(false);
        }
    };

    const verifyCardPayment = async (orderNumber: string) => {
        try {
            setLoadingPayment(true);
            const status = await checkCardPaymentStatus(orderNumber);
            if (status.status === 'success') {
                setPaymentSuccess(true);
                setShowDownloadPopup(true);
            } else {
                Alert.alert(
                    'Paiement en attente', 
                    'Le paiement n\'a pas encore été confirmé.',
                    [
                        { text: 'OK' },
                        { text: 'Revérifier', onPress: () => verifyCardPayment(orderNumber) }
                    ]
                );
            }
        } catch (error) {
            handlePaymentError(error);
        } finally {
            setLoadingPayment(false);
        }
    };

    const downloadPdf = async () => {
        if (!selectedMagazine) return;
        try {
            const media = await getMedia(selectedMagazine.acf.pdf);
            const pdfUrl = media.source_url;
            const filename = `FDA_N${selectedMagazine.acf.numero}.pdf`;
            const documentDir = FileSystem.Paths?.document?.uri || FileSystem.Paths?.cache?.uri || '';
            const localUri = `${documentDir}/${filename}`;
            
            // Télécharger le fichier
            const downloadResult = await FileSystem.downloadAsync(pdfUrl, localUri);

            if (downloadResult.status === 200) {
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(localUri);
                } else {
                    Alert.alert('Succès', `PDF sauvegardé : ${filename}`);
                }
            } else {
                throw new Error('Téléchargement échoué');
            }
        } catch (error) {
            console.error('Erreur PDF:', error);
            Alert.alert('Erreur', 'Impossible de télécharger le PDF.');
        }
    };

    const formatMagazineDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
            return `${months[date.getMonth()]} ${date.getFullYear()}`;
        } catch {
            return '';
        }
    };

    const renderMagazine = ({ item }: { item: Magazine }) => {
        const displayPrice = isTest 
            ? `${TEST_PRICE_CDF} CDF TTC` 
            : `$${(item.acf.prix_mag + item.acf.tva).toFixed(2)} TTC*`;
        
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
            <Text style={styles.header}>Boutique FDA</Text>

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
