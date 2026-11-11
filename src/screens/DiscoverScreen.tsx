// src/screens/DiscoverScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    ScrollView,
    Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import {
    getCategories,
    getPostsByCategory,
    getPostsByTag,
    searchPosts,
} from '../services/api';
import { Category } from '../models/Category';
import { Post } from '../models/Post';
import {
    DiscoverSkeleton,
    ArticleListSkeleton,
    ArticleFooterSkeleton,
} from '../components/PageSkeletons';
import { ErrorMessage } from '../components/ErrorMessage';
import { ArticleCard } from '../components/ArticleCard';
import { RootStackParamList } from '../navigation/RootNavigator';
import CategoryCard from '../components/CategoryCard';
import { analyticsService } from '../services/analytics.simple';
import { decodeHtmlEntities } from '../utils/textUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Configuration pour afficher exactement 1.5 carte à l'écran (1 carte complète + 50% de la suivante)
const FEATURED_CARD_WIDTH = Math.round((SCREEN_WIDTH - 34) / 1.5);

type DiscoverScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type DiscoverScreenRouteProps = {
    categoryId?: number;
    categoryName?: string;
    isTag?: boolean;
    showImage?: boolean;
};

export type FeaturedCategoryConfig = {
    id: number;
    showImage?: boolean;
};

const FEATURED_CATEGORIES: Record<string, FeaturedCategoryConfig> = {
    'Communiqués': { id: 3038, showImage: true },
    'Espace Tendresse': { id: 2483, showImage: true },
    'Gastronomie': { id: 20, showImage: true },
    'Entrepreneuriat': { id: 115, showImage: true },
};

const CATEGORY_ICONS: { [key: string]: string } = {
    'Communiqués': 'megaphone-outline',
    'Espace Tendresse': 'heart-outline',
    'Gastronomie': 'restaurant-outline',
    'Entrepreneuriat': 'briefcase-outline',
    'Mode': 'shirt-outline',
    'Beauté': 'sparkles-outline',
    'Culture': 'book-outline',
    'Business': 'trending-up-outline',
    'Lifestyle': 'happy-outline',
    'Santé': 'fitness-outline',
    'Tech': 'laptop-outline',
    'Art': 'color-palette-outline',
    'Mines': 'construct-outline',
    'Enfer des femmes': 'people-outline',
};

