// src/screens/HomeScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    RefreshControl,
    Image,
    TouchableOpacity,
    Dimensions,
    Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
    getPosts,
    getPostsByTag,
    getPostsByCategory,
    getAdById,
} from '../services/api';
import { Colors } from '../theme/colors';
import { Post } from '../models/Post';
import { ArticleCard } from '../components/ArticleCard';
import { PostSlider } from '../components/PostSlider';
import { SectionHeader } from '../components/SectionHeader';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { RootStackParamList } from '../navigation/RootNavigator';
import { isArticleSaved } from '../services/savedArticles';
import { analyticsService } from '../services/analytics';

const { width: screenWidth } = Dimensions.get('window');
const AD_BANNER_HEIGHT = ((screenWidth - 32) * 406) / 1300; // Ratio 1300x406

// ID de la publicité WordPress pour la zone sous le slider
const HOME_AD_ID = 21755;

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList> & {
    navigate: (screen: string) => void;
};

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
    const [homeBannerAd, setHomeBannerAd] = useState<any>(null);

    useEffect(() => {
        loadAllContent();
        loadHomeBannerAd();
        analyticsService.trackScreenView('Home');
    }, []);

    // Charger la publicité WordPress pour la zone sous le slider
    const loadHomeBannerAd = async () => {
        try {
            const ad = await getAdById(HOME_AD_ID);
            if (ad) {
                setHomeBannerAd(ad);
            }
        } catch (error) {
            console.log('Erreur chargement bannière pub:', error);
        }
    };

    // Récupérer l'URL de l'image de la bannière pub
    const getAdBannerImageUrl = (): string | null => {
        if (!homeBannerAd) return null;
        // Essayer différentes sources d'image
        return homeBannerAd.better_featured_image?.source_url 
            || homeBannerAd.dmks_featured_image?.src
            || homeBannerAd.dmks_featured_image?.sizes?.large?.url
            || null;
    };

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
        loadHomeBannerAd();
    };

    const handleArticlePress = useCallback((article: Post) => {
        navigation.navigate('ArticleDetail', { article });
    }, [navigation]);

    const handleSeeAllArticles = useCallback(() => {
        navigation.navigate('AllArticles');
    }, [navigation]);

    const handleSeeAllCategory = useCallback((categoryId: number, categoryName: string) => {
        // Naviguer vers l'onglet Découvrir avec la catégorie pré-sélectionnée
        navigation.navigate('Main', {
            screen: 'Découvrir',
            params: { categoryId, categoryName },
        } as any);
    }, [navigation]);

    // Les boutons sont maintenant intégrés dans ArticleCard

    if (loading) {
        return <LoadingSpinner message="Chargement..." />;
    }

    if (error) {
        return <ErrorMessage message={error} onRetry={loadAllContent} />;
    }

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
            }
        >
            <View style={styles.header}>
                <Image
                    source={require('../../assets/logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </View>

            {/* Slider principal */}
            {sliderPosts.length > 0 && (
                <View style={styles.section}>
                    <PostSlider 
                        posts={sliderPosts} 
                        onPress={handleArticlePress}
                    />
                </View>
            )}

            {/* Bannière publicitaire - Entre le slider et les derniers articles */}
            {getAdBannerImageUrl() && (
                <View style={styles.adBannerSection}>
                    <TouchableOpacity 
                        onPress={() => navigation.navigate('Boutique')}
                        activeOpacity={0.9}
                    >
                        <Image
                            source={{ uri: getAdBannerImageUrl()! }}
                            style={styles.adBannerImage}
                            resizeMode="cover"
                        />
                    </TouchableOpacity>
                </View>
            )}

            {/* Derniers articles */}
            {latestPosts.length > 0 && (
                <View style={styles.section}>
                    <SectionHeader title="Derniers articles" onSeeAll={handleSeeAllArticles} />
                    {latestPosts.map((post, index) => (
                        <ArticleCard 
                            key={`latest_${post.id}_${index}`}
                            article={post} 
                            onPress={() => handleArticlePress(post)} 
                            variant="horizontal" 
                        />
                    ))}
                </View>
            )}

            {/* Espace Tendresse */}
            {espaceTendressePosts.length > 0 && (
                <View style={styles.section}>
                    <SectionHeader
                        title="Espace Tendresse"
                        onSeeAll={() => handleSeeAllCategory(ESPACE_TENDRESSE_ID, 'Espace Tendresse')}
                    />
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.horizontalList}
                    >
                        {espaceTendressePosts.map((post, index) => (
                            <View key={`espace_${post.id}_${index}`} style={styles.horizontalCard}>
                                <ArticleCard 
                                    article={post} 
                                    onPress={() => handleArticlePress(post)} 
                                    variant="vertical" 
                                />
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Entrepreneuriat */}
            {entrepreneuriatPosts.length > 0 && (
                <View style={styles.section}>
                    <SectionHeader
                        title="Entrepreneuriat"
                        onSeeAll={() => handleSeeAllCategory(ENTREPRENEURIAT_ID, 'Entrepreneuriat')}
                    />
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.horizontalList}
                    >
                        {entrepreneuriatPosts.map((post, index) => (
                            <View key={`entrepreneur_${post.id}_${index}`} style={styles.horizontalCard}>
                                <ArticleCard 
                                    article={post} 
                                    onPress={() => handleArticlePress(post)} 
                                    variant="vertical" 
                                />
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Gastronomie */}
            {gastronomiePosts.length > 0 && (
                <View style={styles.section}>
                    <SectionHeader
                        title="Gastronomie"
                        onSeeAll={() => handleSeeAllCategory(GASTRONOMIE_ID, 'Gastronomie')}
                    />
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.horizontalList}
                    >
                        {gastronomiePosts.map((post, index) => (
                            <View key={`gastro_${post.id}_${index}`} style={styles.horizontalCard}>
                                <ArticleCard 
                                    article={post} 
                                    onPress={() => handleArticlePress(post)} 
                                    variant="vertical" 
                                />
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            <View style={styles.footer} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        paddingTop: Platform.OS === 'ios' ? 60 : 50,
        paddingBottom: 16,
        alignItems: 'center',
        backgroundColor: Colors.backgroundLight,
    },
    logo: {
        width: 180,
        height: 50,
    },
    section: {
        marginBottom: 24,
    },
    adBannerSection: {
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    adBannerImage: {
        width: '100%',
        height: AD_BANNER_HEIGHT,
        borderRadius: 12,
        backgroundColor: '#f0f0f0',
    },
    horizontalList: {
        paddingHorizontal: 16,
    },
    horizontalCard: {
        width: 200,
        marginRight: 16,
    },
    footer: {
        height: 100,
    },
});

export default HomeScreen;
