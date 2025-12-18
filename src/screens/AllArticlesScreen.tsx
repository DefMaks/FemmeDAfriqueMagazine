// src/screens/AllArticlesScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { getPosts } from '../services/api';
import { Post } from '../models/Post';
import { ArticleCard } from '../components/ArticleCard';
import { Colors } from '../theme/colors';
import { RootStackParamList } from '../navigation/RootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AllArticlesScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        loadPosts();
    }, []);

    const loadPosts = async () => {
        try {
            setLoading(true);
            const data = await getPosts(1, 15);
            setPosts(data);
            setHasMore(data.length >= 15);
            setPage(1);
        } catch (error) {
            console.error('Erreur chargement articles:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMorePosts = async () => {
        if (loadingMore || !hasMore) return;
        
        setLoadingMore(true);
        try {
            const nextPage = page + 1;
            const morePosts = await getPosts(nextPage, 15);
            if (morePosts.length === 0) {
                setHasMore(false);
            } else {
                setPosts(prev => [...prev, ...morePosts]);
                setPage(nextPage);
                setHasMore(morePosts.length >= 15);
            }
        } catch (error) {
            console.error('Erreur chargement plus d\'articles:', error);
            setHasMore(false);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleArticlePress = useCallback((article: Post) => {
        navigation.navigate('ArticleDetail', { article });
    }, [navigation]);

    const renderArticle = ({ item }: { item: Post }) => (
        <ArticleCard
            article={item}
            onPress={() => handleArticlePress(item)}
            variant="horizontal"
        />
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

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

            <FlatList
                data={posts}
                renderItem={renderArticle}
                keyExtractor={(item, index) => `all_${item.id}_${index}`}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                onEndReached={loadMorePosts}
                onEndReachedThreshold={0.3}
                ListFooterComponent={
                    loadingMore ? (
                        <View style={styles.footerLoader}>
                            <ActivityIndicator size="small" color={Colors.primary} />
                        </View>
                    ) : !hasMore && posts.length > 0 ? (
                        <Text style={styles.endText}>Fin des articles</Text>
                    ) : null
                }
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
    list: {
        padding: 16,
    },
    footerLoader: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    endText: {
        textAlign: 'center',
        color: Colors.textLight,
        fontSize: 14,
        paddingVertical: 20,
    },
});

export default AllArticlesScreen;
