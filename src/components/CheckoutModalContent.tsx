// src/components/CheckoutModalContent.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
    Image,
} from 'react-native';
import { Colors } from '../theme/colors';
import { initiatePayment, checkPaymentStatus } from '../services/twigaPaie';
import { Magazine } from '../models/Magazine';
import { getMedia } from '../services/api';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface CheckoutModalContentProps {
    magazine: Magazine;
    onClose: () => void;
}

const CheckoutModalContent = ({ magazine, onClose }: CheckoutModalContentProps) => {
    const [phone, setPhone] = useState('');
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(true);

    const totalPrice = magazine.acf.prix_mag + magazine.acf.tva;

    const handlePayment = async () => {
        if (!phone.trim().startsWith('243')) {
            Alert.alert('Erreur', 'Veuillez entrer un numéro de téléphone valide commençant par 243');
            return;
        }

        setLoading(true);
        try {
            const result = await initiatePayment(phone, totalPrice.toString(), `MAG-${magazine.id}`);
            setTimeout(async () => {
                try {
                    const status = await checkPaymentStatus(result.order_id);
                    if (status.status === 'completed') {
                        setPaymentSuccess(true);
                    } else {
                        Alert.alert('Paiement en attente', 'Le paiement est en cours de traitement.');
                    }
                } catch (error) {
                    Alert.alert('Erreur', 'Impossible de vérifier le statut du paiement.');
                } finally {
                    setLoading(false);
                }
            }, 3000);
        } catch (error: any) {
            console.error('Erreur paiement:', error);
            const message = error.response?.data?.error?.message || 'Le paiement a échoué.';
            Alert.alert('Erreur', message);
            setLoading(false);
        }
    };

    const downloadPdf = async () => {
        try {
            const media = await getMedia(magazine.acf.pdf);
            const pdfUrl = media.source_url;
            const filename = `FDA_N${magazine.acf.numero}.pdf`;
            const localUri = `${FileSystem.Directory}${filename}`;
            await FileSystem.downloadAsync(pdfUrl, localUri);
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(localUri);
            } else {
                Alert.alert('Succès', `PDF sauvegardé : ${filename}`);
            }
        } catch (error) {
            console.error('Erreur PDF:', error);
            Alert.alert('Erreur', 'Impossible de télécharger le PDF.');
        }
    };

    const closeModalInfo = () => setShowInfoModal(false);

    return (
        <ScrollView style={styles.container}>
            {/* En-tête */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Paiement sécurisé</Text>
                <TouchableOpacity onPress={onClose}>
                    <Text style={styles.closeButton}>×</Text>
                </TouchableOpacity>
            </View>

            {/* Info magazine */}
            <View style={styles.magazineInfo}>
                <View style={styles.row}>
                    {/* Colonne gauche - Image */}
                    <View style={styles.column}>
                        <Image
                            source={{ uri: magazine.better_featured_image?.source_url || magazine.dmks_featured_image?.src }}
                            style={styles.coverImage}
                        />
                    </View>

                    {/* Colonne droite - Texte */}
                    <View style={styles.column}>
                        <Text style={styles.magazineTitle}>{magazine.title.rendered}</Text>
                        <Text style={styles.magazineDetails}>
                            N°{magazine.acf.numero} • {magazine.acf.pages} pages
                        </Text>
                        <Text style={styles.price}>${totalPrice.toFixed(2)} TTC*</Text>
                        <Text style={styles.fees}>*Frais: {magazine.acf.prix_mag} $ + 3%</Text>
                    </View>
                </View>
            </View>
            {/* <View style={styles.magazineInfo}>
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
            </View> */}

            {/* Modal info sécurité (overlay) */}
            {showInfoModal && (
                <View style={styles.overlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>✅ Paiement sécurisé</Text>
                        <Text style={styles.modalText}>
                            Votre paiement est traité via TwigaPaie en toute sécurité.
                        </Text>
                        <TouchableOpacity style={styles.modalButton} onPress={closeModalInfo}>
                            <Text style={styles.modalButtonText}>COMPRIS !</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Formulaire ou succès */}
            {!paymentSuccess ? (
                <View style={styles.paymentForm}>
                    <Text style={styles.sectionTitle}>Payer avec e-money</Text>
                    <Text style={styles.phoneLabel}>Numéro (commence par 243)</Text>
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
            ) : (
                <View style={styles.successContainer}>
                    <Text style={styles.successTitle}>🎉 Paiement réussi !</Text>
                    <TouchableOpacity style={styles.downloadButton} onPress={downloadPdf}>
                        <Text style={styles.downloadButtonText}>📥 Télécharger le PDF</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.backButton} onPress={onClose}>
                        <Text style={styles.backButtonText}>← Retour à la boutique</Text>
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
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
    // 
    // 

    magazineInfo: {
        marginVertical: 10,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    column: {
        flex: 1,
        paddingHorizontal: 8,
    },
    coverImage: {
        width: '100%',
        height: 200,
        resizeMode: 'contain',
    },
    // magazineInfo: {
    //     alignItems: 'center',
    //     padding: 16,
    // },
    // coverImage: {
    //     width: 200,
    //     height: 250,
    //     borderRadius: 8,
    //     marginBottom: 16,
    // },
    magazineTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 8,
    },
    magazineDetails: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 8,
    },
    price: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.primary,
        marginBottom: 4,
    },
    fees: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#FFF',
        padding: 20,
        marginHorizontal: 40,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.primary,
        marginBottom: 12,
    },
    modalText: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
    },
    modalButton: {
        backgroundColor: Colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 6,
    },
    modalButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    paymentForm: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    phoneLabel: {
        fontSize: 14,
        marginBottom: 8,
    },
    phoneInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#FFF',
        marginBottom: 16,
    },
    payButton: {
        backgroundColor: Colors.primary,
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
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
        padding: 16,
        alignItems: 'center',
        marginTop: 32,
    },
    successTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.primary,
        marginBottom: 24,
    },
    downloadButton: {
        backgroundColor: Colors.primary,
        padding: 14,
        borderRadius: 8,
        width: '80%',
        alignItems: 'center',
        marginBottom: 16,
    },
    downloadButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    backButton: {
        padding: 10,
    },
    backButtonText: {
        color: Colors.primary,
        fontSize: 16,
    },
});

export default CheckoutModalContent;