// src/screens/ShopScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, StyleSheet } from 'react-native';
import { getMagazines, getMedia } from '../services/api';
import { Magazine } from '../models/Magazine';
import { Colors } from '../theme/colors';

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

    // Fonction pour obtenir le lien du PDF
    const getPdfUrl = async (pdfId: number) => {
        try {
            const media = await getMedia(pdfId);
            return media.source_url; // Ou media.guid.rendered, selon la structure
        } catch (error) {
            console.error('Erreur récupération PDF:', error);
            return null;
        }
    };

    const renderMagazine = ({ item }: { item: Magazine }) => (
        <View style={styles.magazineCard}>
            <Image
                source={{ uri: item.better_featured_image?.source_url || item.dmks_featured_image?.src }}
                style={styles.coverImage}
            />
            <Text style={styles.title}>{item.title.rendered}</Text>
            <Text style={styles.info}>N°{item.acf.numero} • {item.acf.pages} pages</Text>
            <Text style={styles.price}>${item.acf.prix_mag + item.acf.tva} TTC*</Text>
        </View>
    );

    if (loading) {
        return <Text style={styles.loading}>Chargement...</Text>;
    }

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Boutique FDA</Text>
            <FlatList
                data={magazines}
                renderItem={renderMagazine}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.list}
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
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
    columnWrapper: {
        justifyContent: 'space-between',
    },
    magazineCard: {
        backgroundColor: '#FFF',
        borderRadius: 8,
        marginBottom: 16,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        width: '48%',
    },
    coverImage: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        marginBottom: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 4,
    },
    info: {
        fontSize: 14,
        color: Colors.text,
        marginBottom: 4,
    },
    price: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    loading: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 18,
        color: Colors.text,
    },
});

export default ShopScreen;