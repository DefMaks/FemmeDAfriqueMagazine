// src/screens/ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    Switch,
    Modal,
    TextInput,
    Alert,
    Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { Colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const STORAGE_KEYS = {
    NOTIFICATIONS: '@fda_notifications',
    USER_EMAIL: '@fda_user_email',
    USER_PHONE: '@fda_user_phone',
    SOCIAL_X: '@fda_social_x',
    SOCIAL_FB: '@fda_social_fb',
};

const ProfileScreen = () => {
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [showEditModal, setShowEditModal] = useState(false);
    
    // États du formulaire
    const [userEmail, setUserEmail] = useState('');
    const [userPhone, setUserPhone] = useState('243');
    const [socialX, setSocialX] = useState('');
    const [socialFB, setSocialFB] = useState('');

    // Charger les préférences au démarrage
    useEffect(() => {
        loadUserPreferences();
    }, []);

    const loadUserPreferences = async () => {
        try {
            const [notifications, email, phone, x, fb] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS),
                AsyncStorage.getItem(STORAGE_KEYS.USER_EMAIL),
                AsyncStorage.getItem(STORAGE_KEYS.USER_PHONE),
                AsyncStorage.getItem(STORAGE_KEYS.SOCIAL_X),
                AsyncStorage.getItem(STORAGE_KEYS.SOCIAL_FB),
            ]);
            
            setNotificationsEnabled(notifications !== 'false');
            if (email) setUserEmail(email);
            if (phone) setUserPhone(phone);
            if (x) setSocialX(x);
            if (fb) setSocialFB(fb);
        } catch (error) {
            console.error('Erreur chargement préférences:', error);
        }
    };

    const handleToggleNotifications = async (value: boolean) => {
        setNotificationsEnabled(value);
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, value.toString());
            // Ici on pourrait aussi activer/désactiver OneSignal
            console.log(`📱 Notifications ${value ? 'activées' : 'désactivées'}`);
        } catch (error) {
            console.error('Erreur sauvegarde notifications:', error);
        }
    };

    const handleSaveProfile = async () => {
        try {
            await Promise.all([
                AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, userEmail),
                AsyncStorage.setItem(STORAGE_KEYS.USER_PHONE, userPhone),
                AsyncStorage.setItem(STORAGE_KEYS.SOCIAL_X, socialX),
                AsyncStorage.setItem(STORAGE_KEYS.SOCIAL_FB, socialFB),
            ]);
            setShowEditModal(false);
            Alert.alert('✅ Succès', 'Votre profil a été mis à jour.');
        } catch (error) {
            console.error('Erreur sauvegarde profil:', error);
            Alert.alert('Erreur', 'Impossible de sauvegarder vos informations.');
        }
    };

    const openAboutPage = async () => {
        try {
            await WebBrowser.openBrowserAsync('https://femmedafrique.net/a-propos/', {
                showTitle: true,
                enableBarCollapsing: true,
            });
        } catch (error) {
            console.error('Erreur ouverture page:', error);
        }
    };

    const openReclamationsPage = async () => {
        try {
            await WebBrowser.openBrowserAsync('https://femmedafrique.net/procedure-de-reclamation-des-lecteurs-et-abonnes/', {
                showTitle: true,
                enableBarCollapsing: true,
            });
        } catch (error) {
            console.error('Erreur ouverture page:', error);
        }
    };

    const openSupportEmail = () => {
        Linking.openURL('mailto:support@defmaks.com?subject=Support FDA App');
    };

    const menuItems = [
        { 
            id: '1', 
            icon: 'person-outline', 
            title: 'Modifier le profil', 
            subtitle: 'Email, téléphone, réseaux sociaux',
            action: () => setShowEditModal(true)
        },
        { 
            id: '2', 
            icon: 'notifications-outline', 
            title: 'Notifications', 
            subtitle: notificationsEnabled ? 'Activées' : 'Désactivées',
            isToggle: true
        },
        { 
            id: '3', 
            icon: 'bookmark-outline', 
            title: 'Mes favoris', 
            subtitle: 'Articles sauvegardés',
            action: () => {} // Navigation vers les favoris
        },
        { 
            id: '4', 
            icon: 'information-circle-outline', 
            title: 'À Propos', 
            subtitle: 'En savoir plus sur FDA',
            action: openAboutPage
        },
        { 
            id: '5', 
            icon: 'chatbubble-ellipses-outline', 
            title: 'Réclamations', 
            subtitle: 'Procédure de réclamation',
            action: openReclamationsPage
        },
        { 
            id: '6', 
            icon: 'help-circle-outline', 
            title: 'Aide & Support', 
            subtitle: 'Contactez-nous par email',
            action: openSupportEmail
        },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Profil</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            <Ionicons name="person" size={48} color={Colors.primary} />
                        </View>
                        <TouchableOpacity style={styles.editAvatarButton}>
                            <Ionicons name="camera" size={16} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.userName}>
                        {userEmail || 'Utilisateur'}
                    </Text>
                    <Text style={styles.userEmail}>
                        {userPhone !== '243' ? userPhone : 'Configurer votre profil'}
                    </Text>
                </View>

                <View style={styles.statsCard}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>24</Text>
                        <Text style={styles.statLabel}>Articles lus</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>8</Text>
                        <Text style={styles.statLabel}>Sauvegardés</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>15</Text>
                        <Text style={styles.statLabel}>Jours actifs</Text>
                    </View>
                </View>

                <View style={styles.menuSection}>
                    {menuItems.map((item) => (
                        <TouchableOpacity 
                            key={item.id} 
                            style={styles.menuItem} 
                            activeOpacity={0.8}
                            onPress={item.action}
                            disabled={item.isToggle}
                        >
                            <View style={styles.menuIconContainer}>
                                <Ionicons name={item.icon as any} size={24} color={Colors.primary} />
                            </View>
                            <View style={styles.menuContent}>
                                <Text style={styles.menuTitle}>{item.title}</Text>
                                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                            </View>
                            {item.isToggle ? (
                                <Switch
                                    value={notificationsEnabled}
                                    onValueChange={handleToggleNotifications}
                                    trackColor={{ false: '#D1D1D6', true: Colors.primary + '80' }}
                                    thumbColor={notificationsEnabled ? Colors.primary : '#F4F3F4'}
                                />
                            ) : (
                                <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.version}>Version 1.0.0</Text>
            </ScrollView>

            {/* Modal Modifier le profil */}
            <Modal
                visible={showEditModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowEditModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Modifier le profil</Text>
                            <TouchableOpacity onPress={() => setShowEditModal(false)}>
                                <Ionicons name="close-circle" size={28} color="#888" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.inputLabel}>Adresse email</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="votre@email.com"
                                value={userEmail}
                                onChangeText={setUserEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />

                            <Text style={styles.inputLabel}>Téléphone (pour achats)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="243XXXXXXXXX"
                                value={userPhone}
                                onChangeText={setUserPhone}
                                keyboardType="phone-pad"
                                maxLength={12}
                            />

                            <Text style={styles.sectionLabel}>Réseaux sociaux</Text>
                            
                            <View style={styles.socialInputRow}>
                                <View style={[styles.socialIcon, { backgroundColor: '#000' }]}>
                                    <Ionicons name="logo-twitter" size={20} color="#FFF" />
                                </View>
                                <TextInput
                                    style={[styles.input, styles.socialInput]}
                                    placeholder="@votre_pseudo"
                                    value={socialX}
                                    onChangeText={setSocialX}
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={styles.socialInputRow}>
                                <View style={[styles.socialIcon, { backgroundColor: '#1877F2' }]}>
                                    <Ionicons name="logo-facebook" size={20} color="#FFF" />
                                </View>
                                <TextInput
                                    style={[styles.input, styles.socialInput]}
                                    placeholder="votre.nom.facebook"
                                    value={socialFB}
                                    onChangeText={setSocialFB}
                                    autoCapitalize="none"
                                />
                            </View>

                            <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
                                <Text style={styles.saveButtonText}>Enregistrer</Text>
                            </TouchableOpacity>
                        </ScrollView>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: Colors.backgroundLight,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text,
    },
    content: {
        paddingBottom: 100,
    },
    profileCard: {
        backgroundColor: Colors.backgroundLight,
        marginHorizontal: 20,
        marginTop: 20,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    editAvatarButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: Colors.backgroundLight,
    },
    userName: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    statsCard: {
        flexDirection: 'row',
        backgroundColor: Colors.backgroundLight,
        marginHorizontal: 20,
        marginTop: 16,
        borderRadius: 16,
        padding: 20,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.primary,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    statDivider: {
        width: 1,
        backgroundColor: Colors.border,
    },
    menuSection: {
        marginTop: 24,
        paddingHorizontal: 20,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.backgroundLight,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    menuIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: Colors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    menuContent: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 2,
    },
    menuSubtitle: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    version: {
        textAlign: 'center',
        fontSize: 12,
        color: Colors.textLight,
        marginTop: 24,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#555',
        marginBottom: 8,
        marginTop: 16,
    },
    sectionLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        marginTop: 24,
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    socialInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
    },
    socialIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    socialInput: {
        flex: 1,
        marginTop: 0,
    },
    saveButton: {
        backgroundColor: Colors.primary,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 30,
        marginBottom: 20,
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default ProfileScreen;
