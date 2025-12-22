// src/components/AdsSlider.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Image,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    FlatList,
    Linking,
    Platform,
} from 'react-native';
import { Advertisement, trackAdView, trackAdClick } from '../services/adsService';

const { width: screenWidth } = Dimensions.get('window');
const AD_WIDTH = screenWidth - 32;
const AD_HEIGHT = (AD_WIDTH * 406) / 1300; // Ratio 1300x406

interface AdsSliderProps {
    ads: Advertisement[];
    zone?: string;
}

export const AdsSlider: React.FC<AdsSliderProps> = ({ ads, zone = 'home' }) => {
    const flatListRef = useRef<FlatList>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const autoplayRef = useRef<NodeJS.Timeout | null>(null);
    const viewedAds = useRef<Set<number>>(new Set());

    // Autoplay
    useEffect(() => {
        if (ads.length <= 1) return;

        autoplayRef.current = setInterval(() => {
            setCurrentIndex(prev => {
                const nextIndex = (prev + 1) % ads.length;
                flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
                return nextIndex;
            });
        }, 5000); // Changement toutes les 5 secondes

        return () => {
            if (autoplayRef.current) {
                clearInterval(autoplayRef.current);
            }
        };
    }, [ads.length]);

    // Track view quand une pub devient visible
    useEffect(() => {
        if (ads[currentIndex] && !viewedAds.current.has(ads[currentIndex].id)) {
            viewedAds.current.add(ads[currentIndex].id);
            trackAdView(ads[currentIndex].id, zone);
        }
    }, [currentIndex, ads, zone]);

    const handleAdPress = async (ad: Advertisement) => {
        // Track le clic
        await trackAdClick(ad.id, zone);
        
        // Ouvrir le lien
        const link = ad.external_link || ad.inner_link;
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

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index || 0);
        }
    }).current;

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50,
    }).current;

    if (ads.length === 0) return null;

    const renderAd = ({ item }: { item: Advertisement }) => (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => handleAdPress(item)}
            style={styles.adContainer}
        >
            <Image
                source={{ uri: item.image_url }}
                style={styles.adImage}
                resizeMode="cover"
            />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={ads}
                renderItem={renderAd}
                keyExtractor={(item) => `ad_${item.id}`}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                getItemLayout={(data, index) => ({
                    length: AD_WIDTH + 16,
                    offset: (AD_WIDTH + 16) * index,
                    index,
                })}
                snapToInterval={AD_WIDTH + 16}
                decelerationRate="fast"
                contentContainerStyle={styles.listContent}
            />
            
            {/* Indicateurs de pagination */}
            {ads.length > 1 && (
                <View style={styles.pagination}>
                    {ads.map((_, index) => (
                        <View
                            key={`dot_${index}`}
                            style={[
                                styles.dot,
                                index === currentIndex && styles.dotActive,
                            ]}
                        />
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 16,
    },
    listContent: {
        paddingHorizontal: 16,
    },
    adContainer: {
        width: AD_WIDTH,
        height: AD_HEIGHT,
        marginRight: 16,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    adImage: {
        width: '100%',
        height: '100%',
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ccc',
        marginHorizontal: 4,
    },
    dotActive: {
        backgroundColor: '#333',
        width: 24,
    },
});

export default AdsSlider;
