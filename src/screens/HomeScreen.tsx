import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { getPosts } from '../services/api';
import { Colors } from '../theme/colors';
import { Post } from '../models/Post';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const HomeScreen = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [featuredPost, setFeaturedPost] = useState<Post | null>(null);

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            const data = await getPosts(1, 10);
            if (data.length > 0) {
                setFeaturedPost(data[0]);
                setPosts(data.slice(1));
            }
        } catch (error) {
            console.error('Erreur:', error);
        } finally {
            setLoading(false);
        }
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

    const stripHtml = (html: string) => {
        return html.replace(/<[^>]*>/g, '').substring(0, 100) + '...';
    };

    const renderFeaturedPost = () => {
        if (!featuredPost) return null;

        return (
            <TouchableOpacity style={styles.featuredCard} activeOpacity={0.9}>
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

    const renderPost = ({ item, index }: { item: Post; index: number }) => (
        <TouchableOpacity style={styles.postCard} activeOpacity={0.8}>
            <View style={styles.postContent}>
                <View style={styles.postTextContainer}>
                    <Text style={styles.postTitle} numberOfLines={3}>
                        {item.title.rendered}
                    </Text>
                    <Text style={styles.postExcerpt} numberOfLines={2}>
                        {stripHtml(item.excerpt.rendered)}
                    </Text>
                    <View style={styles.postMeta}>
                        <Ionicons name="time-outline" size={12} color={Colors.textLight} />
                        <Text style={styles.postMetaText}>{formatDate(item.date)}</Text>
                    </View>
                </View>
                {item._embedded?.['wp:featuredmedia']?.[0]?.source_url && (
                    <Image
                        source={{ uri: item._embedded['wp:featuredmedia'][0].source_url }}
                        style={styles.postImage}
                    />
                )}
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Chargement...</Text>
            </View>
        );
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
                            <TouchableOpacity>
                                <Text style={styles.sectionLink}>Voir tout</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                }
                data={posts}
                renderItem={renderPost}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.list}
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
    sectionLink: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.primary,
    },
    list: {
        paddingBottom: 100,
    },
    postCard: {
        backgroundColor: Colors.backgroundLight,
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    postContent: {
        flexDirection: 'row',
        padding: 16,
    },
    postTextContainer: {
        flex: 1,
        paddingRight: 12,
    },
    postTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
        lineHeight: 22,
        marginBottom: 8,
    },
    postExcerpt: {
        fontSize: 13,
        color: Colors.textSecondary,
        lineHeight: 18,
        marginBottom: 12,
    },
    postMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    postMetaText: {
        fontSize: 12,
        color: Colors.textLight,
        marginLeft: 4,
    },
    postImage: {
        width: 100,
        height: 100,
        borderRadius: 12,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: Colors.textSecondary,
    },
});

export default HomeScreen;
