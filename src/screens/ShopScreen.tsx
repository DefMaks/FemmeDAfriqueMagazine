import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { getMagazines, getMedia } from '../services/api';
import { Magazine } from '../models/Magazine';
import { Colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const ShopScreen = () => {
    const [magazines, setMagazines] = useState<Magazine[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMagazines();
    }, []);

    const fetchMagazines = async () => {
        try {
            const data = await getMagazines(1, 10);
            setMagazines(data);
        } catch (error) {
            console.error('Erreur:', error);
        } finally {
            setLoading(false);
        }
    };

    const getPdfUrl = async (pdfId: number) => {
        try {
            const media = await getMedia(pdfId);
            return media.source_url;
        } catch (error) {
            console.error('Erreur récupération PDF:', error);
            return null;
        }
    };

    const renderMagazine = ({ item }: { item: Magazine }) => (
        <TouchableOpacity style={styles.magazineCard} activeOpacity={0.8}>
            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: item.better_featured_image?.source_url || item.dmks_featured_image?.src }}
                    style={styles.coverImage}
                />
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>N°{item.acf.numero}</Text>
                </View>
            </View>
            <View style={styles.magazineInfo}>
                <Text style={styles.title} numberOfLines={2}>{item.title.rendered}</Text>
                <View style={styles.metaInfo}>
                    <Ionicons name="document-text-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.pages}>{item.acf.pages} pages</Text>
                </View>
                <View style={styles.priceContainer}>
                    <Text style={styles.price}>${(item.acf.prix_mag + item.acf.tva).toFixed(2)}</Text>
                    <TouchableOpacity style={styles.addButton}>
                        <Ionicons name="cart-outline" size={18} color="#FFF" />
                    </TouchableOpacity>
                </View>
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
                    <Text style={styles.headerSubtitle}>Explorez</Text>
                    <Text style={styles.headerTitle}>Notre Boutique</Text>
                </View>
                <TouchableOpacity style={styles.searchButton}>
                    <Ionicons name="search-outline" size={24} color={Colors.text} />
                </TouchableOpacity>
            </View>
            <FlatList
                data={magazines}
                renderItem={renderMagazine}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.list}
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
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
    headerSubtitle: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text,
    },
    searchButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    list: {
        paddingHorizontal: 12,
        paddingTop: 12,
        paddingBottom: 100,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        paddingHorizontal: 8,
    },
    magazineCard: {
        backgroundColor: Colors.backgroundLight,
        borderRadius: 16,
        marginBottom: 16,
        width: '48%',
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        overflow: 'hidden',
    },
    imageContainer: {
        position: 'relative',
    },
    coverImage: {
        width: '100%',
        height: 220,
    },
    badge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: Colors.primary,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFF',
    },
    magazineInfo: {
        padding: 12,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 8,
        lineHeight: 18,
    },
    metaInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    pages: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginLeft: 6,
    },
    priceContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    price: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.primary,
    },
    addButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
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

export default ShopScreen;
