import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const DiscoverScreen = () => {
    const [searchQuery, setSearchQuery] = useState('');

    const categories = [
        { id: '1', name: 'Mode', icon: 'shirt-outline', color: '#FF6B9D' },
        { id: '2', name: 'Beauté', icon: 'sparkles-outline', color: '#C44569' },
        { id: '3', name: 'Culture', icon: 'book-outline', color: '#FFA502' },
        { id: '4', name: 'Business', icon: 'briefcase-outline', color: '#4834DF' },
        { id: '5', name: 'Lifestyle', icon: 'heart-outline', color: '#E74C3C' },
        { id: '6', name: 'Santé', icon: 'fitness-outline', color: '#26DE81' },
        { id: '7', name: 'Tech', icon: 'laptop-outline', color: '#4B7BEC' },
        { id: '8', name: 'Art', icon: 'color-palette-outline', color: '#A55EEA' },
    ];

    const trendingTopics = [
        'Tendances 2024',
        'Mode Africaine',
        'Entrepreneuriat',
        'Bien-être',
        'Leadership Féminin',
    ];

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
                />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Catégories</Text>
                    <View style={styles.categoriesGrid}>
                        {categories.map((category) => (
                            <TouchableOpacity
                                key={category.id}
                                style={[styles.categoryCard, { borderColor: category.color }]}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.categoryIconContainer, { backgroundColor: category.color + '20' }]}>
                                    <Ionicons name={category.icon as any} size={28} color={category.color} />
                                </View>
                                <Text style={styles.categoryName}>{category.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Sujets Tendance</Text>
                        <TouchableOpacity>
                            <Text style={styles.sectionLink}>Voir tout</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.topicsContainer}>
                        {trendingTopics.map((topic, index) => (
                            <TouchableOpacity key={index} style={styles.topicTag} activeOpacity={0.8}>
                                <Ionicons name="trending-up" size={16} color={Colors.primary} />
                                <Text style={styles.topicText}>{topic}</Text>
                            </TouchableOpacity>
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
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: Colors.backgroundLight,
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
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    sectionLink: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.primary,
    },
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 12,
    },
    categoryCard: {
        width: '46%',
        backgroundColor: Colors.backgroundLight,
        borderRadius: 16,
        padding: 20,
        margin: 8,
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
    },
    topicsContainer: {
        paddingHorizontal: 20,
    },
    topicTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.backgroundLight,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    topicText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
        marginLeft: 10,
    },
});

export default DiscoverScreen;
