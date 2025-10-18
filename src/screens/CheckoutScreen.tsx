// src/screens/CheckoutScreen.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    StyleSheet,
    Alert,
    ScrollView,
    Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../theme/colors';
import { initiatePayment, checkPaymentStatus } from '../services/twigaPaie';
import { Magazine } from '../models/Magazine';
import { getMedia } from '../services/api';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// 🔹 Définir les paramètres de navigation
export type RootStackParamList = {
    Main: undefined;
    Checkout: { magazine: Magazine };
};

type CheckoutScreenProps = NativeStackScreenProps<RootStackParamList, 'Checkout'>;

const CheckoutScreen = ({ route }: CheckoutScreenProps) => {
    const navigation = useNavigation();
    const { magazine } = route.params;
    const [phone, setPhone] = useState('');
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(true);

    // Calcul du prix TTC
    const totalPrice = magazine.acf.prix_mag + magazine.acf.tva;

    const handlePayment = async () => {
        if (!phone.trim().startsWith('243')) {
            Alert.alert('Erreur', 'Veuillez entrer un numéro de téléphone valide commençant par 243');
            return;
        }

        setLoading(true);
        try {
            const result = await initiatePayment(phone, totalPrice.toString(), `MAG-${magazine.id}`);

            // Simuler une vérification après quelques secondes
            setTimeout(async () => {
                try {
                    const status = await checkPaymentStatus(result.order_id);
                    if (status.status === 'completed') {
                        setPaymentSuccess(true);
                    } else {
                        Alert.alert('Paiement en attente', 'Le paiement est en cours de traitement. Veuillez vérifier plus tard.');
                    }
                } catch (error) {
                    console.error('Erreur vérification:', error);
                    Alert.alert('Erreur', 'Impossible de vérifier le statut du paiement.');
                } finally {
                    setLoading(false);
                }
            }, 3000);
        } catch (error: any) {
            console.error('Erreur paiement:', error);
            const message = error.response?.data?.error?.message || 'Le paiement a échoué. Veuillez réessayer.';
            Alert.alert('Erreur', message);
            setLoading(false);
        }
    };

    const downloadPdf = async () => {
        try {
            // 1. Récupérer l'URL du PDF
            const media = await getMedia(magazine.acf.pdf);
            const pdfUrl = media.source_url;

            // 2. Télécharger le fichier
            const filename = `FDA_N${magazine.acf.numero}.pdf`;
            const localUri = `${FileSystem.Directory}${filename}`;
            await FileSystem.downloadAsync(pdfUrl, localUri);

            // 3. Partager / Ouvrir le PDF
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(localUri);
            } else {
                Alert.alert('Succès', `PDF téléchargé : ${filename}`);
            }
        } catch (error) {
            console.error('Erreur téléchargement PDF:', error);
            Alert.alert('Erreur', 'Impossible de télécharger le PDF. Veuillez réessayer.');
        }
    };

    const closeModal = () => {
        setShowInfoModal(false);
    };

    return (
        <ScrollView style={styles.container}>
            {/* En-tête */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Paiement sécurisé</Text>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.closeButton}>×</Text>
                </TouchableOpacity>
            </View>

            {/* Informations sur le magazine */}
            <View style={styles.magazineInfo}>
                <Image
                    source={{ uri: magazine.better_featured_image?.source_url || magazine.dmks_featured_image?.src }}
                    style={styles.coverImage}
                />
                <Text style={styles.magazineTitle}>{magazine.title.rendered}</Text>
                <Text style={styles.magazineDetails}>
                    N°{magazine.acf.numero} • {magazine.acf.pages} pages
                </Text>
                <Text style={styles.price}>${totalPrice.toFixed(2)} TTC*</Text>
                <Text style={styles.fees}>*Frais: {magazine.acf.prix_mag} $ + 3%</Text>
            </View>

            {/* Modal d'information de sécurité */}
            <Modal visible={showInfoModal} transparent={true} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>✅ Paiement sécurisé et traçable</Text>
                        </View>
                        <Text style={styles.modalText}>
                            Soyez assuré(e) que votre paiement est directement enregistré sur le compte officiel de Femme d’Afrique Magazine grâce à l’intégration de TwigaPaie.
                        </Text>
                        <Text style={styles.modalText}>
                            • Traçabilité garantie : Chaque transaction est soigneusement suivie et documentée pour vous offrir une transparence totale.
                        </Text>
                        <Text style={styles.modalText}>
                            • Sécurité assurée : Vos paiements sont protégés et traités dans un environnement hautement sécurisé, répondant aux standards internationaux.
                        </Text>
                        <Text style={styles.modalText}>
                            • Confidentialité respectée : Vos données personnelles et bancaires sont traitées avec la plus grande confidentialité, en conformité avec les réglementations en vigueur.
                        </Text>
                        <Text style={styles.modalText}>
                            En outre, DefMaks veille au suivi rigoureux de chaque paiement et, une fois les transactions validées, transfère l’intégralité des fonds à Femme d’Afrique Magazine, conformément aux accords signés entre les deux parties.
                        </Text>
                        <Text style={styles.modalText}>
                            Après votre paiement, vous pourrez télécharger immédiatement le magazine au format PDF et profiter de nos contenus exclusifs.
                        </Text>
                        <Text style={styles.modalText}>
                            En cas de questions ou de réclamations, notre équipe est à votre écoute. N’hésitez pas à nous contacter via le bouton ci-dessous :
                        </Text>
                        <TouchableOpacity style={styles.supportButton}>
                            <Text style={styles.supportButtonText}>📧 Contactez notre support</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalText}>
                            Nous sommes là pour vous accompagner à chaque étape et garantir votre satisfaction. Votre confiance est notre priorité, et nous mettons tout en œuvre pour vous offrir une expérience exceptionnelle.
                        </Text>
                        <Text style={styles.modalText}>Avec nos meilleures salutations, L’équipe Femme d’Afrique Magazine</Text>
                        <TouchableOpacity style={styles.modalButton} onPress={closeModal}>
                            <Text style={styles.modalButtonText}>COMPRIS !</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Formulaire de paiement */}
            {!paymentSuccess && (
                <View style={styles.paymentForm}>
                    <Text style={styles.sectionTitle}>Payer avec</Text>
                    <View style={styles.paymentOptions}>
                        <TouchableOpacity style={styles.paymentOption}>
                            <Text style={styles.paymentOptionText}>e-money</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.paymentOption, styles.disabledOption]}>
                            <Text style={[styles.paymentOptionText, styles.disabledText]}>Card</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.phoneLabel}>Saisir votre numéro de téléphone en commençant par : 243</Text>
                    <TextInput
                        style={styles.phoneInput}
                        placeholder="243XXXXXXXXX"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                    />
                    <TouchableOpacity
                        style={[styles.payButton, loading && styles.payButtonDisabled]}
                        onPress={handlePayment}
                        disabled={loading}
                    >
                        <Text style={styles.payButtonText}>
                            {loading ? 'En cours...' : 'Acheter'}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Résumé après paiement réussi */}
            {paymentSuccess && (
                <View style={styles.successContainer}>
                    <Text style={styles.successTitle}>🎉 Paiement réussi !</Text>
                    <Text style={styles.successMessage}>
                        Vous avez bien acheté le magazine {magazine.title.rendered}.
                    </Text>
                    <Text style={styles.successMessage}>
                        Le PDF est maintenant disponible pour téléchargement.
                    </Text>
                    <TouchableOpacity style={styles.downloadButton} onPress={downloadPdf}>
                        <Text style={styles.downloadButtonText}>📥 Télécharger le PDF</Text>
                    </TouchableOpacity>
                    <Text style={styles.supportMessage}>
                        Si vous avez des questions, contactez notre support.
                    </Text>
                    <TouchableOpacity style={styles.supportButton} onPress={() => Alert.alert('Support', 'Contactez-nous à info@defmaks.com')}>
                        <Text style={styles.supportButtonText}>📧 Contactez notre support</Text>
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: Colors.primary,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    closeButton: {
        fontSize: 24,
        color: '#FFFFFF',
    },
    magazineInfo: {
        alignItems: 'center',
        padding: 16,
    },
    coverImage: {
        width: 200,
        height: 250,
        borderRadius: 8,
        marginBottom: 16,
    },
    magazineTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
        color: Colors.text,
    },
    magazineDetails: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 8,
        color: Colors.text,
    },
    price: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.primary,
        marginBottom: 4,
    },
    fees: {
        fontSize: 12,
        color: Colors.text,
        marginBottom: 16,
    },
    paymentForm: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
        color: Colors.text,
    },
    paymentOptions: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    paymentOption: {
        flex: 1,
        padding: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        alignItems: 'center',
        marginRight: 8,
        backgroundColor: '#FFFFFF',
    },
    disabledOption: {
        opacity: 0.5,
    },
    paymentOptionText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.text,
    },
    disabledText: {
        color: Colors.border,
    },
    phoneLabel: {
        fontSize: 14,
        marginBottom: 8,
        color: Colors.text,
    },
    phoneInput: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        fontSize: 16,
        backgroundColor: '#FFFFFF',
    },
    payButton: {
        backgroundColor: Colors.primary,
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    payButtonDisabled: {
        backgroundColor: Colors.primaryDark,
    },
    payButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    successContainer: {
        padding: 16,
        alignItems: 'center',
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.primary,
        marginBottom: 16,
    },
    successMessage: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 16,
        color: Colors.text,
    },
    downloadButton: {
        backgroundColor: Colors.primary,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 16,
    },
    downloadButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    supportMessage: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 16,
        color: Colors.text,
    },
    supportButton: {
        backgroundColor: Colors.primaryLight,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    supportButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: Colors.primaryDark,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        width: '90%',
        maxHeight: '80%',
    },
    modalHeader: {
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        paddingBottom: 12,
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    modalText: {
        fontSize: 14,
        marginBottom: 8,
        color: Colors.text,
        lineHeight: 20,
    },
    modalButton: {
        backgroundColor: Colors.primary,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 16,
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
});

export default CheckoutScreen;