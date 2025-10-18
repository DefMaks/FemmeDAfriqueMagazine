// src/screens/HomeScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { getPosts } from '../services/api';
import { Colors } from '../theme/colors';
import { Post } from '../models/Post';
// import Share from 'react-native-share';


const HomeScreen = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPosts();
    }, []);

    // const sharePost = (post: Post) => {
    //     const message = `${post.title.rendered}\n\nLire sur Femme d’Afrique : ${post.link}`;
    //     Share.open({ message }).catch(() => null);
    // };

    const fetchPosts = async () => {
        try {
            const data = await getPosts(1, 5);
            setPosts(data);
        } catch (error) {
            console.error('Erreur:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderPost = ({ item }: { item: Post }) => (
        <TouchableOpacity style={styles.postCard}>
            {item._embedded?.['wp:featuredmedia']?.[0]?.source_url && (
                <Image
                    source={{ uri: item._embedded['wp:featuredmedia'][0].source_url }}
                    style={styles.postImage}
                />
            )}
            <Text style={styles.postTitle}>{item.title.rendered}</Text>
            {/* <TouchableOpacity onPress={() => sharePost(item)} style={styles.shareButton}>
                <Text style={styles.shareText}>Partager</Text>
            </TouchableOpacity> */}
        </TouchableOpacity>
    );

    if (loading) {
        return <Text style={styles.loading}>Chargement...</Text>;
    }

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Breaking News</Text>
            <FlatList
                data={posts}
                renderItem={renderPost}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.list}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        padding: 16,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
        color: Colors.text,
    },
    list: {
        paddingBottom: 16,
    },
    postCard: {
        backgroundColor: '#FFF',
        borderRadius: 8,
        marginBottom: 16,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    postImage: {
        width: '100%',
        height: 150,
        borderRadius: 8,
        marginBottom: 8,
    },
    postTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
    },
    loading: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 18,
        color: Colors.text,
    },
    shareButton: {
        marginTop: 8,
        padding: 8,
        backgroundColor: Colors.primary,
        borderRadius: 4,
        alignItems: 'center',
    },
    shareText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
});

export default HomeScreen;