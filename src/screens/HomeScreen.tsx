import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, ScrollView, Dimensions, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getPosts, getPostsByTag } from '../services/api';
import { Colors } from '../theme/colors';
import { Post } from '../models/Post';
import { Ionicons } from '@expo/vector-icons';
import { ArticleCard } from '../components/ArticleCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { RootStackParamList } from '../navigation/RootNavigator';

const { width } = Dimensions.get('window');

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HomeScreen = () => {
    const navigation = useNavigation<HomeScreenNavigationProp>();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [featuredPost, setFeaturedPost] = useState<Post | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        fetchPosts(1);
    }, []);

    const fetchPosts = async (pageNum: number, append = false) => {
        try {
            setError(null);
            if (!append) setLoading(true);

            const FEATURED_TAG_ID = 184;
            const POSTS_PER_PAGE = 5;

            if (pageNum === 1) {
                const [featuredData, regularData] = await Promise.all([
                    getPostsByTag(FEATURED_TAG_ID, 1, 1),
                    getPosts(1, POSTS_PER_PAGE)
                ]);

                if (featuredData.length > 0) {
                    setFeaturedPost(featuredData[0]);
                } else if (regularData.length > 0) {
                    setFeaturedPost(regularData[0]);
                    setPosts(regularData.slice(1));
                    if (regularData.length < POSTS_PER_PAGE) {
                        setHasMore(false);
                    }
                    return;
                }

                setPosts(regularData);
                if (regularData.length < POSTS_PER_PAGE) {
                    setHasMore(false);
                }
            } else {
                const data = await getPosts(pageNum, POSTS_PER_PAGE);
                if (data.length < POSTS_PER_PAGE) {
                    setHasMore(false);
                }
                if (append) {
                    setPosts(prev => [...prev, ...data]);
                }
            }
        } catch (err) {
            setError('Impossible de charger les articles');
            console.error('Erreur:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLoadingMore(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        setPage(1);
        setHasMore(true);
        fetchPosts(1);
    };

    const loadMore = () => {
        if (!loadingMore && hasMore) {
            setLoadingMore(true);
            const nextPage = page + 1;
            setPage(nextPage);
            fetchPosts(nextPage, true);
        }
    };

    const handleArticlePress = (article: Post) => {
        navigation.navigate('ArticleDetail', { article });
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        if (diffHours < 1) return 'À l\'instant';
        if (diffHours < 24) return `Il y a ${diffHours}h`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `Il y a ${diffDays}j`;
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    };

    const renderFeaturedPost = () => {
        if (!featuredPost) return null;

        return (
            <TouchableOpacity
                style={styles.featuredCard}
                activeOpacity={0.9}
                onPress={() => handleArticlePress(featuredPost)}
            >
                {featuredPost._embedded?.['wp:featuredmedia']?.[0]?.source_url && (
                    <Image
                        source={{ uri: featuredPost._embedded['wp:featuredmedia'][0].source_url }}
                        style={styles.featuredImage}
                    />
                )}
                <View style={styles.featuredOverlay}>
                    <View style={styles.featuredBadge}>
                        <Ionicons name="flash" size={14} color="#FFF" />
                        <Text style={styles.featuredBadgeText}>À LA UNE</Text>
                    </View>
                    <Text style={styles.featuredTitle} numberOfLines={3}>
                        {featuredPost.title.rendered}
                    </Text>
                    <View style={styles.featuredMeta}>
                        <View style={styles.metaItem}>
                            <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.9)" />
                            <Text style={styles.featuredMetaText}>{formatDate(featuredPost.date)}</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderFooter = () => {
        if (!loadingMore) return null;
        return (
            <View style={styles.footerLoader}>
                <Text style={styles.footerText}>Chargement...</Text>
            </View>
        );
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return <ErrorMessage message={error} onRetry={() => fetchPosts(1)} />;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerGreeting}>Bonjour,</Text>
                    <Text style={styles.headerTitle}>Découvrez l'Actualité</Text>
                </View>
                <TouchableOpacity style={styles.notificationButton}>
                    <Ionicons name="notifications-outline" size={24} color={Colors.text} />
                    <View style={styles.notificationBadge} />
                </TouchableOpacity>
            </View>

            <FlatList
                ListHeaderComponent={
                    <View>
                        <View style={styles.categoryTabs}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <TouchableOpacity style={[styles.categoryTab, styles.categoryTabActive]}>
                                    <Text style={styles.categoryTabTextActive}>Toutes</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.categoryTab}>
                                    <Text style={styles.categoryTabText}>Mode</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.categoryTab}>
                                    <Text style={styles.categoryTabText}>Beauté</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.categoryTab}>
                                    <Text style={styles.categoryTabText}>Culture</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.categoryTab}>
                                    <Text style={styles.categoryTabText}>Business</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                        {renderFeaturedPost()}
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Derniers Articles</Text>
                        </View>
                    </View>
                }
                data={posts}
                renderItem={({ item }) => (
                    <ArticleCard
                        article={item}
                        onPress={() => handleArticlePress(item)}
                        variant="horizontal"
                    />
                )}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.primary}
                        colors={[Colors.primary]}
                    />
                }
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
            />
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
    headerGreeting: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text,
    },
    notificationButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.primary,
    },
    categoryTabs: {
        paddingVertical: 20,
        paddingLeft: 20,
        backgroundColor: Colors.backgroundLight,
    },
    categoryTab: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        marginRight: 12,
        backgroundColor: Colors.borderLight,
    },
    categoryTabActive: {
        backgroundColor: Colors.primary,
    },
    categoryTabText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    categoryTabTextActive: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.backgroundLight,
    },
    featuredCard: {
        marginHorizontal: 20,
        marginBottom: 24,
        borderRadius: 20,
        overflow: 'hidden',
        height: 280,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    featuredImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    featuredOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
        justifyContent: 'flex-end',
        padding: 20,
    },
    featuredBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginBottom: 12,
    },
    featuredBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFF',
        marginLeft: 4,
        letterSpacing: 0.5,
    },
    featuredTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#FFF',
        lineHeight: 30,
        marginBottom: 12,
    },
    featuredMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    featuredMetaText: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.9)',
        marginLeft: 6,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    list: {
        paddingBottom: 100,
    },
    footerLoader: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
});

export default HomeScreen;
