import React, { useState, useRef } from 'react';
import {
  View,
  Image,
  ImageProps,
  StyleSheet,
  Animated,
  StyleProp,
  ImageStyle,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { SkeletonBox } from './PageSkeletons';

interface AppImageProps extends Omit<ImageProps, 'style'> {
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  dark?: boolean;
  borderRadius?: number;
}

export const AppImage: React.FC<AppImageProps> = ({
  source,
  style,
  containerStyle,
  fallbackIcon = 'image-outline',
  dark = false,
  borderRadius,
  resizeMode = 'cover',
  ...props
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const flattenedStyle = StyleSheet.flatten(style) || {};
  const width = flattenedStyle.width || '100%';
  const height = flattenedStyle.height || '100%';
  const resolvedBorderRadius =
    borderRadius !== undefined
      ? borderRadius
      : (flattenedStyle.borderRadius as number) || 0;

  const handleLoad = () => {
    setLoading(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  const hasUri = Boolean(source && typeof source === 'object' && 'uri' in source && (source as any).uri);

  if (!hasUri || error) {
    return (
      <View
        style={[
          styles.placeholder,
          {
            width,
            height,
            borderRadius: resolvedBorderRadius,
            backgroundColor: dark ? '#222222' : '#F0F0F0',
          },
          containerStyle,
        ]}
      >
        <Ionicons
          name={fallbackIcon}
          size={24}
          color={dark ? '#555555' : Colors.textLight}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.wrapper,
        {
          width,
          height,
          borderRadius: resolvedBorderRadius,
        },
        containerStyle,
      ]}
    >
      {loading && (
        <View style={StyleSheet.absoluteFill}>
          <SkeletonBox
            width={width}
            height={height}
            borderRadius={resolvedBorderRadius}
            style={dark ? styles.darkSkeleton : undefined}
          />
        </View>
      )}
      <Animated.Image
        {...props}
        source={source}
        style={[
          style,
          {
            opacity: fadeAnim,
            borderRadius: resolvedBorderRadius,
          },
        ]}
        resizeMode={resizeMode}
        onLoad={handleLoad}
        onError={handleError}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    position: 'relative',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkSkeleton: {
    backgroundColor: '#2A2A2A',
  },
});

