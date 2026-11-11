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
    Image,
    Alert,
    Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MediaTypeOptions } from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { notificationService } from '../services/notificationService';
import { profileService } from '../services/profileService';
import { profilePhotoService } from '../services/profilePhotoService';
import { readingHistoryService } from '../services/readingHistoryService';
import { purchaseHistoryService } from '../services/purchaseHistoryService';
import { analyticsService } from '../services/analytics.simple';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

const STORAGE_KEYS = {
    NOTIFICATIONS: '@fda_notifications',
    USER_EMAIL: '@fda_user_email',
    USER_PHONE: '@fda_user_phone',
    SOCIAL_X: '@fda_social_x',
    SOCIAL_FB: '@fda_social_fb',
    STATS: '@fam_cached_profile_stats',
};

// Cache en mémoire pour garantir la continuité des statistiques entre écrans
let memoryProfileStats = {
    articlesRead: 0,
    purchases: 0,
    activeDays: 1,
};

const ProfileScreen = () => {
    const navigation = useNavigation<StackNavigationProp<any, any>>();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [showEditModal, setShowEditModal] = useState(false);
    const [hasActiveSession, setHasActiveSession] = useState(false);

    // États du profil et du compte
    const [userName, setUserName] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [userPhone, setUserPhone] = useState('243');
    const [socialX, setSocialX] = useState('');
    const [socialFB, setSocialFB] = useState('');
    const [subscriptionInfo, setSubscriptionInfo] = useState<string | null>(null);
    const [showImagesPref, setShowImagesPref] = useState<boolean>(true);

    // États pour la photo de profil
    const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // États pour les statistiques initialisés avec le cache mémoire pour éviter tout reset à 0
    const [stats, setStats] = useState(memoryProfileStats);

    // Initialiser les stats depuis AsyncStorage au montage
    useEffect(() => {
        let isMounted = true;
        AsyncStorage.getItem(STORAGE_KEYS.STATS).then((raw) => {
            if (raw && isMounted) {
                try {
                    const parsed = JSON.parse(raw);
                    if (parsed && typeof parsed.articlesRead === 'number') {
                        memoryProfileStats = parsed;
                        setStats(parsed);
                    }
                } catch {}
            }
        });
        return () => {
            isMounted = false;
        };
    }, []);

    const loadStats = async () => {
        try {
            const dynamicStats = await getDynamicStats();
            setStats(dynamicStats);
        } catch (error) {
            console.error('Erreur chargement statistiques:', error);
        }
    };

    // Fonction pour récupérer les vraies statistiques dynamiquement
    const getDynamicStats = async () => {
        try {
            const [readCount, purchasesCount, activeDaysCount] = await Promise.all([
                readingHistoryService.getArticlesReadCount(),
                purchaseHistoryService.getPurchasesCount(),
                readingHistoryService.getActiveDaysCount(),
            ]);

            // Protection anti-chute : si les requêtes renvoient 0 suite à une temporisation réseau
            // mais qu'on a déjà des valeurs valides mémorisées, on préserve l'acquis
            const resolvedArticles = Math.max(readCount, memoryProfileStats.articlesRead);
            const resolvedPurchases = Math.max(purchasesCount, memoryProfileStats.purchases);
            const resolvedDays = Math.max(1, activeDaysCount, memoryProfileStats.activeDays);

            const statsData = {
                articlesRead: resolvedArticles,
                purchases: resolvedPurchases,
                activeDays: resolvedDays,
            };

            memoryProfileStats = statsData;
            await AsyncStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(statsData));
            return statsData;
        } catch (error) {
            console.error('Erreur getDynamicStats (maintien des stats en cache):', error);
            return memoryProfileStats;
        }
    };

    // Fonction pour rafraîchir les statistiques
    const refreshStats = async () => {
        try {
            const freshStats = await getDynamicStats();
            setStats(freshStats);
        } catch (error) {
            console.error('Erreur rafraîchissement stats:', error);
        }
    };

    const refreshAll = useCallback(async () => {
        await Promise.all([
            loadUserPreferences(),
            checkActiveSession(),
            loadStats(),
        ]);
    }, []);

    // Recharger à chaque fois que l'écran Profil devient actif
    useFocusEffect(
        useCallback(() => {
            refreshAll();
        }, [refreshAll])
    );

    const loadUserPreferences = async () => {
        try {
            const currentProfile = await profileService.getCurrentProfile();

            if (currentProfile) {
                console.log('[ProfileScreen] Chargement donnees utilisateur:', currentProfile.username);
                if (currentProfile.username) setUserName(currentProfile.username);
                if (currentProfile.email) setUserEmail(currentProfile.email);
                if (currentProfile.profile_data?.phone) setUserPhone(currentProfile.profile_data.phone);
                if (currentProfile.profile_data?.social_x) setSocialX(currentProfile.profile_data.social_x);
                if (currentProfile.profile_data?.social_fb) setSocialFB(currentProfile.profile_data.social_fb);

                if (currentProfile.subscription?.status === 'active') {
                    const planLabel = currentProfile.subscription.plan === 'yearly' ? 'Annuel' : 'Mensuel';
                    setSubscriptionInfo(`Abonné FAM (${planLabel})`);
                } else {
                    setSubscriptionInfo(null);
                }

                if (currentProfile.profile_data?.notifications !== undefined) {
                    setNotificationsEnabled(currentProfile.profile_data.notifications);
                    await notificationService.saveNotificationState(currentProfile.profile_data.notifications);
                }

                if (currentProfile.profile_data?.profile_photo?.url) {
                    setProfilePhoto(currentProfile.profile_data.profile_photo.url);
                }
            } else {
                console.log('ℹ️ Aucun compte connecté, utilisation du fallback local');
                const [notifications, email, phone, x, fb] = await Promise.all([
                    AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS),
                    AsyncStorage.getItem(STORAGE_KEYS.USER_EMAIL),
                    AsyncStorage.getItem(STORAGE_KEYS.USER_PHONE),
                    AsyncStorage.getItem(STORAGE_KEYS.SOCIAL_X),
                    AsyncStorage.getItem(STORAGE_KEYS.SOCIAL_FB),
                ]);

                const notificationState = await notificationService.getNotificationState();
                setNotificationsEnabled(notificationState);

                if (email) setUserEmail(email);
                if (phone) setUserPhone(phone);
                if (x) setSocialX(x);
                if (fb) setSocialFB(fb);
                setSubscriptionInfo(null);
            }

            const savedImgPref = await AsyncStorage.getItem('@fam_pref_show_images');
            if (savedImgPref !== null) {
                try {
                    setShowImagesPref(JSON.parse(savedImgPref));
                } catch {}
            }
        } catch (error) {
            console.error('❌ Erreur chargement préférences:', error);
        }
    };

    const checkActiveSession = async () => {
        try {
            const currentProfile = await profileService.getCurrentProfile();
            const hasProfile = currentProfile !== null && !!(currentProfile.id || currentProfile.email);
            setHasActiveSession(hasProfile);

            if (hasProfile && currentProfile) {
                setUserName(currentProfile.username || currentProfile.email?.split('@')[0] || '');
                if (currentProfile.subscription?.status === 'active') {
                    const planLabel = currentProfile.subscription.plan === 'yearly' ? 'Annuel' : 'Mensuel';
                    setSubscriptionInfo(`Abonné FAM (${planLabel})`);
                } else {
                    setSubscriptionInfo(null);
                }
            } else {
                setSubscriptionInfo(null);
            }
        } catch (error) {
            console.error('❌ Erreur vérification session:', error);
            setHasActiveSession(false);
            setSubscriptionInfo(null);
        }
    };

    const handleToggleNotifications = async (value: boolean) => {
        setNotificationsEnabled(value);
        try {
            // Utiliser le service OneSignal
            await notificationService.saveNotificationState(value);
            console.log(`📱 Notifications ${value ? 'activées' : 'désactivées'}`);
        } catch (error) {
            console.error('Erreur sauvegarde notifications:', error);
        }
    };

    const handleToggleShowImages = async (value: boolean) => {
        setShowImagesPref(value);
        try {
            await AsyncStorage.setItem('@fam_pref_show_images', JSON.stringify(value));
        } catch (error) {
            console.error('Erreur sauvegarde preference images:', error);
        }
    };

    const handleSaveProfile = async () => {
        try {
            setIsSavingProfile(true);
            await profileService.updatePreferences({
                username: userName,
                email: userEmail,
                phone: userPhone,
                social_x: socialX,
                social_fb: socialFB,
                notifications: notificationsEnabled,
                profile_photo: profilePhoto ? {
                    url: profilePhoto,
                    uuid: Date.now().toString(),
                    filename: `profile_${Date.now()}.jpg`
                } : undefined,
                stats: {
                    articles_read: stats.articlesRead,
                    purchases: stats.purchases,
                    active_days: stats.activeDays
                } as any
            });

            await Promise.all([
                AsyncStorage.setItem(STORAGE_KEYS.USER_EMAIL, userEmail),
                AsyncStorage.setItem(STORAGE_KEYS.USER_PHONE, userPhone),
                AsyncStorage.setItem(STORAGE_KEYS.SOCIAL_X, socialX),
                AsyncStorage.setItem(STORAGE_KEYS.SOCIAL_FB, socialFB),
            ]);

            setShowEditModal(false);
            Alert.alert('Succès', 'Votre profil a été mis à jour et synchronisé.');
        } catch (error: any) {
            console.error('Erreur sauvegarde profil:', error);
            Alert.alert('Erreur', error?.message || 'Impossible de sauvegarder vos informations.');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleUploadPhoto = async () => {
        if (!hasActiveSession) {
            Alert.alert('Session requise', 'Veuillez vous connecter pour modifier votre photo de profil.');
            return;
        }

        // Afficher le menu d'options
        Alert.alert(
            'Photo de profil',
            'Choisissez une option pour votre photo de profil:',
            [
                {
                    text: 'Prendre une photo',
                    onPress: () => handleTakePhoto(),
                },
                {
                    text: 'Choisir dans la galerie',
                    onPress: () => handleChooseFromGallery(),
                },
                {
                    text: 'Annuler',
                    style: 'cancel',
                },
            ],
            { cancelable: false }
        );
    };

    const handleTakePhoto = async () => {
        try {
            setIsUploadingPhoto(true);

            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (permissionResult.status !== 'granted') {
                Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à votre caméra.');
                return;
            }

            const pickerResult = await ImagePicker.launchCameraAsync({
                mediaTypes: MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets[0]) {
                const asset = pickerResult.assets[0];

                try {
                    const uploadResult = await profilePhotoService.uploadProfilePhoto(asset.uri);

                    if (uploadResult.success && uploadResult.url) {
                        setProfilePhoto(uploadResult.url);
                        Alert.alert('Succès', 'Votre photo de profil a été mise à jour.');
                    } else {
                        throw new Error(uploadResult.error || 'Erreur lors de l\'upload');
                    }
                } catch (serviceError) {
                    setProfilePhoto(asset.uri);
                    Alert.alert('Succès', 'Votre photo de profil a été mise à jour (mode temporaire).');
                }
            }
        } catch (error) {
            console.error('Erreur prise photo:', error);
            Alert.alert('Erreur', 'Impossible de prendre votre photo.');
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    const handleChooseFromGallery = async () => {
        try {
            setIsUploadingPhoto(true);

            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permissionResult.status !== 'granted') {
                Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à votre galerie.');
                return;
            }

            const pickerResult = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets[0]) {
                const asset = pickerResult.assets[0];

                try {
                    const uploadResult = await profilePhotoService.uploadProfilePhoto(asset.uri);

                    if (uploadResult.success && uploadResult.url) {
                        setProfilePhoto(uploadResult.url);
                        Alert.alert('Succès', 'Votre photo de profil a été mise à jour.');
                    } else {
                        throw new Error(uploadResult.error || 'Erreur lors de l\'upload');
                    }
                } catch (serviceError) {
                    setProfilePhoto(asset.uri);
                    Alert.alert('Succès', 'Votre photo de profil a été mise à jour (mode temporaire).');
                }
            }
        } catch (error) {
            console.error('Erreur sélection galerie:', error);
            Alert.alert('Erreur', 'Impossible de sélectionner votre photo.');
        } finally {
            setIsUploadingPhoto(false);
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
        Linking.openURL('mailto:support@defmaks.com?subject=Support FAM App');
    };

    const openAccountDeletionPolicy = async () => {
        try {
            await WebBrowser.openBrowserAsync('https://femmedafrique.net/suppression-compte', {
                showTitle: true,
                enableBarCollapsing: true,
            });
        } catch (error) {
            console.error('Erreur ouverture page suppression:', error);
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Supprimer mon compte ?',
            'Cette action est irréversible. L\'ensemble de vos données, votre abonnement et vos favoris seront définitivement effacés.',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer définitivement',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await profileService.deleteCurrentAccount();
                            setHasActiveSession(false);
                            setUserName('');
                            setUserEmail('');
                            setUserPhone('243');
                            setSubscriptionInfo(null);
                            setProfilePhoto(null);
                            Alert.alert('Compte supprimé', 'Votre compte et vos données ont été définitivement effacés.');
                        } catch (e: any) {
                            Alert.alert('Erreur', e?.message || 'Impossible de supprimer le compte');
                        }
                    }
                }
            ]
        );
    };

    const handleLogout = () => {
        Alert.alert(
            'Déconnexion',
            'Voulez-vous vous déconnecter de votre compte Femme d\'Afrique ?',
            [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Se déconnecter',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await profileService.logout();
                            setHasActiveSession(false);
                            setUserName('');
                            setUserEmail('');
                            setUserPhone('243');
                            setSubscriptionInfo(null);
                            setProfilePhoto(null);
                            Alert.alert('Déconnexion', 'Vous avez été déconnecté avec succès.');
                        } catch (e: any) {
                            Alert.alert('Erreur', e?.message || 'Erreur lors de la déconnexion');
                        }
                    }
                }
            ]
        );
    };

    const menuItems = [
        {
            id: '1',
            icon: 'person-outline',
            title: hasActiveSession ? 'Modifier le profil' : 'Ouvrir session / Créer compte',
            subtitle: hasActiveSession ? 'Email, téléphone, réseaux sociaux' : 'Accéder à votre compte',
            action: hasActiveSession ? () => setShowEditModal(true) : () => {
                navigation.navigate('AuthScreen');
            }
        },
        {
            id: '2',
            icon: 'notifications-outline',
            title: 'Notifications',
            subtitle: notificationsEnabled ? 'Activées' : 'Désactivées',
            isToggle: true,
            toggleValue: notificationsEnabled,
            onToggle: handleToggleNotifications,
        },
        {
            id: 'images_pref',
            icon: 'images-outline',
            title: 'Affichage des images',
            subtitle: showImagesPref ? 'Visuels complets (qualité standard)' : 'Mode texte épuré (économie de données)',
            isToggle: true,
            toggleValue: showImagesPref,
            onToggle: handleToggleShowImages,
        },
        {
            id: '3',
            icon: 'bookmark-outline',
            title: 'Mes favoris',
            subtitle: 'Articles sauvegardés',
            action: () => {
                // Tracker l'événement analytics
                analyticsService.trackEvent('screen_viewed', 'navigation', 'Favoris', 1);

                // Naviguer vers l'écran des favoris
                navigation.navigate('Favoris');
            }
        },
        {
            id: 'articles_lus',
            icon: 'time-outline',
            title: 'Articles lus',
            subtitle: 'Historique des articles consultés',
            action: () => {
                analyticsService.trackEvent('screen_viewed', 'navigation', 'ArticlesLus', 1);
                navigation.navigate('ArticlesLus');
            }
        },
        {
            id: 'mes_achats',
            icon: 'cart-outline',
            title: 'Mes achats',
            subtitle: 'Magazines achetés et abonnements',
            action: () => {
                analyticsService.trackEvent('screen_viewed', 'navigation', 'Achats', 1);
                navigation.navigate('Achats');
            }
        },
        {
            id: 'mon_abonnement',
            icon: 'card-outline',
            title: subscriptionInfo ? 'Mon abonnement' : "S'abonner au magazine",
            subtitle: subscriptionInfo ? subscriptionInfo : 'Accès illimité aux éditions numériques',
            action: () => {
                analyticsService.trackEvent('screen_viewed', 'navigation', 'Abonnement', 1);
                navigation.navigate('Abonnement');
            }
        },
        {
            id: 'contact_news',
            icon: 'call-outline',
            title: 'Coordonnées & Rédaction',
            subtitle: 'Téléphone, courriel et adresse de l\'éditeur',
            action: () => navigation.navigate('Contact')
        },
        {
            id: '4',
            icon: 'information-circle-outline',
            title: 'À Propos',
            subtitle: 'En savoir plus sur FAM',
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
        {
            id: 'privacy_deletion',
            icon: 'shield-checkmark-outline',
            title: 'Suppression des données',
            subtitle: 'Politique et droit à l\'oubli (RGPD)',
            action: openAccountDeletionPolicy
        },
        ...(hasActiveSession ? [
            {
                id: 'logout',
                icon: 'log-out-outline',
                title: 'Se déconnecter',
                subtitle: 'Fermer la session actuelle',
                action: handleLogout
            },
            {
                id: 'delete_account',
                icon: 'trash-outline',
                title: 'Supprimer mon compte',
                subtitle: 'Effacer définitivement vos données',
                action: handleDeleteAccount
            }
        ] : []),
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Profil</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        {profilePhoto ? (
                            <Image source={{ uri: profilePhoto }} style={styles.avatarImage} />
                        ) : (
                            <View style={styles.avatar}>
                                <Ionicons name="person" size={48} color={Colors.primary} />
                            </View>
                        )}
                        {hasActiveSession && (
                            <TouchableOpacity
                                style={styles.editAvatarButton}
                                onPress={handleUploadPhoto}
                                disabled={isUploadingPhoto}
                            >
                                {isUploadingPhoto ? (
                                    <Ionicons name="refresh" size={16} color="#FFF" />
                                ) : (
                                    <Ionicons name="camera" size={16} color="#FFF" />
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                    <Text style={styles.userName}>
                        {userName || userEmail || 'Lecteur FAM'}
                    </Text>
                    {subscriptionInfo && (
                        <View style={styles.subscriptionPill}>
                            <Ionicons name="star" size={12} color="#D97706" style={{ marginRight: 4 }} />
                            <Text style={styles.subscriptionPillText}>{subscriptionInfo}</Text>
                        </View>
                    )}
                    <Text style={styles.userEmail}>
                        {userEmail ? userEmail : 'Compte non connecté (mode invité)'}
                    </Text>
                </View>

                <View style={styles.statsSection}>
                    <View style={styles.statsHeader}>
                        <Text style={styles.statsTitle}>Statistiques</Text>
                        <TouchableOpacity
                            style={styles.refreshButton}
                            onPress={refreshStats}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="refresh" size={16} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>

                    <View id='statCards' style={styles.statsCard}>
                        <TouchableOpacity
                            style={styles.statItem}
                            onPress={() => navigation.navigate('ArticlesLus')}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.statValue}>{stats.articlesRead}</Text>
                            <Text style={styles.statLabel}>Articles lus</Text>
                            <Ionicons name="book-outline" size={12} color={Colors.textSecondary} style={styles.statIcon} />
                        </TouchableOpacity>
                        <View style={styles.statDivider} />
                        <TouchableOpacity
                            style={styles.statItem}
                            onPress={() => navigation.navigate('Achats')}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.statValue}>{stats.purchases}</Text>
                            <Text style={styles.statLabel}>Achats</Text>
                            <Ionicons name="cart-outline" size={12} color={Colors.textSecondary} style={styles.statIcon} />
                        </TouchableOpacity>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{stats.activeDays}</Text>
                            <Text style={styles.statLabel}>Jours actifs</Text>
                            <Ionicons name="calendar-outline" size={12} color={Colors.textSecondary} style={styles.statIcon} />
                        </View>
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
                                    value={item.toggleValue !== undefined ? item.toggleValue : notificationsEnabled}
                                    onValueChange={item.onToggle || handleToggleNotifications}
                                    trackColor={{ false: '#D1D1D6', true: Colors.primary + '80' }}
                                    thumbColor={(item.toggleValue !== undefined ? item.toggleValue : notificationsEnabled) ? Colors.primary : '#F4F3F4'}
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
                    <View id='myInfos' style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Modifier le profil</Text>
                            <TouchableOpacity onPress={() => setShowEditModal(false)}>
                                <Ionicons name="close-circle" size={28} color="#888" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.inputLabel}>Nom complet / Pseudonyme</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ex: Amina Diallo"
                                value={userName}
                                onChangeText={setUserName}
                                autoCapitalize="words"
                            />

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

                            <TouchableOpacity
                                style={[styles.saveButton, isSavingProfile && { opacity: 0.6 }]}
                                onPress={handleSaveProfile}
                                disabled={isSavingProfile}
                            >
                                <Text style={styles.saveButtonText}>
                                    {isSavingProfile ? 'Enregistrement...' : 'Enregistrer'}
                                </Text>
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
        paddingBottom: 140,
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
    avatarImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.borderLight,
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
    subscriptionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 12,
        marginBottom: 6,
    },
    subscriptionPillText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#92400E',
    },
    userEmail: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    statsCard: {
        flexDirection: 'row',
        backgroundColor: Colors.backgroundLight,
        marginHorizontal: 0,
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
    // Styles pour les statistiques dynamiques
    statsSection: {
        marginTop: 24,
        paddingHorizontal: 20,
    },
    statsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    statsTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    refreshButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: Colors.backgroundLight,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    statIcon: {
        marginTop: 4,
    },
});

export default ProfileScreen;
