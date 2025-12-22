// src/screens/ProfileScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
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
    Linking,
    Image,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import Toast from 'react-native-toast-message';
import { Colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { 
    getUserProfile, 
    updateUserProfile, 
    getFavorites,
    syncLocalDataToServer,
    UserProfile,
    ProfileUpdateData,
} from '../services/userProfileAPI';
import { isLoggedIn, logout, loginWordPress, getUser } from '../services/wordpressAuth';

const STORAGE_KEYS = {
    NOTIFICATIONS: '@fda_notifications',
    USER_EMAIL: '@fda_user_email',
    USER_PHONE: '@fda_user_phone',
    SOCIAL_X: '@fda_social_x',
    SOCIAL_FB: '@fda_social_fb',
    SOCIAL_TIKTOK: '@fda_social_tiktok',
};

const ProfileScreen = () => {
    const navigation = useNavigation<any>();
    
    // États authentification
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // États du profil
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    
    // États des modals
    const [showEditModal, setShowEditModal] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    
    // États du formulaire d'édition
    const [userEmail, setUserEmail] = useState('');
    const [userPhone, setUserPhone] = useState('243');
    const [socialX, setSocialX] = useState('');
    const [socialFB, setSocialFB] = useState('');
    const [socialTiktok, setSocialTiktok] = useState('');
    
    // États formulaire login
    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    
    // Statistiques
    const [stats, setStats] = useState({
        articlesRead: 0,
        favorites: 0,
        activeDays: 0,
        purchases: 0,
    });

    // Charger les données au montage
    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        setIsLoading(true);
        try {
            // Vérifier l'authentification
            const loggedIn = await isLoggedIn();
            setIsAuthenticated(loggedIn);

            // Charger les préférences locales
            await loadLocalPreferences();

            if (loggedIn) {
                // Charger le profil depuis l'API
                const userProfile = await getUserProfile();
                if (userProfile) {
                    setProfile(userProfile);
                    
                    // Mettre à jour les champs
                    setUserEmail(userProfile.email || '');
                    setUserPhone(userProfile.phone || '243');
                    setSocialX(userProfile.twitter || '');
                    setSocialFB(userProfile.facebook || '');
                    setSocialTiktok(userProfile.tiktok || '');
                    
                    // Mettre à jour les stats
                    setStats({
                        articlesRead: userProfile.read_articles?.length || 0,
                        favorites: userProfile.favorites?.length || 0,
                        activeDays: userProfile.active_days?.length || 0,
                        purchases: userProfile.purchase_history?.length || 0,
                    });
                }
                
                // Synchroniser les données locales
                await syncLocalDataToServer();
            } else {
                // Charger les favoris locaux pour les stats
                const localFavorites = await getFavorites();
                setStats(prev => ({ ...prev, favorites: localFavorites.length }));
            }
        } catch (error) {
            console.error('Erreur chargement données:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadLocalPreferences = async () => {
        try {
            const [notifications, email, phone, x, fb, tiktok] = await Promise.all([
                AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS),
                AsyncStorage.getItem(STORAGE_KEYS.USER_EMAIL),
                AsyncStorage.getItem(STORAGE_KEYS.USER_PHONE),
                AsyncStorage.getItem(STORAGE_KEYS.SOCIAL_X),
                AsyncStorage.getItem(STORAGE_KEYS.SOCIAL_FB),
                AsyncStorage.getItem(STORAGE_KEYS.SOCIAL_TIKTOK),
            ]);
            
            setNotificationsEnabled(notifications !== 'false');
            if (email && !userEmail) setUserEmail(email);
            if (phone && userPhone === '243') setUserPhone(phone);
            if (x && !socialX) setSocialX(x);
            if (fb && !socialFB) setSocialFB(fb);
            if (tiktok && !socialTiktok) setSocialTiktok(tiktok);
        } catch (error) {
            console.error('Erreur chargement préférences:', error);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadAllData();
        setRefreshing(false);
    }, []);

    const handleToggleNotifications = async (value: boolean) => {
        setNotificationsEnabled(value);
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, value.toString());
            Toast.show({
                type: 'info',
                text1: value ? '🔔 Notifications activées' : '🔕 Notifications désactivées',
                position: 'top',
                visibilityTime: 2000,
            });
        } catch (error) {
            console.error('Erreur sauvegarde notifications:', error);
        }
    };

    const handleSaveProfile = async () => {
        try {
            // Sauvegarder localement
            await Promise.all([
                AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, userEmail),
                AsyncStorage.setItem(STORAGE_KEYS.USER_PHONE, userPhone),
                AsyncStorage.setItem(STORAGE_KEYS.SOCIAL_X, socialX),
                AsyncStorage.setItem(STORAGE_KEYS.SOCIAL_FB, socialFB),
                AsyncStorage.setItem(STORAGE_KEYS.SOCIAL_TIKTOK, socialTiktok),
            ]);

            // Si connecté, sauvegarder sur le serveur
            if (isAuthenticated) {
                const updateData: ProfileUpdateData = {
                    user_phone: userPhone,
                    user_facebook: socialFB,
                    user_twitter: socialX,
                    user_tiktok: socialTiktok,
                };
                
                const result = await updateUserProfile(updateData);
                
                if (result.success) {
                    Toast.show({
                        type: 'success',
                        text1: '✅ Profil synchronisé',
                        text2: 'Vos informations ont été mises à jour',
                        position: 'top',
                    });
                }
            } else {
                Toast.show({
                    type: 'success',
                    text1: '✅ Profil sauvegardé',
                    text2: 'Connectez-vous pour synchroniser',
                    position: 'top',
                });
            }
            
            setShowEditModal(false);
        } catch (error) {
            console.error('Erreur sauvegarde profil:', error);
            Alert.alert('Erreur', 'Impossible de sauvegarder vos informations.');
        }
    };

    const handleLogin = async () => {
        if (!loginUsername || !loginPassword) {
            Toast.show({
                type: 'error',
                text1: 'Champs requis',
                text2: 'Veuillez remplir tous les champs',
                position: 'top',
            });
            return;
        }

        setIsLoggingIn(true);
        try {
            await loginWordPress(loginUsername, loginPassword);
            setIsAuthenticated(true);
            setShowLoginModal(false);
            
            Toast.show({
                type: 'success',
                text1: '✅ Connexion réussie',
                text2: 'Bienvenue !',
                position: 'top',
            });
            
            // Recharger les données
            await loadAllData();
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: '❌ Échec de connexion',
                text2: error.message || 'Vérifiez vos identifiants',
                position: 'top',
            });
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Déconnexion',
            'Voulez-vous vraiment vous déconnecter ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Déconnecter',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        setIsAuthenticated(false);
                        setProfile(null);
                        Toast.show({
                            type: 'info',
                            text1: '👋 À bientôt !',
                            position: 'top',
                        });
                    },
                },
            ]
        );
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

    const navigateToFavorites = () => {
        navigation.navigate('Sauvegardés');
    };

    const navigateToPurchases = () => {
        navigation.navigate('Boutique');
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
            icon: 'heart-outline', 
            title: 'Mes favoris', 
            subtitle: `${stats.favorites} article${stats.favorites > 1 ? 's' : ''} sauvegardé${stats.favorites > 1 ? 's' : ''}`,
            action: navigateToFavorites
        },
        { 
            id: '4', 
            icon: 'bag-handle-outline', 
            title: 'Mes achats', 
            subtitle: `${stats.purchases} achat${stats.purchases > 1 ? 's' : ''}`,
            action: navigateToPurchases
        },
        { 
            id: '5', 
            icon: 'information-circle-outline', 
            title: 'À Propos', 
            subtitle: 'En savoir plus sur FDA',
            action: openAboutPage
        },
        { 
            id: '6', 
            icon: 'chatbubble-ellipses-outline', 
            title: 'Réclamations', 
            subtitle: 'Procédure de réclamation',
            action: openReclamationsPage
        },
        { 
            id: '7', 
            icon: 'help-circle-outline', 
            title: 'Aide & Support', 
            subtitle: 'Contactez-nous par email',
            action: openSupportEmail
        },
    ];

    if (isLoading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Chargement...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Profil</Text>
                {isAuthenticated ? (
                    <TouchableOpacity onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={24} color={Colors.primary} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={() => setShowLoginModal(true)}>
                        <Ionicons name="log-in-outline" size={24} color={Colors.primary} />
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
                }
            >
                {/* Carte Profil */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        {profile?.photo ? (
                            <Image source={{ uri: profile.photo }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Ionicons name="person" size={48} color={Colors.primary} />
                            </View>
                        )}
                        <TouchableOpacity style={styles.editAvatarButton}>
                            <Ionicons name="camera" size={16} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.userName}>
                        {profile?.name || userEmail || 'Utilisateur'}
                    </Text>
                    <Text style={styles.userEmail}>
                        {isAuthenticated ? profile?.email || userEmail : 'Non connecté'}
                    </Text>
                    
                    {!isAuthenticated && (
                        <TouchableOpacity 
                            style={styles.loginButton}
                            onPress={() => setShowLoginModal(true)}
                        >
                            <Ionicons name="log-in-outline" size={18} color="#FFF" />
                            <Text style={styles.loginButtonText}>Se connecter</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Carte Statistiques */}
                <View style={styles.statsCard}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{stats.articlesRead}</Text>
                        <Text style={styles.statLabel}>Articles lus</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{stats.favorites}</Text>
                        <Text style={styles.statLabel}>Favoris</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{stats.activeDays}</Text>
                        <Text style={styles.statLabel}>Jours actifs</Text>
                    </View>
                </View>

                {/* Menu */}
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

                            <View style={styles.socialInputRow}>
                                <View style={[styles.socialIcon, { backgroundColor: '#000' }]}>
                                    <Ionicons name="logo-tiktok" size={20} color="#FFF" />
                                </View>
                                <TextInput
                                    style={[styles.input, styles.socialInput]}
                                    placeholder="@votre_tiktok"
                                    value={socialTiktok}
                                    onChangeText={setSocialTiktok}
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

            {/* Modal Connexion */}
            <Modal
                visible={showLoginModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowLoginModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Connexion</Text>
                            <TouchableOpacity onPress={() => setShowLoginModal(false)}>
                                <Ionicons name="close-circle" size={28} color="#888" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.loginDescription}>
                                Connectez-vous pour synchroniser vos favoris, historique de lecture et achats sur tous vos appareils.
                            </Text>

                            <Text style={styles.inputLabel}>Nom d'utilisateur ou email</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="utilisateur@email.com"
                                value={loginUsername}
                                onChangeText={setLoginUsername}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />

                            <Text style={styles.inputLabel}>Mot de passe</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="••••••••"
                                value={loginPassword}
                                onChangeText={setLoginPassword}
                                secureTextEntry
                            />

                            <TouchableOpacity 
                                style={[styles.saveButton, isLoggingIn && styles.buttonDisabled]} 
                                onPress={handleLogin}
                                disabled={isLoggingIn}
                            >
                                {isLoggingIn ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Se connecter</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.registerLink}
                                onPress={() => {
                                    setShowLoginModal(false);
                                    WebBrowser.openBrowserAsync('https://femmedafrique.net/inscription/');
                                }}
                            >
                                <Text style={styles.registerLinkText}>
                                    Pas encore de compte ? S'inscrire
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            <Toast />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        color: Colors.textSecondary,
        fontSize: 14,
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
    },
    avatarPlaceholder: {
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
        marginBottom: 16,
    },
    loginButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
    },
    loginButtonText: {
        color: '#FFF',
        fontWeight: '600',
        marginLeft: 8,
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
    loginDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 20,
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
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: '#333',
    },
    socialInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
    },
    socialIcon: {
        width: 40,
        height: 40,
        borderRadius: 8,
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
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 20,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    registerLink: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    registerLinkText: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: '500',
    },
});

export default ProfileScreen;
