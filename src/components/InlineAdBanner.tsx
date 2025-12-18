// src/components/InlineAdBanner.tsx
import React from 'react';
import {
    View,
    Image,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Linking,
    Platform,
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
const AD_WIDTH = screenWidth - 32;
const AD_HEIGHT = (AD_WIDTH * 406) / 1300; // Ratio 1300x406

export interface AppAd {
    id: number;
    title: { rendered: string };
    link?: string;
    acf?: {
        titre?: string;
        lien_externe?: string;
        lien_interne?: string;
    };
    better_featured_image?: {
        source_url: string;
    };
    dmks_featured_image?: {
        src: string;
        sizes?: {
            large?: { url: string };
            medium_large?: { url: string };
        };
    };
}

interface InlineAdBannerProps {
    ad: AppAd;
    onPress?: () => void;
}

export const InlineAdBanner: React.FC<InlineAdBannerProps> = ({ ad, onPress }) => {
    const getImageUrl = (): string | null => {
        return ad.better_featured_image?.source_url 
            || ad.dmks_featured_image?.src
            || ad.dmks_featured_image?.sizes?.large?.url
            || null;
    };

    const handlePress = async () => {
        if (onPress) {
            onPress();
            return;
        }

        const link = ad.acf?.lien_externe || ad.acf?.lien_interne || ad.link;
        if (link) {
            try {
                const supported = await Linking.canOpenURL(link);
                if (supported) {
                    await Linking.openURL(link);
                }
            } catch (error) {
                console.error('Erreur ouverture lien pub:', error);
            }
        }
    };

    const imageUrl = getImageUrl();
    if (!imageUrl) return null;

    return (
        <TouchableOpacity
            style={styles.container}
            activeOpacity={0.9}
            onPress={handlePress}
        >
            <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                resizeMode="cover"
            />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginVertical: 12,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 6,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    image: {
        width: AD_WIDTH,
        height: AD_HEIGHT,
    },
});

export default InlineAdBanner;