const DiscoverScreen = () => {
    const navigation = useNavigation<DiscoverScreenNavigationProp>();
    const route = useRoute();
    const params = route.params as DiscoverScreenRouteProps | undefined;

    const [searchQuery, setSearchQuery] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [featuredPosts, setFeaturedPosts] = useState<{ [key: string]: Post[] }>({});
    const [showCategoryImages, setShowCategoryImages] = useState<boolean>(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');
    const [selectedIsTag, setSelectedIsTag] = useState<boolean>(false);
    const [categoryPosts, setCategoryPosts] = useState<Post[]>([]);
    const [searchResults, setSearchResults] = useState<Post[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [loadingCategoryPosts, setLoadingCategoryPosts] = useState(false);

    // États pour le scroll infini dans les catégories
    const [categoryPage, setCategoryPage] = useState(1);
    const [categoryHasMore, setCategoryHasMore] = useState(true);
    const [loadingMoreCategory, setLoadingMoreCategory] = useState(false);
    const loadingMoreCategoryRef = useRef(false);

    // États pour le scroll infini dans la recherche
    const [searchPage, setSearchPage] = useState(1);
    const [searchHasMore, setSearchHasMore] = useState(true);
    const [loadingMoreSearch, setLoadingMoreSearch] = useState(false);
    const loadingMoreSearchRef = useRef(false);
    const [currentSearchQuery, setCurrentSearchQuery] = useState('');

    useEffect(() => {
        loadInitialData();
        analyticsService.trackScreenView('Discover');
        AsyncStorage.getItem('@fam_pref_show_images').then((val) => {
            if (val !== null) {
                setShowCategoryImages(JSON.parse(val));
            }
        }).catch(() => { });
    }, []);

    const toggleShowCategoryImages = async () => {
        const nextValue = !showCategoryImages;
        setShowCategoryImages(nextValue);
        try {
            await AsyncStorage.setItem('@fam_pref_show_images', JSON.stringify(nextValue));
        } catch { }
    };

    // Gérer la navigation avec paramètre de catégorie
    useEffect(() => {
        if (params?.categoryId && params?.categoryName) {
            handleCategoryPress(params.categoryId, params.categoryName, !!params.isTag);
        }
    }, [params?.categoryId, params?.categoryName, params?.isTag]);

    const loadInitialData = async () => {
        setLoading(true);
        setError(null);
        try {
            await Promise.all([loadCategories(), loadFeaturedCategories()]);
        } catch (err) {
            setError('Impossible de charger les catégories');
        } finally {
            setLoading(false);
        }
    };

    const loadCategories = async () => {
        try {
            const data = await getCategories();
            setCategories(data.filter((cat: any) => cat.count > 0).slice(0, 20));
        } catch (err) {
            setError('Impossible de charger les catégories');
            console.error('Error loading categories:', err);
        }
    };

    const loadFeaturedCategories = async () => {
        try {
            const promises = Object.entries(FEATURED_CATEGORIES).map(async ([name, config]) => {
                const posts = await getPostsByCategory(config.id, 1, 5);
                return { name, posts };
            });

            const results = await Promise.all(promises);
            const postsMap: { [key: string]: Post[] } = {};
            results.forEach(({ name, posts }) => {
                postsMap[name] = posts;
            });
            setFeaturedPosts(postsMap);
        } catch (err) {
            console.error('Error loading featured categories:', err);
        }
    };

    const handleCategoryPress = async (categoryId: number, categoryName: string, isTag = false) => {
        setSelectedCategory(categoryId);
        setSelectedCategoryName(decodeHtmlEntities(categoryName));
        setSelectedIsTag(isTag);
        setLoadingCategoryPosts(true);
        setCategoryPage(1);
        setCategoryHasMore(true);
        setCategoryPosts([]);
        try {
            const posts = isTag
                ? await getPostsByTag(categoryId, 1, 10)
                : await getPostsByCategory(categoryId, 1, 10);
            setCategoryPosts(posts);
            setCategoryHasMore(posts.length >= 10);
        } catch (err) {
            console.error('Error loading category posts:', err);
        } finally {
            setLoadingCategoryPosts(false);
        }
    };

    const loadMoreCategoryPosts = async () => {
        if (loadingMoreCategoryRef.current || loadingMoreCategory || !categoryHasMore || !selectedCategory) return;

        loadingMoreCategoryRef.current = true;
        setLoadingMoreCategory(true);
        try {
            const nextPage = categoryPage + 1;
            const morePosts = selectedIsTag
                ? await getPostsByTag(selectedCategory, nextPage, 10)
                : await getPostsByCategory(selectedCategory, nextPage, 10);
            if (morePosts.length === 0) {
                setCategoryHasMore(false);
            } else {
                setCategoryPosts(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const uniqueNew = morePosts.filter((p: Post) => !existingIds.has(p.id));
                    return [...prev, ...uniqueNew];
                });
                setCategoryPage(nextPage);
                setCategoryHasMore(morePosts.length >= 10);
            }
        } catch (err) {
            console.error('Error loading more category posts:', err);
            setCategoryHasMore(false);
        } finally {
            setLoadingMoreCategory(false);
            loadingMoreCategoryRef.current = false;
        }
    };

    const handleArticlePress = (article: Post) => {
        navigation.navigate('ArticleDetail', { article });
    };

    const handleSearch = async (query: string) => {
        const trimmed = query.trim();
        if (!trimmed) {
            setIsSearching(false);
            setSearchResults([]);
            setSearchLoading(false);
            setCurrentSearchQuery('');
            return;
        }

        setIsSearching(true);
        setSearchLoading(true);
        setSearchResults([]);
        setSearchPage(1);
        setSearchHasMore(true);
        setCurrentSearchQuery(trimmed);

        try {
            const results = await searchPosts(trimmed, 1, 10);
            setSearchResults(results);
            setSearchHasMore(results.length >= 10);
            analyticsService.trackSearch(trimmed, results.length);
        } catch (err) {
            console.error('Error searching:', err);
        } finally {
            setSearchLoading(false);
        }
    };

    const loadMoreSearchResults = async () => {
        if (loadingMoreSearchRef.current || loadingMoreSearch || !searchHasMore || !currentSearchQuery) return;

        loadingMoreSearchRef.current = true;
        setLoadingMoreSearch(true);
        try {
            const nextPage = searchPage + 1;
            const moreResults = await searchPosts(currentSearchQuery, nextPage, 10);
            if (moreResults.length === 0) {
                setSearchHasMore(false);
            } else {
                setSearchResults(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const uniqueNew = moreResults.filter((p: Post) => !existingIds.has(p.id));
                    return [...prev, ...uniqueNew];
                });
                setSearchPage(nextPage);
                setSearchHasMore(moreResults.length >= 10);
            }
        } catch (err) {
            console.error('Error loading more search results:', err);
            setSearchHasMore(false);
        } finally {
            setLoadingMoreSearch(false);
            loadingMoreSearchRef.current = false;
        }
    };

    const getCategoryIcon = (categoryName: string): string => {
        return CATEGORY_ICONS[categoryName] || 'folder-outline';
    };

    if (loading && categories.length === 0) {
        return <DiscoverSkeleton />;
    }

    if (error && categories.length === 0) {
        return <ErrorMessage message={error} onRetry={loadInitialData} />;
    }

    // === Affichage des résultats de recherche ===
    if (isSearching) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => setIsSearching(false)}>
                        <Ionicons name="arrow-back" size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Recherche</Text>
                </View>

                <View style={styles.searchHeader}>
                    <Text style={styles.searchHeaderText}>
                        Recherche : « {searchQuery} »
                    </Text>
                </View>

                {searchLoading ? (
                    <ArticleListSkeleton count={6} />
                ) : (
                    <FlatList
                        data={searchResults}
                        renderItem={({ item }) => (
                            <ArticleCard
                                article={item}
                                onPress={() => handleArticlePress(item)}
                                variant="horizontal"
                            />
                        )}
                        keyExtractor={(item, index) => `search_result_${item.id}_${index}`}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>Aucun résultat trouvé</Text>
                            </View>
                        }
                        ListFooterComponent={
                            loadingMoreSearch ? (
                                <ArticleFooterSkeleton />
                            ) : !searchHasMore && searchResults.length > 0 ? (
                                <Text style={styles.endOfList}>Fin des résultats</Text>
                            ) : undefined
                        }
                        onEndReached={loadMoreSearchResults}
                        onEndReachedThreshold={0.4}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
        );
    }

    // === Affichage des articles d'une catégorie ===
    if (selectedCategory) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => setSelectedCategory(null)}>
                        <Ionicons name="arrow-back" size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <View style={styles.categoryHeader}>
                        <Ionicons
                            name={getCategoryIcon(selectedCategoryName) as any}
                            size={28}
                            color={Colors.text}
                            style={[styles.categoryIcon, { marginLeft: 12 }]}
                        />
                        <Text style={styles.headerTitle} numberOfLines={1}>
                            {decodeHtmlEntities(selectedCategoryName)}
                        </Text>
                    </View>
                </View>

                {loadingCategoryPosts ? (
                    <ArticleListSkeleton count={6} />
                ) : (
                    <FlatList
                        data={categoryPosts}
                        renderItem={({ item }) => (
                            <ArticleCard
                                article={item}
                                onPress={() => handleArticlePress(item)}
                                variant="horizontal"
                            />
                        )}
                        keyExtractor={(item, index) => `category_post_${item.id}_${index}`}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        ListFooterComponent={
                            loadingMoreCategory ? (
                                <ArticleFooterSkeleton />
                            ) : !categoryHasMore && categoryPosts.length > 0 ? (
                                <Text style={styles.endOfList}>Fin des articles</Text>
                            ) : undefined
                        }
                        onEndReached={loadMoreCategoryPosts}
                        onEndReachedThreshold={0.4}
                    />
                )}
            </View>
        );
    }

    // === Affichage principal (sans liste d'articles sous Toutes les catégories) ===
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Découvrir</Text>
            </View>

            <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={20} color={Colors.textLight} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Rechercher des articles..."
                    placeholderTextColor={Colors.textLight}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={() => handleSearch(searchQuery)}
                    returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity
                        onPress={() => {
                            setSearchQuery('');
                            setIsSearching(false);
                        }}
                        style={styles.clearButton}
                    >
                        <Ionicons name="close-circle" size={20} color={Colors.textLight} />
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.section}>
                    <View style={styles.sectionHeaderWithToggle}>
                        <Text style={styles.sectionTitleNoPadding}>Catégories en vedette</Text>
                    </View>
                    {Object.entries(FEATURED_CATEGORIES).map(([name, config]) => {
                        const hasImages = config.showImage !== undefined
                            ? (config.showImage && showCategoryImages)
                            : showCategoryImages;

                        return (
                            <View key={'head_cat_' + config.id} style={styles.featuredCategory}>
                                <TouchableOpacity
                                    style={styles.featuredCategoryHeader}
                                    onPress={() => handleCategoryPress(config.id, decodeHtmlEntities(name))}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.featuredCategoryIcon, { backgroundColor: Colors.primary + '20' }]}>
                                        <Ionicons name={getCategoryIcon(name) as any} size={24} color={Colors.primary} />
                                    </View>
                                    <Text style={styles.featuredCategoryName}>
                                        {decodeHtmlEntities(name)}
                                    </Text>
                                    <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
                                </TouchableOpacity>
                                {featuredPosts[name] && featuredPosts[name].length > 0 && (
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.featuredPostsScroll}
                                        decelerationRate="fast"
                                        snapToInterval={FEATURED_CARD_WIDTH + 14}
                                        snapToAlignment="start"
                                    >
                                        {featuredPosts[name].map((item, index) => (
                                            <View
                                                key={`featured_${name}_${item.id}_${index}`}
                                                style={[
                                                    styles.featuredCardWrapper,
                                                    !hasImages && styles.featuredCardWrapperNoImage
                                                ]}
                                            >
                                                <ArticleCard
                                                    article={item}
                                                    onPress={() => handleArticlePress(item)}
                                                    variant="vertical"
                                                    showImage={!hasImages}
                                                    titleStyle={styles.featuredArticleTitle}
                                                />
                                            </View>
                                        ))}
                                    </ScrollView>
                                )}
                            </View>
                        );
                    })}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Toutes les catégories</Text>
                    <View style={styles.categoriesGrid}>
                        {categories.map((category) => (
                            <CategoryCard
                                key={'cat_' + category.id}
                                name={decodeHtmlEntities(category.name)}
                                count={category.count}
                                onPress={() => handleCategoryPress(category.id, decodeHtmlEntities(category.name))}
                            />
                        ))}
                    </View>
                </View>
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
        paddingBottom: 20,
        backgroundColor: Colors.backgroundLight,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text,
        marginLeft: 8,
        flexShrink: 1,
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    categoryIcon: {
        marginRight: 8,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.backgroundLight,
        marginHorizontal: 20,
        marginTop: 10,
        marginBottom: 20,
        paddingHorizontal: 16,
        height: 48,
        borderRadius: 24,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: Colors.text,
    },
    content: {
        paddingBottom: 140,
    },
    section: {
        marginBottom: 28,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    sectionHeaderWithToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    sectionTitleNoPadding: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
    },
    imageToggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary + '15',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 14,
    },
    imageToggleBtnActive: {
        backgroundColor: Colors.borderLight,
    },
    imageToggleText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.primary,
    },
    imageToggleTextMuted: {
        color: Colors.textLight,
    },
    featuredCategory: {
        marginBottom: 20,
    },
    featuredCategoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: Colors.backgroundLight,
        marginHorizontal: 20,
        borderRadius: 12,
        marginBottom: 12,
    },
    featuredCategoryIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    featuredCategoryName: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    featuredPostsScroll: {
        paddingLeft: 20,
        paddingRight: 14,
        paddingBottom: 6,
    },
    featuredCardWrapper: {
        width: FEATURED_CARD_WIDTH,
        marginRight: 14,
    },
    featuredCardWrapperNoImage: {
        width: FEATURED_CARD_WIDTH,
        marginRight: 14,
    },
    featuredPostCard: {
        width: 200,
        backgroundColor: Colors.backgroundLight,
        padding: 12,
        borderRadius: 12,
        marginRight: 12,
    },
    featuredPostTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.text,
        lineHeight: 16,
    },
    featuredArticleTitle: {
        fontSize: 12,
        lineHeight: 16,
    },
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
    },
    list: {
        paddingTop: 16,
        paddingBottom: 100,
    },
    clearButton: {
        padding: 4,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: Colors.textLight,
    },
    searchHeader: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: Colors.backgroundLight,
    },
    searchHeaderText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    endOfList: {
        textAlign: 'center',
        color: Colors.textLight,
        fontSize: 14,
        paddingVertical: 20,
    },
});

export default DiscoverScreen;
