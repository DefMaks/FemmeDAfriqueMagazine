// src/components/CategoryCard.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Dimensions } from 'react-native';

import { Colors } from '../theme/colors';

interface CategoryCardProps {
    name: string;
    count: number;
    onPress: () => void;
}
const windowWidth = Dimensions.get('window').width;
const isTablet = windowWidth >= 768;
const cardWidth = isTablet ? '22%' : '48%';

const CategoryCard: React.FC<CategoryCardProps> = ({ name, count, onPress }) => {

    // Décodage des entités HTML comme &rsquo; → ’
    const decodeHtmlEntities = (str: string): string => {
        const txt = document.createElement('textarea');
        txt.innerHTML = str;
        return txt.value;
    };

    // Pour React Native (sans DOM), on utilise une version simple :
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

    const cleanName = decodeEntities(name);

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