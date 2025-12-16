// src/screens/HomeScreen.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    Image,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
    getPosts,
    getPostsByTag,
    getPostsByCategory,
    getMedia,
} from '../services/api';
import { Colors } from '../theme/colors';
import { Post } from '../models/Post';
import { ArticleCard } from '../components/ArticleCard';
import { PostSlider } from '../components/PostSlider';
import { SectionHeader } from '../components/SectionHeader';
import { AdBanner } from '../components/AdBanner';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { RootStackParamList } from '../navigation/RootNavigator';
import * as Sharing from 'expo-sharing';
import { saveArticle, isArticleSaved, removeArticle } from '../services/savedArticles';
import { Ionicons } from '@expo/vector-icons';
import ShopScreen from './ShopScreen';
import { analyticsService } from '../services/analytics';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SLIDER_TAG_ID = 184;
const ESPACE_TENDRESSE_ID = 2483;
const ENTREPRENEURIAT_ID = 115;
const GASTRONOMIE_ID = 20;

const HomeScreen = () => {
    const navigation = useNavigation<HomeScreenNavigationProp>();
    const [sliderPosts, setSliderPosts] = useState<Post[]>([]);
    const [espaceTendressePosts, setEspaceTendressePosts] = useState<Post[]>([]);
    const [entrepreneuriatPosts, setEntrepreneuriatPosts] = useState<Post[]>([]);
    const [gastronomiePosts, setGastronomiePosts] = useState<Post[]>([]);
    const [latestPosts, setLatestPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [savedStatus, setSavedStatus] = useState<Record<number, boolean>>({});

    useEffect(() => {
        loadAllContent();
    }, []);


    const loadAllContent = async () => {
        try {
            setError(null);
            setLoading(true);

            const [
                sliderData,
                espaceTendresseData,
                entrepreneuriatData,
                gastronomieData,
                latestData,
            ] = await Promise.all([
                getPostsByTag(SLIDER_TAG_ID, 1, 4).catch(() => []),
                getPostsByCategory(ESPACE_TENDRESSE_ID, 1, 5).catch(() => []),
                getPostsByCategory(ENTREPRENEURIAT_ID, 1, 4).catch(() => []),
                getPostsByCategory(GASTRONOMIE_ID, 1, 4).catch(() => []),
                getPosts(1, 4).catch(() => []),
            ]);

            setSliderPosts(sliderData);
            setEspaceTendressePosts(espaceTendresseData);
            setEntrepreneuriatPosts(entrepreneuriatData);
            setGastronomiePosts(gastronomieData);
            setLatestPosts(latestData);

            // ✅ Charger l’état des favoris ici, une seule fois
            const allPosts = [
                ...sliderData,
                ...espaceTendresseData,
                ...entrepreneuriatData,
                ...gastronomieData,
                ...latestData,
            ].filter(post =>
                post &&
                typeof post.id === 'number' &&
                post.title?.rendered
            );

            // ✅ OPTIMIZATION: Use Promise.all for parallel checks instead of sequential
            const statusChecks = allPosts.map(post => 
                isArticleSaved(post.id).then(saved => ({ id: post.id, saved }))
            );
            const statusResults = await Promise.all(statusChecks);
            
            const status: Record<number, boolean> = {};
            statusResults.forEach(({ id, saved }) => {
                status[id] = saved;
            });
            setSavedStatus(status);
        } catch (err) {
            setError('Impossible de charger le contenu');
            console.error('Error loading content:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };



    const onRefresh = () => {
        setRefreshing(true);
        loadAllContent();
    };

    // ✅ OPTIMIZATION: Memoize callbacks to prevent unnecessary re-renders
    const handleArticlePress = useCallback((article: Post) => {
        navigation.navigate('ArticleDetail', { article });
    }, [navigation]);

    const handleSeeAll = useCallback((categoryId: number, title: string) => {
        // Pour l'instant, on reste sur l'accueil
        // À compléter plus tard avec DiscoverScreen
    }, []);

    const sharePost = useCallback(async (post: Post) => {
        const message = `${post.title.rendered}\n\nLire sur Femme d'Afrique : ${post.link}`;
        await Sharing.shareAsync(message, { dialogTitle: 'Partager' });
    }, []);


    const toggleSave = useCallback(async (post: Post) => {
        const isSaved = savedStatus[post.id];
        if (isSaved) {
            await removeArticle(post.id);
        } else {
            await saveArticle(post);
        }
        setSavedStatus((prev) => ({ ...prev, [post.id]: !isSaved }));
    }, [savedStatus]);

    if (loading) {
        return <LoadingSpinner message="Chargement..." />;
    }

    if (error) {
        return <ErrorMessage message={error} onRetry={loadAllContent} />;
    }



    // ✅ OPTIMIZATION: Memoize render function to prevent unnecessary re-renders
    const renderArticleWithActions = useCallback((post: Post, variant: 'horizontal' | 'vertical' = 'horizontal') => (
        <View style={styles.cardWrapper}>
            <ArticleCard article={post} onPress={() => handleArticlePress(post)} variant={variant} />
            <View style={styles.actionsContainer}>
                {/* Bouton Partager */}
                <TouchableOpacity style={styles.actionButton} onPress={() => sharePost(post)}>
                    <Ionicons name="share-social-outline" size={18} color="#666" />
                </TouchableOpacity>
                {/* Bouton Favori */}
                <TouchableOpacity style={styles.actionButton} onPress={() => toggleSave(post)}>
                    <Ionicons
                        name={savedStatus[post.id] ? 'heart' : 'heart-outline'}
                        size={18}
                        color={savedStatus[post.id] ? Colors.primary : '#666'}
                    />
                </TouchableOpacity>
            </View>
        </View>
    ), [savedStatus, handleArticlePress, sharePost, toggleSave]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Image
                    source={require('../../assets/fda.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />


            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                    />
                }
            >
                {sliderPosts.length > 0 && (
                    <View style={styles.section}>
                        <SectionHeader title="À LA UNE" icon="star" color={Colors.primary} />
                        <PostSlider posts={sliderPosts} onPress={handleArticlePress} />
                    </View>
                )}

                <View style={styles.bannerWrapper}>
                    <TouchableOpacity onPress={() => {
                        navigation.navigate('Boutique');
                    }}>
                        <Image
                            source={require('../../assets/Banniere_FDA.jpg')}
                            style={styles.banner}
                            resizeMode="contain" />
                    </TouchableOpacity>
                </View>

                {latestPosts.length > 0 && (
                    <View style={styles.section}>
                        <SectionHeader title="Derniers articles" icon="time-outline" color={Colors.primary} />
                        <View style={styles.latestGrid}>
                            {latestPosts.map((post) => (
                                <View key={post.id} style={styles.latestCard}>
                                    {renderArticleWithActions(post, 'horizontal')}
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {espaceTendressePosts.length > 0 && (
                    <View style={styles.section}>
                        <SectionHeader
                            title="Espace Tendresse"
                            icon="heart"
                            color="#FF6B9D"
                            onSeeAll={() => handleSeeAll(ESPACE_TENDRESSE_ID, 'Espace Tendresse')}
                        />
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.horizontalScroll}
                        >
                            {espaceTendressePosts.map((post) => (
                                <View key={post.id} style={styles.horizontalCard}>
                                    {renderArticleWithActions(post, 'horizontal')}
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                <AdBanner zone="home" />

                {entrepreneuriatPosts.length > 0 && (
                    <View style={styles.section}>
                        <SectionHeader
                            title="Entrepreneuriat"
                            icon="briefcase"
                            color="#4834DF"
                            onSeeAll={() => handleSeeAll(ENTREPRENEURIAT_ID, 'Entrepreneuriat')}
                        />
                        <View style={styles.listSection}>
                            {entrepreneuriatPosts.map((post) => (
                                <View key={post.id} style={styles.listItem}>
                                    {renderArticleWithActions(post, 'horizontal')}
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {gastronomiePosts.length > 0 && (
                    <View style={styles.section}>
                        <SectionHeader
                            title="Gastronomie"
                            icon="restaurant"
                            color="#26DE81"
                            onSeeAll={() => handleSeeAll(GASTRONOMIE_ID, 'Gastronomie')}
                        />
                        <View style={styles.listSection}>
                            {gastronomiePosts.map((post) => (
                                <View key={post.id} style={styles.listItem}>
                                    {renderArticleWithActions(post, 'horizontal')}
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                <View style={styles.bottomPadding} />
            </ScrollView>
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
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 8,
        backgroundColor: Colors.backgroundLight,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    logo: {
        width: 110,
        height: 50,
        marginRight: 12,
    },
    bannerWrapper: {
        width: Dimensions.get('window').width - 40,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        // marginBottom: 16,
        borderRadius: 8,
        overflow: 'hidden',
        textAlign: 'center',
        alignSelf: 'center',
    },
    banner: {
        width: '100%',
        height: 150,
        // marginVertical: 16,
    },
    section: {
        marginTop: 24,
    },
    latestGrid: {
        paddingHorizontal: 20,
    },
    latestCard: {
        marginBottom: 12,
    },
    horizontalScroll: {
        paddingLeft: 20,
        paddingRight: 32,
    },
    horizontalCard: {
        width: 280,
        marginRight: 16,
    },
    listSection: {
        paddingHorizontal: 20,
    },
    listItem: {
        marginBottom: 12,
    },
    cardWrapper: {
        position: 'relative',
    },
    actionsContainer: {
        position: 'absolute',
        top: 8,
        right: 8,
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 2,
    },
    bottomPadding: {
        height: 100,
    },
});

export default HomeScreen;