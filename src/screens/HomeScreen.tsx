import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getPosts, getPostsByTag, getPostsByCategory } from '../services/api';
import { Colors } from '../theme/colors';
import { Post } from '../models/Post';
import { ArticleCard } from '../components/ArticleCard';
import { PostSlider } from '../components/PostSlider';
import { SectionHeader } from '../components/SectionHeader';
import { AdBanner } from '../components/AdBanner';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { RootStackParamList } from '../navigation/RootNavigator';

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
                latestData
            ] = await Promise.all([
                getPostsByTag(SLIDER_TAG_ID, 1, 4).catch(() => []),
                getPostsByCategory(ESPACE_TENDRESSE_ID, 1, 5).catch(() => []),
                getPostsByCategory(ENTREPRENEURIAT_ID, 1, 4).catch(() => []),
                getPostsByCategory(GASTRONOMIE_ID, 1, 4).catch(() => []),
                getPosts(1, 4).catch(() => [])
            ]);

            setSliderPosts(sliderData);
            setEspaceTendressePosts(espaceTendresseData);
            setEntrepreneuriatPosts(entrepreneuriatData);
            setGastronomiePosts(gastronomieData);
            setLatestPosts(latestData);
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

    const handleArticlePress = (article: Post) => {
        navigation.navigate('ArticleDetail', { article });
    };

    const handleSeeAll = (categoryId: number, title: string) => {
        navigation.navigate('Main' as never);
    };

    if (loading) {
        return <LoadingSpinner message="Chargement..." />;
    }

    if (error) {
        return <ErrorMessage message={error} onRetry={loadAllContent} />;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Image
                    source={require('../../assets/fda.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={styles.headerTitle}>Femme d'Afrique</Text>
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
                        <SectionHeader
                            title="À LA UNE"
                            icon="star"
                            color={Colors.primary}
                        />
                        <PostSlider posts={sliderPosts} onPress={handleArticlePress} />
                    </View>
                )}

                {latestPosts.length > 0 && (
                    <View style={styles.section}>
                        <SectionHeader
                            title="Derniers articles"
                            icon="time-outline"
                            color={Colors.primary}
                        />
                        <View style={styles.latestGrid}>
                            {latestPosts.map((post) => (
                                <View key={post.id} style={styles.latestCard}>
                                    <ArticleCard
                                        article={post}
                                        onPress={() => handleArticlePress(post)}
                                        variant="horizontal"
                                    />
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
                                    <ArticleCard
                                        article={post}
                                        onPress={() => handleArticlePress(post)}
                                        variant="horizontal"
                                    />
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
                                <ArticleCard
                                    key={post.id}
                                    article={post}
                                    onPress={() => handleArticlePress(post)}
                                    variant="horizontal"
                                />
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
                                <ArticleCard
                                    key={post.id}
                                    article={post}
                                    onPress={() => handleArticlePress(post)}
                                    variant="horizontal"
                                />
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
        paddingBottom: 16,
        backgroundColor: Colors.backgroundLight,
        borderBottomWidth: 1,
        borderBottomColor: Colors.borderLight,
    },
    logo: {
        width: 40,
        height: 40,
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text,
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
        paddingRight: 20,
    },
    horizontalCard: {
        width: 280,
        marginRight: 16,
    },
    listSection: {
        paddingHorizontal: 20,
    },
    bottomPadding: {
        height: 100,
    },
});

export default HomeScreen;
