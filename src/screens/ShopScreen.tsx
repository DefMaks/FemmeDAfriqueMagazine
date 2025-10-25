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
    ScrollView,
    Alert,
    TextInput,
    Keyboard
} from 'react-native';
import { getMagazines, getMedia } from '../services/api';
import { Magazine } from '../models/Magazine';
import { Colors } from '../theme/colors';
import { initiatePayment, checkPaymentStatus } from '../services/twigaPaie';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const ShopScreen = () => {
    const [magazines, setMagazines] = useState<Magazine[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMagazine, setSelectedMagazine] = useState<Magazine | null>(null);
    const [phone, setPhone] = useState('');
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [loadingPayment, setLoadingPayment] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);

    useEffect(() => {
        fetchMagazines();
    }, []);

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

    const totalPrice = selectedMagazine
        ? selectedMagazine.acf.prix_mag + selectedMagazine.acf.tva
        : 0;

    const handleOpenCheckout = (mag: Magazine) => {
        setSelectedMagazine(mag);
        setShowInfoModal(true);
    };

    const closeCheckout = () => {
        setSelectedMagazine(null);
        setPhone('');
        setPaymentSuccess(false);
        setShowInfoModal(false);
    };

    const handlePayment = async () => {
        if (!selectedMagazine) return;
        if (!phone.trim().startsWith('243')) {
            Alert.alert('Erreur', 'Le numéro doit commencer par 243');
            return;
        }

        setLoadingPayment(true);
        try {
            const result = await initiatePayment(
                phone,
                totalPrice.toString(),
                `MAG-${selectedMagazine.id}`
            );

            setTimeout(async () => {
                try {
                    const status = await checkPaymentStatus(result.order_id);
                    if (status.status === 'completed') {
                        setPaymentSuccess(true);
                    } else {
                        Alert.alert('Paiement en attente', 'Veuillez vérifier plus tard.');
                    }
                } catch (err) {
                    Alert.alert('Erreur', 'Impossible de vérifier le paiement.');
                } finally {
                    setLoadingPayment(false);
                }
            }, 3000);
        } catch (error: any) {
            console.error('Paiement échoué:', error);
            Alert.alert('Erreur', 'Le paiement a échoué. Veuillez réessayer.');
            setLoadingPayment(false);
        }
    };

    const downloadPdf = async () => {
        if (!selectedMagazine) return;
        try {
            const media = await getMedia(selectedMagazine.acf.pdf);
            const pdfUrl = media.source_url;
            const filename = `FDA_N${selectedMagazine.acf.numero}.pdf`;
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

    const renderMagazine = ({ item }: { item: Magazine }) => (
        <TouchableOpacity
            style={styles.magazineCard}
            onPress={() => handleOpenCheckout(item)}
        >
            <Image
                source={{
                    uri: item.better_featured_image?.source_url || item.dmks_featured_image?.src,
                }}
                style={styles.coverMagImage}
            />
            <View style={styles.magazineCardInfo}>
                <Text style={styles.title}>N°{item.acf.numero}</Text>
                {/* <Text style={styles.title}>{item.title.rendered}</Text> */}
                <Text style={styles.info}>{item.acf.pages} pages</Text>
                {/* <Text style={styles.info}>N°{item.acf.numero} • {item.acf.pages} pages</Text> */}
                <Text style={styles.price}>${(item.acf.prix_mag + item.acf.tva).toFixed(2)} TTC*</Text>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <Text>Chargement...</Text>
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

            {/* Overlay flou */}
            {selectedMagazine && (
                <View style={styles.overlay} />
            )}

            {/* Modal de checkout (moitié inférieure) */}
            {selectedMagazine && (
                <Modal transparent={true} animationType="slide">
                    <TouchableOpacity
                        style={styles.modalContainer}
                        activeOpacity={1}
                        onPress={() => Keyboard.dismiss()}
                    >
                        <View style={styles.modalContainer}>
                            <View style={styles.checkoutPanel}>
                                {/* En-tête */}
                                <View style={styles.checkoutHeader}>
                                    <Text style={styles.checkoutTitle}>Paiement sécurisé </Text>
                                    <TouchableOpacity onPress={closeCheckout}>
                                        <Text style={styles.closeButton}>×</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Info magazine */}
                                {/* <View style={styles.magazineInfo}>
                                <Image
                                    source={{
                                        uri: selectedMagazine.better_featured_image?.source_url ||
                                            selectedMagazine.dmks_featured_image?.src,
                                    }}
                                    style={styles.coverImage}
                                />
                                <Text style={styles.magazineTitle}>{selectedMagazine.title.rendered}</Text>
                                <Text style={styles.magazineDetails}>
                                    N°{selectedMagazine.acf.numero} • {selectedMagazine.acf.pages} pages
                                </Text>
                                <Text style={styles.price}>${totalPrice.toFixed(2)} TTC*</Text>
                                <Text style={styles.fees}>*Frais: {selectedMagazine.acf.prix_mag} $ + 3%</Text>
                            </View> */}

                                <View style={styles.magazineInfo}>
                                    <View style={styles.row}>
                                        {/* Colonne gauche - Image */}
                                        <View style={styles.column}>
                                            <Image
                                                source={{ uri: selectedMagazine.better_featured_image?.source_url || selectedMagazine.dmks_featured_image?.src }}
                                                style={styles.coverImage}
                                            />
                                        </View>

                                        {/* Colonne droite - Texte */}
                                        <View style={styles.column}>
                                            <Text style={styles.magazineTitle}>{selectedMagazine.title.rendered}</Text>
                                            <Text style={styles.magazineDetails}>
                                                N°{selectedMagazine.acf.numero} • {selectedMagazine.acf.pages} pages
                                            </Text>
                                            {/* <Text style={styles.magazineDetails}>
                                            N°{selectedMagazine.acf.numero} • {selectedMagazine.acf.pages} pages
                                        </Text> */}
                                            <Text style={[styles.price, { textAlign: 'center' }]}>${totalPrice.toFixed(2)} TTC*</Text>
                                            <Text style={[styles.fees, { textAlign: 'center' }]}>*Frais: {selectedMagazine.acf.prix_mag} $ + 3%</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Modal info sécurité */}
                                {showInfoModal && (
                                    <Modal transparent={true} animationType="fade">
                                        <View style={styles.infoModalOverlay}>
                                            <View style={styles.infoModalContent}>
                                                <Text style={styles.infoModalTitle}>✅ Paiement sécurisé</Text>
                                                <Text style={styles.infoModalText}>
                                                    Votre paiement est traité via TwigaPaie en toute sécurité.
                                                </Text>
                                                <TouchableOpacity style={styles.infoModalButton} onPress={() => setShowInfoModal(false)}>
                                                    <Text style={styles.infoModalButtonText}>COMPRIS !</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </Modal>
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
                                            style={[styles.payButton, loadingPayment && styles.payButtonDisabled]}
                                            onPress={handlePayment}
                                            disabled={loadingPayment}
                                        >
                                            <Text style={styles.payButtonText}>
                                                {loadingPayment ? 'En cours...' : 'Acheter'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={styles.successContainer}>
                                        <Text style={styles.successTitle}>🎉 Paiement réussi !</Text>
                                        <TouchableOpacity style={styles.downloadButton} onPress={downloadPdf}>
                                            <Text style={styles.downloadButtonText}>📥 Télécharger le PDF</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.backButton} onPress={closeCheckout}>
                                            <Text style={styles.backButtonText}>← Retour à la boutique</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </View>
                    </TouchableOpacity>
                </Modal>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.shadow,
        // backgroundColor: Colors.background,
        paddingTop: 45,
        paddingBottom: 20,
        paddingHorizontal: 16,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
        color: Colors.border,
        textAlign: 'center',
    },
    list: {
        paddingBottom: 100,
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    magazineCardInfo: {
        paddingHorizontal: 15,
        paddingTop: 7,
        paddingBottom: 15
    },
    magazineCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        marginBottom: 16,
        // padding: 12,
        width: '48%',
        shadowColor: '#b4b4b4',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 5,
        borderColor: 'rgba((255,255,255), 0.4)',
        borderWidth: 1,
    },
    coverMagImage: {
        width: '100%',
        height: 250,
        // borderRadius: 8,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: Colors.primary
    },
    // coverMagImage: {
    //     width: '100%',
    //     height: 200,
    //     resizeMode: 'contain',
    // },
    title: {
        fontSize: 15,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 4,
    },
    info: {
        fontSize: 13,
        color: '#666',
        marginBottom: 4,
    },
    price: {
        fontSize: 15,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'black',
        opacity: 0.4,
        zIndex: 10,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    checkoutPanel: {
        height: '60%', // ← Moitié inférieure (ajustable)
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 10,
    },
    checkoutHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    checkoutTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
    },
    closeButton: {
        fontSize: 24,
        color: '#888',
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
    //
    //
    _magazineInfo: {
        alignItems: 'center',
        marginBottom: 20,
    },
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
    fees: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    paymentForm: {
        paddingVertical: 8,
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
        paddingVertical: 8,
        alignItems: 'center',
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
    infoModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoModalContent: {
        backgroundColor: '#FFF',
        padding: 20,
        marginHorizontal: 40,
        borderRadius: 12,
        alignItems: 'center',
    },
    infoModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.primary,
        marginBottom: 12,
    },
    infoModalText: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
    },
    infoModalButton: {
        backgroundColor: Colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 6,
    },
    infoModalButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
});

export default ShopScreen;

// // src/screens/ShopScreen.tsx
// import React, { useEffect, useState } from 'react';
// import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
// import { getMagazines, getMedia } from '../services/api';
// import { Magazine } from '../models/Magazine';
// import { Colors } from '../theme/colors';
// import { Ionicons } from '@expo/vector-icons';
// import { useNavigation } from '@react-navigation/native';

// const ShopScreen = () => {
//     const [magazines, setMagazines] = useState<Magazine[]>([]);
//     const [loading, setLoading] = useState(true);
//     const navigation = useNavigation<any>();


//     useEffect(() => {
//         fetchMagazines();
//     }, []);

//     const fetchMagazines = async () => {
//         try {
//             const data = await getMagazines(1, 10);
//             setMagazines(data);
//         } catch (error) {
//             console.error('Erreur:', error);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const getPdfUrl = async (pdfId: number) => {
//         try {
//             const media = await getMedia(pdfId);
//             return media.source_url;
//         } catch (error) {
//             console.error('Erreur récupération PDF:', error);
//             return null;
//         }
//     };

//     const renderMagazine = ({ item }: { item: Magazine }) => (
//         <TouchableOpacity style={styles.magazineCard} activeOpacity={0.8} onPress={() => navigation.navigate('Checkout', { magazine: item })} // ← Ajouté
//         >
//             <View style={styles.imageContainer}>
//                 <Image
//                     source={{ uri: item.better_featured_image?.source_url || item.dmks_featured_image?.src }}
//                     style={styles.coverImage}
//                 />
//                 <View style={styles.badge}>
//                     <Text style={styles.badgeText}>N°{item.acf.numero}</Text>
//                 </View>
//             </View>
//             <View style={styles.magazineInfo}>
//                 <Text style={styles.title} numberOfLines={2}>{item.title.rendered}</Text>
//                 <View style={styles.metaInfo}>
//                     <Ionicons name="document-text-outline" size={14} color={Colors.textSecondary} />
//                     <Text style={styles.pages}>{item.acf.pages} pages</Text>
//                 </View>
//                 <View style={styles.priceContainer}>
//                     <Text style={styles.price}>${(item.acf.prix_mag + item.acf.tva).toFixed(2)}</Text>
//                     <TouchableOpacity style={styles.addButton}>
//                         <Ionicons name="cart-outline" size={18} color="#FFF" />
//                     </TouchableOpacity>
//                 </View>
//             </View>
//         </TouchableOpacity>
//     );

//     if (loading) {
//         return (
//             <View style={styles.loadingContainer}>
//                 <ActivityIndicator size="large" color={Colors.primary} />
//                 <Text style={styles.loadingText}>Chargement...</Text>
//             </View>
//         );
//     }

//     return (
//         <View style={styles.container}>
//             <View style={styles.header}>
//                 <View>
//                     <Text style={styles.headerSubtitle}>Explorez</Text>
//                     <Text style={styles.headerTitle}>Notre Boutique</Text>
//                 </View>
//                 <TouchableOpacity style={styles.searchButton}>
//                     <Ionicons name="search-outline" size={24} color={Colors.text} />
//                 </TouchableOpacity>

//             </View>

//             {/* Bande disclaimer ici */}

//             <FlatList
//                 data={magazines}
//                 renderItem={renderMagazine}
//                 keyExtractor={(item) => item.id.toString()}
//                 contentContainerStyle={styles.list}
//                 numColumns={2}
//                 columnWrapperStyle={styles.columnWrapper}
//                 showsVerticalScrollIndicator={false}
//             />
//         </View>
//     );
// };

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         backgroundColor: '#000000',
//     },
//     header: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//         paddingHorizontal: 20,
//         paddingTop: 60,
//         paddingBottom: 20,
//         backgroundColor: '#000000',
//     },
//     headerSubtitle: {
//         fontSize: 14,
//         color: '#999999',
//         marginBottom: 4,
//     },
//     headerTitle: {
//         fontSize: 24,
//         fontWeight: '700',
//         color: '#FFFFFF',
//     },
//     searchButton: {
//         width: 44,
//         height: 44,
//         borderRadius: 22,
//         backgroundColor: Colors.borderLight,
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     logoShop: {
//         // width: 44,
//         // height: 44,
//         // borderRadius: 22,
//         // backgroundColor: Colors.borderLight,
//         // justifyContent: 'center',
//         // alignItems: 'center',
//         width: 40,
//         height: 40,
//         marginRight: 12,
//     },
//     list: {
//         paddingHorizontal: 12,
//         paddingTop: 12,
//         paddingBottom: 100,
//     },
//     columnWrapper: {
//         justifyContent: 'space-between',
//         paddingHorizontal: 8,
//     },
//     magazineCard: {
//         backgroundColor: Colors.backgroundLight,
//         borderRadius: 16,
//         marginBottom: 16,
//         width: '48%',
//         shadowColor: Colors.shadow,
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.08,
//         shadowRadius: 8,
//         elevation: 3,
//         overflow: 'hidden',
//     },
//     imageContainer: {
//         position: 'relative',
//     },
//     coverImage: {
//         width: '100%',
//         height: 220,
//     },
//     badge: {
//         position: 'absolute',
//         top: 12,
//         right: 12,
//         backgroundColor: Colors.primary,
//         paddingHorizontal: 10,
//         paddingVertical: 6,
//         borderRadius: 12,
//     },
//     badgeText: {
//         fontSize: 11,
//         fontWeight: '700',
//         color: '#FFF',
//     },
//     magazineInfo: {
//         padding: 12,
//     },
//     title: {
//         fontSize: 14,
//         fontWeight: '700',
//         color: Colors.text,
//         marginBottom: 8,
//         lineHeight: 18,
//     },
//     metaInfo: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         marginBottom: 12,
//     },
//     pages: {
//         fontSize: 12,
//         color: Colors.textSecondary,
//         marginLeft: 6,
//     },
//     priceContainer: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//     },
//     price: {
//         fontSize: 18,
//         fontWeight: '700',
//         color: Colors.primary,
//     },
//     addButton: {
//         width: 36,
//         height: 36,
//         borderRadius: 18,
//         backgroundColor: Colors.primary,
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     loadingContainer: {
//         flex: 1,
//         justifyContent: 'center',
//         alignItems: 'center',
//         backgroundColor: Colors.background,
//     },
//     loadingText: {
//         marginTop: 16,
//         fontSize: 16,
//         color: Colors.textSecondary,
//     },
// });

// export default ShopScreen;
