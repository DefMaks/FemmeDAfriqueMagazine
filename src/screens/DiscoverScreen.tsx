// src/screens/DiscoverScreen.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    ScrollView,
    TouchableOpacity,
    FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import {
    getCategories,
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

const CATEGORY_ICONS: { [key: string]: any } = {
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

const CATEGORY_COLORS = [
    '#A93F55',
    '#A93F55',
    '#A93F55',
    '#A93F55',
    '#A93F55',
    '#A93F55',
    '#A93F55',
    '#A93F55',
];

const DiscoverScreen = () => {
    const navigation = useNavigation<DiscoverScreenNavigationProp>();
    const [searchQuery, setSearchQuery] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [featuredPosts, setFeaturedPosts] = useState<{ [key: string]: Post[] }>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [categoryPosts, setCategoryPosts] = useState<Post[]>([]);
    const [searchResults, setSearchResults] = useState<Post[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        loadCategories();
        loadFeaturedCategories();
    }, []);

    console.log(`rgba(${Colors.primary_rgb}, 0.1)`);

    const loadCategories = async () => {
        try {
            const data = await getCategories();
            setCategories(data.filter((cat: Category) => cat.count > 0).slice(0, 20));
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
        try {
            const posts = await getPostsByCategory(categoryId, 1, 10);
            setCategoryPosts(posts);
        } catch (err) {
            console.error('Error loading category posts:', err);
        }
    };

    const handleArticlePress = (article: Post) => {
        navigation.navigate('ArticleDetail', { article });
    };

    const handleSearch = async (query: string) => {
        if (!query.trim()) {
            setIsSearching(false);
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const results = await searchPosts(query);
            setSearchResults(results);
        } catch (err) {
            console.error('Error searching:', err);
        }
    };

    const getCategoryIcon = (categoryName: string) => {
        return CATEGORY_ICONS[categoryName] || 'folder-outline';
    };

    const getCategoryColor = (index: number) => {
        return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
    };

    if (loading) {
        return <LoadingSpinner message="Chargement des catégories..." />;
    }

    if (error) {
        return <ErrorMessage message={error} onRetry={loadCategories} />;
    }

    if (isSearching) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => setIsSearching(false)}
                    >
                        <Ionicons name="arrow-back" size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Résultats</Text>
                </View>
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
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>Aucun résultat trouvé</Text>
                        </View>
                    }
                />
            </View>
        );
    }

    if (selectedCategory) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => setSelectedCategory(null)}
                    >
                        <Ionicons name="arrow-back" size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Articles</Text>
                </View>
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
                />
            </View>
        );
    }

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

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Catégories en vedette</Text>
                    {Object.entries(FEATURED_CATEGORIES).map(([name, id], index) => (
                        <View key={id} style={styles.featuredCategory}>
                            <TouchableOpacity
                                style={styles.featuredCategoryHeader}
                                onPress={() => handleCategoryPress(id, name)}
                            >
                                <View style={[styles.featuredCategoryIcon, { backgroundColor: getCategoryColor(index) + '20' }]}>
                                    <Ionicons name={getCategoryIcon(name)} size={24} color={getCategoryColor(index)} />
                                </View>
                                <Text style={styles.featuredCategoryName}>{name}</Text>
                                <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
                            </TouchableOpacity>
                            {featuredPosts[name] && featuredPosts[name].length > 0 && (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featuredPostsScroll}>
                                    {featuredPosts[name].map((post) => (
                                        <TouchableOpacity
                                            key={post.id}
                                            style={[styles.featuredPostCard,
                                            {
                                                borderWidth: 1,
                                                borderColor: `rgba(${Colors.primary_rgb}, 0.2)`,
                                            }]}
                                        >
                                            <Text style={[styles.featuredPostTitle, {}]} numberOfLines={2}>
                                                {post.title.rendered}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}
                        </View>
                    ))}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Toutes les catégories</Text>
                    <View style={styles.categoriesGrid}>
                        {categories.map((category) => (
                            <CategoryCard
                                key={category.id}
                                name={category.name}
                                count={category.count}
                                onPress={() => handleCategoryPress(category.id, category.name)}
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
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.text,
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
    categoryCard: {
        width: '48%',
        backgroundColor: Colors.backgroundLight,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        alignItems: 'center',
        borderWidth: 2,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    categoryIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    categoryName: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 4,
        textAlign: 'center',
    },
    categoryCount: {
        fontSize: 12,
        color: Colors.textSecondary,
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
});

export default DiscoverScreen;