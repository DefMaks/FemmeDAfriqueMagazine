// src/screens/DiscoverScreen.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import {
    getCategories,
    getPosts,
    getPostsByCategory,
    searchPosts,
} from '../services/api';
import { Category } from '../models/Category';
import { Post } from '../models/Post';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { ArticleCard } from '../components/ArticleCard';
import { RootStackParamList } from '../navigation/RootNavigator';
import CategoryCard from '../components/CategoryCard';

type DiscoverScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const FEATURED_CATEGORIES = {
    'Communiqués': 3038,
    'Espace Tendresse': 2483,
    'Gastronomie': 20,
    'Entrepreneuriat': 115,
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
};

const DiscoverScreen = () => {
    const navigation = useNavigation<DiscoverScreenNavigationProp>();
    const [searchQuery, setSearchQuery] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [featuredPosts, setFeaturedPosts] = useState<{ [key: string]: Post[] }>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');
    const [categoryPosts, setCategoryPosts] = useState<Post[]>([]);
    const [searchResults, setSearchResults] = useState<Post[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [loadingCategoryPosts, setLoadingCategoryPosts] = useState(false);

    // ⬇️ États pour le scroll infini (dans la vue principale)
    const [posts, setPosts] = useState<Post[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        loadCategories();
        loadFeaturedCategories();
        loadPosts(1); // Chargement initial
    }, []);

    // ⬇️ Fonction générique de chargement des posts
    const loadPosts = async (pageNum: number, loadMore = false) => {
        if (loadMore) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }

        try {
            const data = await getPosts(pageNum, 6);
            if (data.length === 0) {
                setHasMore(false);
            } else {
                setPosts(prev => (loadMore ? [...prev, ...data] : data));
                if (!loadMore) setPage(pageNum);
            }
        } catch (error) {
            console.error('Erreur chargement posts:', error);
            setHasMore(false);
        } finally {
            if (loadMore) {
                setLoadingMore(false);
            } else {
                setLoading(false);
            }
        }
    };

    // ⬇️ Fonction appelée en fin de scroll
    const loadMore = () => {
        if (!loadingMore && hasMore) {
            loadPosts(page + 1, true);
        }
    };

    const loadCategories = async () => {
        try {
            const data = await getCategories();
            setCategories(data.filter((cat: any) => cat.count > 0).slice(0, 20));
        } catch (err) {
            setError('Impossible de charger les catégories');
            console.error('Error loading categories:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadFeaturedCategories = async () => {
        try {
            const promises = Object.entries(FEATURED_CATEGORIES).map(async ([name, id]) => {
                const posts = await getPostsByCategory(id, 1, 3);
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

    const handleCategoryPress = async (categoryId: number, categoryName: string) => {
        setSelectedCategory(categoryId);
        setSelectedCategoryName(categoryName);
        setLoadingCategoryPosts(true);
        try {
            const posts = await getPostsByCategory(categoryId, 1, 10);
            setCategoryPosts(posts);
        } catch (err) {
            console.error('Error loading category posts:', err);
        } finally {
            setLoadingCategoryPosts(false);
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
            return;
        }

        setIsSearching(true);
        setSearchLoading(true);
        setSearchResults([]);

        try {
            const results = await searchPosts(trimmed);
            setSearchResults(results);
        } catch (err) {
            console.error('Error searching:', err);
        } finally {
            setSearchLoading(false);
        }
    };

    const getCategoryIcon = (categoryName: string): string => {
        return CATEGORY_ICONS[categoryName] || 'folder-outline';
    };

    const decodeEntities = (text: string): string => {
        return text
            .replace(/&rsquo;/g, "'")
            .replace(/&eacute;/g, 'é')
            .replace(/&egrave;/g, 'è')
            .replace(/&ecirc;/g, 'ê')
            .replace(/&agrave;/g, 'à')
            .replace(/&acirc;/g, 'â')
            .replace(/&ocirc;/g, 'ô')
            .replace(/&ucirc;/g, 'û')
            .replace(/&ccedil;/g, 'ç')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'");
    };

    if (loading && posts.length === 0) {
        return <LoadingSpinner message="Chargement..." />;
    }

    if (error) {
        return <ErrorMessage message={error} onRetry={loadCategories} />;
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
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={Colors.primary} />
                        <Text style={styles.loadingText}>Chargement...</Text>
                    </View>
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
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>Aucun résultat trouvé</Text>
                            </View>
                        }
                        ListFooterComponent={
                            loadingMore ? (
                                <View style={styles.loadingMore}>
                                    <ActivityIndicator size="small" color={Colors.primary} />
                                </View>
                            ) : null
                        }
                        onEndReached={loadMore}
                        onEndReachedThreshold={0.5}
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
                            size={30}
                            color={Colors.text}
                            style={[styles.categoryIcon, { marginLeft: 15 }]}
                        />
                        <Text style={styles.headerTitle}>
                            {decodeEntities(selectedCategoryName)}
                        </Text>
                    </View>
                </View>

                {loadingCategoryPosts ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={Colors.primary} />
                        <Text style={styles.loadingText}>Chargement des articles...</Text>
                    </View>
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
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        ListFooterComponent={
                            loadingMore ? (
                                <View style={styles.loadingMore}>
                                    <ActivityIndicator size="small" color={Colors.primary} />
                                </View>
                            ) : null
                        }
                        onEndReached={loadMore}
                        onEndReachedThreshold={0.5}
                    />
                )}
            </View>
        );
    }

    // === Affichage principal avec Infinite Scroll ===
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

            {/* ✅ FlatList avec Infinite Scroll */}
            <FlatList
                data={posts}
                renderItem={({ item }) => (
                    <ArticleCard
                        article={item}
                        onPress={() => handleArticlePress(item)}
                        variant="horizontal"
                    />
                )}
                keyExtractor={(item) => item.id.toString()}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                contentContainerStyle={styles.content}
                ListHeaderComponent={
                    <>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Catégories en vedette</Text>
                            {Object.entries(FEATURED_CATEGORIES).map(([name, id]) => (
                                <View key={'head_cat_' + id} style={styles.featuredCategory}>
                                    <TouchableOpacity
                                        style={styles.featuredCategoryHeader}
                                        onPress={() => handleCategoryPress(id, decodeEntities(name))}
                                    >
                                        <View style={[styles.featuredCategoryIcon, { backgroundColor: Colors.primary + '20' }]}>
                                            <Ionicons name={getCategoryIcon(name) as any} size={24} color={Colors.primary} />
                                        </View>
                                        <Text style={styles.featuredCategoryName}>
                                            {decodeEntities(name)}
                                        </Text>
                                        <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
                                    </TouchableOpacity>
                                    {featuredPosts[name] && featuredPosts[name].length > 0 && (
                                        <FlatList
                                            horizontal
                                            showsHorizontalScrollIndicator={false}
                                            data={featuredPosts[name]}
                                            renderItem={({ item }) => (
                                                <TouchableOpacity
                                                    key={item.id}
                                                    style={styles.featuredPostCard}
                                                    onPress={() => handleArticlePress(item)}
                                                >
                                                    <Text style={styles.featuredPostTitle} numberOfLines={2}>
                                                        {decodeEntities(item.title.rendered)}
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                            keyExtractor={(item) => item.id.toString()}
                                            contentContainerStyle={styles.featuredPostsScroll}
                                        />
                                    )}
                                </View>
                            ))}
                        </View>

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Toutes les catégories</Text>
                            <View style={styles.categoriesGrid}>
                                {categories.map((category) => (
                                    <CategoryCard
                                        key={'cat_' + category.id}
                                        name={decodeEntities(category.name)}
                                        count={category.count}
                                        onPress={() => handleCategoryPress(category.id, category.name)}
                                    />
                                ))}
                            </View>
                        </View>

                        {/* Section "Derniers articles" */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Derniers articles</Text>
                        </View>
                    </>
                }
                ListFooterComponent={
                    loadingMore ? (
                        <View style={styles.loadingMore}>
                            <ActivityIndicator size="small" color={Colors.primary} />
                        </View>
                    ) : null
                }
                showsVerticalScrollIndicator={false}
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
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: Colors.backgroundLight,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.text,
        marginLeft: 8,
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
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
        paddingBottom: 100,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
        paddingHorizontal: 20,
        marginBottom: 16,
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
    },
    featuredPostCard: {
        width: 200,
        backgroundColor: Colors.backgroundLight,
        padding: 12,
        borderRadius: 12,
        marginRight: 12,
    },
    featuredPostTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        lineHeight: 18,
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 14,
        color: Colors.textLight,
    },
    loadingMore: {
        paddingVertical: 16,
        alignItems: 'center',
    },
});

export default DiscoverScreen;