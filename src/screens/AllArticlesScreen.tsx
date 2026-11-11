// src/screens/AllArticlesScreen.tsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Platform,
    RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { getPosts, getAdsByZoneId, clearCache } from '../services/api';
import { Post } from '../models/Post';
import { ArticleCard } from '../components/ArticleCard';
import { InlineAdBanner, AppAd } from '../components/InlineAdBanner';
import { ArticleListSkeleton, ArticleFooterSkeleton } from '../components/PageSkeletons';
import { Colors } from '../theme/colors';
import { RootStackParamList } from '../navigation/RootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const IN_LIST_AD_ZONE_ID = 14742;
const AD_INTERVAL = 5;
const PAGE_SIZE = 12;

type ListItem = { type: 'article'; data: Post } | { type: 'ad'; data: AppAd; index: number };

const AllArticlesScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const [posts, setPosts] = useState<Post[]>([]);
    const [inListAds, setInListAds] = useState<AppAd[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const pageRef = useRef(1);
    const loadingMoreRef = useRef(false);
    const hasMoreRef = useRef(true);

    useEffect(() => {
        loadPosts(false);
        loadInListAds();
    }, []);

    const loadInListAds = async () => {
        try {
            const ads = await getAdsByZoneId(IN_LIST_AD_ZONE_ID);
            setInListAds(ads);
        } catch (error) {
            console.log('Erreur chargement pubs in-list:', error);
        }
    };

    const loadPosts = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
                clearCache('posts');
            } else {
                setLoading(true);
            }

            pageRef.current = 1;
            const data = await getPosts(1, PAGE_SIZE);
            setPosts(data);
            const more = data.length >= PAGE_SIZE;
            hasMoreRef.current = more;
            setHasMore(more);
        } catch (error) {
            console.error('Erreur chargement articles:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadMorePosts = useCallback(async () => {
        if (loadingMoreRef.current || !hasMoreRef.current || loading) return;

        loadingMoreRef.current = true;
        setLoadingMore(true);

        try {
            const nextPage = pageRef.current + 1;
            const morePosts = await getPosts(nextPage, PAGE_SIZE);

            if (!morePosts || morePosts.length === 0) {
                hasMoreRef.current = false;
                setHasMore(false);
            } else {
                pageRef.current = nextPage;
                const more = morePosts.length >= PAGE_SIZE;
                hasMoreRef.current = more;
                setHasMore(more);

                setPosts(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const uniqueNew = morePosts.filter((p: Post) => p && !existingIds.has(p.id));
                    return [...prev, ...uniqueNew];
                });
            }
        } catch (error) {
            console.error('Erreur chargement plus d\'articles:', error);
        } finally {
            loadingMoreRef.current = false;
            setLoadingMore(false);
        }
    }, [loading]);

    const handleArticlePress = useCallback((article: Post) => {
        navigation.navigate('ArticleDetail', { article });
    }, [navigation]);

    const mixedData = useMemo((): ListItem[] => {
        const mixedList: ListItem[] = [];
        let adIndex = 0;

        posts.forEach((post, index) => {
            mixedList.push({ type: 'article', data: post });

            if ((index + 1) % AD_INTERVAL === 0 && inListAds.length > 0) {
                const ad = inListAds[adIndex % inListAds.length];
                mixedList.push({ type: 'ad', data: ad, index: adIndex });
                adIndex++;
            }
        });

        return mixedList;
    }, [posts, inListAds]);

    const renderItem = useCallback(({ item }: { item: ListItem }) => {
        if (item.type === 'ad') {
            return <InlineAdBanner ad={item.data} />;
        }
        return (
            <ArticleCard
                article={item.data}
                onPress={() => handleArticlePress(item.data)}
                variant="horizontal"
            />
        );
    }, [handleArticlePress]);

    const getItemKey = useCallback((item: ListItem): string => {
        if (item.type === 'ad') {
            return `ad_${item.data.id}_${item.index}`;
        }
        return `article_${item.data.id}`;
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Tous les articles</Text>
                <View style={styles.placeholder} />
            </View>

            {loading ? (
                <ArticleListSkeleton count={7} />
            ) : (
                <FlatList
                    data={mixedData}
                    renderItem={renderItem}
                    keyExtractor={getItemKey}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    onEndReached={loadMorePosts}
                    onEndReachedThreshold={0.5}
                    initialNumToRender={8}
                    maxToRenderPerBatch={8}
                    windowSize={7}
                    removeClippedSubviews={Platform.OS === 'android'}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => loadPosts(true)}
                            tintColor={Colors.primary}
                            colors={[Colors.primary]}
                        />
                    }
                    ListFooterComponent={
                        loadingMore ? (
                            <ArticleFooterSkeleton />
                        ) : !hasMore && posts.length > 0 ? (
                            <Text style={styles.endText}>Fin des articles</Text>
                        ) : undefined
                    }
                />
            )}
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
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 60 : 50,
        paddingBottom: 16,
        paddingHorizontal: 16,
        backgroundColor: Colors.backgroundLight,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    placeholder: {
        width: 40,
    },
    list: {
        paddingVertical: 16,
    },
    endText: {
        textAlign: 'center',
        color: Colors.textLight,
        fontSize: 14,
        paddingVertical: 20,
    },
});

export default AllArticlesScreen;
