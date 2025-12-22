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
    FlatList,
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
    registerUser,
    loginUser,
    logoutUser,
    isUserLoggedIn,
    getUserAnalytics,
    UserAnalytics,
    uploadProfilePhoto,
    ArticleInteraction,
    Purchase,
    getPurchaseHistory,
} from '../services/userProfileAPI';

const STORAGE_KEYS = {
    NOTIFICATIONS: '@fda_notifications',
};

type ModalType = 'none' | 'edit' | 'login' | 'register' | 'analytics' | 'favorites' | 'purchases';

const ProfileScreen = () => {
    const navigation = useNavigation<any>();
    
    // États authentification
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // États du profil
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    
    // États des modals
    const [activeModal, setActiveModal] = useState<ModalType>('none');
    
    // États du formulaire d'édition
    const [userName, setUserName] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [userPhone, setUserPhone] = useState('243');
    const [socialX, setSocialX] = useState('');
    const [socialFB, setSocialFB] = useState('');
    const [socialTiktok, setSocialTiktok] = useState('');
    
    // États formulaire login/register
    const [authName, setAuthName] = useState('');
    const [authEmail, setAuthEmail] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [authConfirmPassword, setAuthConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    // Upload photo
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

    // Charger les données au montage
    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        setIsLoading(true);
        try {
            // Vérifier l'authentification
            const loggedIn = await isUserLoggedIn();
            setIsAuthenticated(loggedIn);

            // Charger les préférences locales
            await loadLocalPreferences();

            if (loggedIn) {
                // Charger le profil depuis l'API
                const userProfile = await getUserProfile();
                if (userProfile) {
                    setProfile(userProfile);
                    
                    // Mettre à jour les champs
                    setUserName(userProfile.name || '');
                    setUserEmail(userProfile.email || '');
                    setUserPhone(userProfile.phone || '243');
                    setSocialX(userProfile.twitter || '');
                    setSocialFB(userProfile.facebook || '');
                    setSocialTiktok(userProfile.tiktok || '');
                }
                
                // Charger les analytics
                const userAnalytics = await getUserAnalytics();
                setAnalytics(userAnalytics);
                
                // Synchroniser les données locales
                await syncLocalDataToServer();
            } else {
                // Charger les analytics locales
                const localAnalytics = await getUserAnalytics();
                setAnalytics(localAnalytics);
            }
        } catch (error) {
            console.error('Erreur chargement données:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadLocalPreferences = async () => {
        try {
            const notifications = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
            setNotificationsEnabled(notifications !== 'false');
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

    const handleUploadPhoto = async () => {
        setIsUploadingPhoto(true);
        try {
            const result = await uploadProfilePhoto();
            if (result.success && result.url) {
                setProfile(prev => prev ? { ...prev, photo: result.url! } : null);
                Toast.show({
                    type: 'success',
                    text1: '✅ Photo mise à jour',
                    position: 'top',
                });
            }
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: '❌ Erreur upload',
                text2: 'Impossible de mettre à jour la photo',
                position: 'top',
            });
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    const handleSaveProfile = async () => {
        setIsSubmitting(true);
        try {
            const updateData: ProfileUpdateData = {
                user_name: userName,
                user_phone: userPhone,
                user_facebook: socialFB,
                user_twitter: socialX,
                user_tiktok: socialTiktok,
            };
            
            const result = await updateUserProfile(updateData);
            
            if (result.success) {
                Toast.show({
                    type: 'success',
                    text1: '✅ Profil mis à jour',
                    position: 'top',
                });
                await loadAllData();
            } else {
                Toast.show({
                    type: 'error',
                    text1: '❌ Erreur',
                    text2: 'Impossible de sauvegarder',
                    position: 'top',
                });
            }
            
            setActiveModal('none');
        } catch (error) {
            console.error('Erreur sauvegarde profil:', error);
            Alert.alert('Erreur', 'Impossible de sauvegarder vos informations.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRegister = async () => {
        if (!authName || !authEmail || !authPassword) {
            Toast.show({
                type: 'error',
                text1: 'Champs requis',
                text2: 'Veuillez remplir tous les champs',
                position: 'top',
            });
            return;
        }

        if (authPassword !== authConfirmPassword) {
            Toast.show({
                type: 'error',
                text1: 'Erreur',
                text2: 'Les mots de passe ne correspondent pas',
                position: 'top',
            });
            return;
        }

        if (authPassword.length < 6) {
            Toast.show({
                type: 'error',
                text1: 'Erreur',
                text2: 'Le mot de passe doit contenir au moins 6 caractères',
                position: 'top',
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await registerUser(authEmail, authPassword, authName);
            
            if (result.success) {
                setIsAuthenticated(true);
                setActiveModal('none');
                resetAuthForm();
                
                Toast.show({
                    type: 'success',
                    text1: '✅ Compte créé !',
                    text2: 'Bienvenue sur FDA Magazine',
                    position: 'top',
                });
                
                await loadAllData();
            } else {
                Toast.show({
                    type: 'error',
                    text1: '❌ Erreur',
                    text2: result.message || 'Impossible de créer le compte',
                    position: 'top',
                });
            }
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: '❌ Erreur',
                text2: error.message || 'Erreur réseau',
                position: 'top',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogin = async () => {
        if (!authEmail || !authPassword) {
            Toast.show({
                type: 'error',
                text1: 'Champs requis',
                text2: 'Veuillez remplir tous les champs',
                position: 'top',
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await loginUser(authEmail, authPassword);
            
            if (result.success) {
                setIsAuthenticated(true);
                setActiveModal('none');
                resetAuthForm();
                
                Toast.show({
                    type: 'success',
                    text1: '✅ Connexion réussie',
                    text2: 'Bienvenue !',
                    position: 'top',
                });
                
                await loadAllData();
            } else {
                Toast.show({
                    type: 'error',
                    text1: '❌ Échec de connexion',
                    text2: result.message || 'Vérifiez vos identifiants',
                    position: 'top',
                });
            }
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: '❌ Erreur',
                text2: error.message || 'Erreur réseau',
                position: 'top',
            });
        } finally {
            setIsSubmitting(false);
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
                        await logoutUser();
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

    const resetAuthForm = () => {
        setAuthName('');
        setAuthEmail('');
        setAuthPassword('');
        setAuthConfirmPassword('');
    };

    const openAboutPage = async () => {
        try {
            await WebBrowser.openBrowserAsync('https://femmedafrique.net/a-propos/');
        } catch (error) {
            console.error('Erreur ouverture page:', error);
        }
    };

    const openReclamationsPage = async () => {
        try {
            await WebBrowser.openBrowserAsync('https://femmedafrique.net/procedure-de-reclamation-des-lecteurs-et-abonnes/');
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
            subtitle: 'Nom, téléphone, réseaux sociaux',
            action: () => setActiveModal('edit')
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
            icon: 'bar-chart-outline', 
            title: 'Mon activité', 
            subtitle: `${analytics?.total_read || 0} lectures, ${analytics?.total_shares || 0} partages`,
            action: () => setActiveModal('analytics')
        },
        { 
            id: '4', 
            icon: 'heart-outline', 
            title: 'Mes favoris', 
            subtitle: `${analytics?.total_favorites || 0} article${(analytics?.total_favorites || 0) > 1 ? 's' : ''}`,
            action: () => setActiveModal('favorites')
        },
        { 
            id: '5', 
            icon: 'bag-handle-outline', 
            title: 'Mes achats', 
            subtitle: `${analytics?.total_purchases || 0} achat${(analytics?.total_purchases || 0) > 1 ? 's' : ''}`,
            action: () => setActiveModal('purchases')
        },
        { 
            id: '6', 
            icon: 'information-circle-outline', 
            title: 'À Propos', 
            subtitle: 'En savoir plus sur FDA',
            action: openAboutPage
        },
        { 
            id: '7', 
            icon: 'chatbubble-ellipses-outline', 
            title: 'Réclamations', 
            subtitle: 'Procédure de réclamation',
            action: openReclamationsPage
        },
        { 
            id: '8', 
            icon: 'help-circle-outline', 
            title: 'Aide & Support', 
            subtitle: 'Contactez-nous par email',
            action: openSupportEmail
        },
    ];

    const renderInteractionItem = ({ item }: { item: ArticleInteraction }) => (
        <View style={styles.interactionItem}>
            <Text style={styles.interactionTitle} numberOfLines={2}>{item.title || `Article #${item.post_id}`}</Text>
            <Text style={styles.interactionDate}>{new Date(item.date).toLocaleDateString('fr-FR')}</Text>
        </View>
    );

    const renderPurchaseItem = ({ item }: { item: Purchase }) => (
        <View style={styles.purchaseItem}>
            <View>
                <Text style={styles.purchaseProduct}>{item.product}</Text>
                <Text style={styles.purchaseDate}>{new Date(item.date).toLocaleDateString('fr-FR')}</Text>
            </View>
            <Text style={styles.purchaseAmount}>{item.amount} CDF</Text>
        </View>
    );

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
                    <TouchableOpacity onPress={() => setActiveModal('login')}>
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
                    <TouchableOpacity 
                        style={styles.avatarContainer} 
                        onPress={isAuthenticated ? handleUploadPhoto : undefined}
                        disabled={isUploadingPhoto}
                    >
                        {isUploadingPhoto ? (
                            <View style={styles.avatarPlaceholder}>
                                <ActivityIndicator color={Colors.primary} />
                            </View>
                        ) : profile?.photo ? (
                            <Image source={{ uri: profile.photo }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Ionicons name="person" size={48} color={Colors.primary} />
                            </View>
                        )}
                        {isAuthenticated && (
                            <View style={styles.editAvatarButton}>
                                <Ionicons name="camera" size={16} color="#FFF" />
                            </View>
                        )}
                    </TouchableOpacity>
                    
                    <Text style={styles.userName}>
                        {profile?.name || userName || 'Utilisateur'}
                    </Text>
                    <Text style={styles.userEmail}>
                        {isAuthenticated ? profile?.email || userEmail : 'Non connecté'}
                    </Text>
                    
                    {!isAuthenticated && (
                        <View style={styles.authButtons}>
                            <TouchableOpacity 
                                style={styles.loginButton}
                                onPress={() => setActiveModal('login')}
                            >
                                <Ionicons name="log-in-outline" size={18} color="#FFF" />
                                <Text style={styles.loginButtonText}>Se connecter</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.registerButton}
                                onPress={() => setActiveModal('register')}
                            >
                                <Ionicons name="person-add-outline" size={18} color={Colors.primary} />
                                <Text style={styles.registerButtonText}>Créer un compte</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Carte Statistiques */}
                <View style={styles.statsCard}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{analytics?.total_read || 0}</Text>
                        <Text style={styles.statLabel}>Lectures</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{analytics?.total_favorites || 0}</Text>
                        <Text style={styles.statLabel}>Favoris</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{analytics?.total_likes || 0}</Text>
                        <Text style={styles.statLabel}>Likes</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{analytics?.total_shares || 0}</Text>
                        <Text style={styles.statLabel}>Partages</Text>
                    </View>
                </View>

                {/* Jours actifs */}
                {isAuthenticated && analytics && analytics.total_active_days > 0 && (
                    <View style={styles.activeDaysCard}>
                        <Ionicons name="flame" size={24} color="#FF6B35" />
                        <Text style={styles.activeDaysText}>
                            {analytics.total_active_days} jour{analytics.total_active_days > 1 ? 's' : ''} actif{analytics.total_active_days > 1 ? 's' : ''}
                        </Text>
                    </View>
                )}

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
                visible={activeModal === 'edit'}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setActiveModal('none')}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Modifier le profil</Text>
                            <TouchableOpacity onPress={() => setActiveModal('none')}>
                                <Ionicons name="close-circle" size={28} color="#888" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.inputLabel}>Nom complet</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Votre nom"
                                value={userName}
                                onChangeText={setUserName}
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

                            <TouchableOpacity 
                                style={[styles.saveButton, isSubmitting && styles.buttonDisabled]} 
                                onPress={handleSaveProfile}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Enregistrer</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Modal Connexion */}
            <Modal
                visible={activeModal === 'login'}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setActiveModal('none')}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Connexion</Text>
                            <TouchableOpacity onPress={() => { setActiveModal('none'); resetAuthForm(); }}>
                                <Ionicons name="close-circle" size={28} color="#888" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.loginDescription}>
                                Connectez-vous pour synchroniser vos favoris, historique de lecture et achats.
                            </Text>

                            <Text style={styles.inputLabel}>Email</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="votre@email.com"
                                value={authEmail}
                                onChangeText={setAuthEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />

                            <Text style={styles.inputLabel}>Mot de passe</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="••••••••"
                                value={authPassword}
                                onChangeText={setAuthPassword}
                                secureTextEntry
                            />

                            <TouchableOpacity 
                                style={[styles.saveButton, isSubmitting && styles.buttonDisabled]} 
                                onPress={handleLogin}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Se connecter</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.switchAuthLink}
                                onPress={() => { resetAuthForm(); setActiveModal('register'); }}
                            >
                                <Text style={styles.switchAuthLinkText}>
                                    Pas encore de compte ? <Text style={styles.linkBold}>Créer un compte</Text>
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Modal Inscription */}
            <Modal
                visible={activeModal === 'register'}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setActiveModal('none')}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Créer un compte</Text>
                            <TouchableOpacity onPress={() => { setActiveModal('none'); resetAuthForm(); }}>
                                <Ionicons name="close-circle" size={28} color="#888" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.loginDescription}>
                                Créez votre compte FDA pour sauvegarder vos favoris et synchroniser vos données.
                            </Text>

                            <Text style={styles.inputLabel}>Nom complet *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Votre nom"
                                value={authName}
                                onChangeText={setAuthName}
                            />

                            <Text style={styles.inputLabel}>Email *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="votre@email.com"
                                value={authEmail}
                                onChangeText={setAuthEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />

                            <Text style={styles.inputLabel}>Mot de passe *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Min. 6 caractères"
                                value={authPassword}
                                onChangeText={setAuthPassword}
                                secureTextEntry
                            />

                            <Text style={styles.inputLabel}>Confirmer le mot de passe *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Répétez le mot de passe"
                                value={authConfirmPassword}
                                onChangeText={setAuthConfirmPassword}
                                secureTextEntry
                            />

                            <TouchableOpacity 
                                style={[styles.saveButton, isSubmitting && styles.buttonDisabled]} 
                                onPress={handleRegister}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Créer mon compte</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.switchAuthLink}
                                onPress={() => { resetAuthForm(); setActiveModal('login'); }}
                            >
                                <Text style={styles.switchAuthLinkText}>
                                    Déjà un compte ? <Text style={styles.linkBold}>Se connecter</Text>
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Modal Analytics */}
            <Modal
                visible={activeModal === 'analytics'}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setActiveModal('none')}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Mon activité</Text>
                            <TouchableOpacity onPress={() => setActiveModal('none')}>
                                <Ionicons name="close-circle" size={28} color="#888" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Stats Grid */}
                            <View style={styles.analyticsGrid}>
                                <View style={styles.analyticsItem}>
                                    <Ionicons name="book-outline" size={28} color={Colors.primary} />
                                    <Text style={styles.analyticsValue}>{analytics?.total_read || 0}</Text>
                                    <Text style={styles.analyticsLabel}>Articles lus</Text>
                                </View>
                                <View style={styles.analyticsItem}>
                                    <Ionicons name="heart-outline" size={28} color="#FF4444" />
                                    <Text style={styles.analyticsValue}>{analytics?.total_favorites || 0}</Text>
                                    <Text style={styles.analyticsLabel}>Favoris</Text>
                                </View>
                                <View style={styles.analyticsItem}>
                                    <Ionicons name="thumbs-up-outline" size={28} color="#4CAF50" />
                                    <Text style={styles.analyticsValue}>{analytics?.total_likes || 0}</Text>
                                    <Text style={styles.analyticsLabel}>Likes</Text>
                                </View>
                                <View style={styles.analyticsItem}>
                                    <Ionicons name="share-social-outline" size={28} color="#2196F3" />
                                    <Text style={styles.analyticsValue}>{analytics?.total_shares || 0}</Text>
                                    <Text style={styles.analyticsLabel}>Partages</Text>
                                </View>
                            </View>

                            {/* Activités récentes */}
                            {analytics?.recent_activity && analytics.recent_activity.length > 0 && (
                                <View style={styles.recentSection}>
                                    <Text style={styles.sectionLabel}>Activité récente</Text>
                                    {analytics.recent_activity.map((item, index) => (
                                        <View key={`activity_${index}`} style={styles.interactionItem}>
                                            <Text style={styles.interactionTitle} numberOfLines={2}>
                                                {item.title || `Article #${item.post_id}`}
                                            </Text>
                                            <Text style={styles.interactionDate}>
                                                {new Date(item.date).toLocaleDateString('fr-FR')}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Modal Favoris */}
            <Modal
                visible={activeModal === 'favorites'}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setActiveModal('none')}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Mes favoris ({profile?.favorites?.length || 0})</Text>
                            <TouchableOpacity onPress={() => setActiveModal('none')}>
                                <Ionicons name="close-circle" size={28} color="#888" />
                            </TouchableOpacity>
                        </View>

                        {profile?.favorites && profile.favorites.length > 0 ? (
                            <FlatList
                                data={profile.favorites}
                                keyExtractor={(item, index) => `fav_${typeof item === 'number' ? item : item.post_id}_${index}`}
                                renderItem={({ item }) => (
                                    <View style={styles.interactionItem}>
                                        <Text style={styles.interactionTitle} numberOfLines={2}>
                                            {typeof item === 'number' ? `Article #${item}` : item.title || `Article #${item.post_id}`}
                                        </Text>
                                        {typeof item !== 'number' && item.date && (
                                            <Text style={styles.interactionDate}>
                                                {new Date(item.date).toLocaleDateString('fr-FR')}
                                            </Text>
                                        )}
                                    </View>
                                )}
                                showsVerticalScrollIndicator={false}
                            />
                        ) : (
                            <View style={styles.emptyState}>
                                <Ionicons name="heart-outline" size={64} color="#DDD" />
                                <Text style={styles.emptyStateText}>Aucun favori pour le moment</Text>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Modal Achats */}
            <Modal
                visible={activeModal === 'purchases'}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setActiveModal('none')}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Mes achats ({profile?.purchase_history?.length || 0})</Text>
                            <TouchableOpacity onPress={() => setActiveModal('none')}>
                                <Ionicons name="close-circle" size={28} color="#888" />
                            </TouchableOpacity>
                        </View>

                        {profile?.purchase_history && profile.purchase_history.length > 0 ? (
                            <FlatList
                                data={profile.purchase_history}
                                keyExtractor={(item, index) => `purchase_${index}`}
                                renderItem={renderPurchaseItem}
                                showsVerticalScrollIndicator={false}
                            />
                        ) : (
                            <View style={styles.emptyState}>
                                <Ionicons name="bag-handle-outline" size={64} color="#DDD" />
                                <Text style={styles.emptyStateText}>Aucun achat pour le moment</Text>
                                <TouchableOpacity 
                                    style={styles.emptyStateButton}
                                    onPress={() => { setActiveModal('none'); navigateToPurchases(); }}
                                >
                                    <Text style={styles.emptyStateButtonText}>Voir la boutique</Text>
                                </TouchableOpacity>
                            </View>
                        )}
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
    authButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    loginButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    loginButtonText: {
        color: '#FFF',
        fontWeight: '600',
        marginLeft: 6,
    },
    registerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    registerButtonText: {
        color: Colors.primary,
        fontWeight: '600',
        marginLeft: 6,
    },
    statsCard: {
        flexDirection: 'row',
        backgroundColor: Colors.backgroundLight,
        marginHorizontal: 20,
        marginTop: 16,
        borderRadius: 16,
        padding: 16,
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
        fontSize: 20,
        fontWeight: '700',
        color: Colors.primary,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 11,
        color: Colors.textSecondary,
    },
    statDivider: {
        width: 1,
        backgroundColor: Colors.border,
    },
    activeDaysCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF5F0',
        marginHorizontal: 20,
        marginTop: 12,
        borderRadius: 12,
        padding: 12,
    },
    activeDaysText: {
        marginLeft: 8,
        fontSize: 15,
        fontWeight: '600',
        color: '#FF6B35',
    },
    menuSection: {
        marginTop: 20,
        paddingHorizontal: 20,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.backgroundLight,
        padding: 14,
        borderRadius: 14,
        marginBottom: 10,
    },
    menuIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: Colors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    menuContent: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 2,
    },
    menuSubtitle: {
        fontSize: 12,
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
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    loginDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#555',
        marginBottom: 6,
        marginTop: 12,
    },
    sectionLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: '#333',
        marginTop: 20,
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F5F5F5',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#333',
    },
    socialInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    socialIcon: {
        width: 36,
        height: 36,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    socialInput: {
        flex: 1,
        marginTop: 0,
    },
    saveButton: {
        backgroundColor: Colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 16,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '600',
    },
    switchAuthLink: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    switchAuthLinkText: {
        color: '#666',
        fontSize: 14,
    },
    linkBold: {
        color: Colors.primary,
        fontWeight: '600',
    },
    // Analytics styles
    analyticsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    analyticsItem: {
        width: '48%',
        backgroundColor: '#F8F8F8',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginBottom: 12,
    },
    analyticsValue: {
        fontSize: 28,
        fontWeight: '700',
        color: '#333',
        marginTop: 8,
    },
    analyticsLabel: {
        fontSize: 12,
        color: '#888',
        marginTop: 4,
    },
    recentSection: {
        marginTop: 8,
    },
    interactionItem: {
        backgroundColor: '#F8F8F8',
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
    },
    interactionTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    interactionDate: {
        fontSize: 12,
        color: '#888',
        marginTop: 4,
    },
    purchaseItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F8F8F8',
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
    },
    purchaseProduct: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    purchaseDate: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    purchaseAmount: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.primary,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyStateText: {
        fontSize: 15,
        color: '#888',
        marginTop: 12,
    },
    emptyStateButton: {
        marginTop: 16,
        backgroundColor: Colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
    },
    emptyStateButtonText: {
        color: '#FFF',
        fontWeight: '600',
    },
});

export default ProfileScreen;
