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
    clearCache,
} from '../services/api';
import { Colors } from '../theme/colors';
import { Post } from '../models/Post';
import { ArticleCard } from '../components/ArticleCard';
import { PostSlider } from '../components/PostSlider';
import { SectionHeader } from '../components/SectionHeader';
import { HomeSkeleton } from '../components/PageSkeletons';
import { ErrorMessage } from '../components/ErrorMessage';
import { RootStackParamList } from '../navigation/RootNavigator';
import { analyticsService } from '../services/analytics.simple';
import { AdBanner } from '../components/AdBanner';

const { width: screenWidth } = Dimensions.get('window');
const AD_BANNER_HEIGHT = ((screenWidth - 32) * 406) / 1300; // Ratio 1300x406

// ID de la publicité WordPress pour la zone sous le slider
const HOME_AD_ID = 21755;

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList> & {
    navigate: (screen: string, params?: any) => void;
};

const SLIDER_TAG_ID = 184;
const ESPACE_TENDRESSE_ID = 2483;
const ENTREPRENEURIAT_ID = 115;
const MINES_ID = 146;
const GASTRONOMIE_ID = 20;
const ENFER_DES_FEMMES_ID = 2361;

const HomeScreen = () => {
    const navigation = useNavigation<HomeScreenNavigationProp>();
    const [sliderPosts, setSliderPosts] = useState<Post[]>([]);
    const [espaceTendressePosts, setEspaceTendressePosts] = useState<Post[]>([]);
    const [entrepreneuriatPosts, setEntrepreneuriatPosts] = useState<Post[]>([]);
    const [minesPosts, setMinesPosts] = useState<Post[]>([]);
    const [gastronomiePosts, setGastronomiePosts] = useState<Post[]>([]);
    const [enferDesFemmesPosts, setEnferDesFemmesPosts] = useState<Post[]>([]);
    const [latestPosts, setLatestPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
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
                minesData,
                gastronomieData,
                enferDesFemmesData,
                latestData,
            ] = await Promise.all([
                getPostsByTag(SLIDER_TAG_ID, 1, 4).catch(() => []),
                getPostsByCategory(ESPACE_TENDRESSE_ID, 1, 5).catch(() => []),
                getPostsByCategory(ENTREPRENEURIAT_ID, 1, 4).catch(() => []),
                getPostsByCategory(MINES_ID, 1, 6).catch(() => []),
                getPostsByCategory(GASTRONOMIE_ID, 1, 4).catch(() => []),
                getPostsByCategory(ENFER_DES_FEMMES_ID, 1, 5).catch(() => []),
                getPosts(1, 4).catch(() => []),
            ]);

            setSliderPosts(sliderData);
            setEspaceTendressePosts(espaceTendresseData);
            setEntrepreneuriatPosts(entrepreneuriatData);
            setMinesPosts(minesData.slice(0, 6));
            setGastronomiePosts(gastronomieData);
            setEnferDesFemmesPosts(enferDesFemmesData);
            setLatestPosts(latestData);
        } catch (err) {
            setError('Impossible de charger le contenu');
            console.error('Error loading content:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        clearCache('posts');

        try {
            const [
                sliderData,
                latestData,
                espaceTendresseData,
                entrepreneuriatData,
                minesData,
                gastronomieData,
                enferDesFemmesData,
            ] = await Promise.all([
                getPostsByTag(SLIDER_TAG_ID, 1, 4).catch(() => []),
                getPosts(1, 4).catch(() => []),
                getPostsByCategory(ESPACE_TENDRESSE_ID, 1, 5).catch(() => []),
                getPostsByCategory(ENTREPRENEURIAT_ID, 1, 4).catch(() => []),
                getPostsByCategory(MINES_ID, 1, 6).catch(() => []),
                getPostsByCategory(GASTRONOMIE_ID, 1, 4).catch(() => []),
                getPostsByCategory(ENFER_DES_FEMMES_ID, 1, 5).catch(() => []),
            ]);

            setSliderPosts(sliderData);
            setLatestPosts(latestData);
            setEspaceTendressePosts(espaceTendresseData);
            setEntrepreneuriatPosts(entrepreneuriatData);
            setMinesPosts(minesData.slice(0, 6));
            setGastronomiePosts(gastronomieData);
            setEnferDesFemmesPosts(enferDesFemmesData);
        } catch (error) {
            console.error('Erreur lors du refresh:', error);
        } finally {
            setRefreshing(false);
        }

        loadHomeBannerAd();
    };

    const handleArticlePress = useCallback((article: Post) => {
        navigation.navigate('ArticleDetail', { article });
    }, [navigation]);

    const handleSeeAllArticles = useCallback(() => {
        navigation.navigate('AllArticles');
    }, [navigation]);

    const handleSeeAllCategory = useCallback((categoryId: number, categoryName: string) => {
        navigation.navigate('Main', {
            screen: 'Découvrir',
            params: { categoryId, categoryName },
        } as any);
    }, [navigation]);

    if (loading) {
        return <HomeSkeleton />;
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
                    source={require('../../assets/FDA-gradient.png')}
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
                        autoplay={true}
                        fullWidth={false}
                        autoplayInterval={5000}
                    />
                </View>
            )}

            {/* Bannière publicitaire - Entre le slider et les derniers articles */}
            {getAdBannerImageUrl() && (
                <View style={styles.adBannerSection}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('Main', { screen: 'Boutique' })}
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

            <AdBanner provider="supabase" zone="home" />

            {/* Mines : 2 colonnes x 3 lignes (avant Gastronomie) */}
            {minesPosts.length > 0 && (
                <View style={styles.section}>
                    <SectionHeader
                        title="Mines"
                        onSeeAll={() => handleSeeAllCategory(MINES_ID, 'Mines')}
                    />
                    <View style={styles.minesGrid}>
                        {minesPosts.slice(0, 6).map((post, index) => (
                            <ArticleCard
                                key={`mines_${post.id}_${index}`}
                                article={post}
                                onPress={() => handleArticlePress(post)}
                                variant="grid"
                            />
                        ))}
                    </View>
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

            {/* Enfer des femmes : liste comme Derniers articles mais un chouya plus compact */}
            {enferDesFemmesPosts.length > 0 && (
                <View style={styles.section}>
                    <SectionHeader
                        title="Enfer des femmes"
                        onSeeAll={() => handleSeeAllCategory(ENFER_DES_FEMMES_ID, 'Enfer des femmes')}
                    />
                    {enferDesFemmesPosts.map((post, index) => (
                        <ArticleCard
                            key={`enfer_${post.id}_${index}`}
                            article={post}
                            onPress={() => handleArticlePress(post)}
                            variant="compact"
                        />
                    ))}
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
    minesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    footer: {
        height: 100,
    },
});

export default HomeScreen;
