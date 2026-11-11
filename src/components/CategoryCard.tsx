// src/components/CategoryCard.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';
import { Colors } from '../theme/colors';
import { decodeHtmlEntities } from '../utils/textUtils';

interface CategoryCardProps {
    name: string;
    count: number;
    onPress: () => void;
}
const windowWidth = Dimensions.get('window').width;
const isTablet = windowWidth >= 768;
const cardWidth = isTablet ? '22%' : '48%';

const CategoryCard: React.FC<CategoryCardProps> = ({ name, count, onPress }) => {
    const cleanName = decodeHtmlEntities(name);

    return (
        <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
            <Text style={styles.name} numberOfLines={2}>
                {cleanName}
            </Text>
            <Text style={styles.count}>{count} articles</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: cardWidth,
        backgroundColor: Colors.primary,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    name: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 4,
    },
    count: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.85)',
    },
});

export default CategoryCard;
