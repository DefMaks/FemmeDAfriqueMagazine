// src/components/KubaBackground.tsx
import React from 'react';
import { ImageBackground, StyleSheet, View, ViewProps } from 'react-native';
import { Colors } from '../theme/colors';

interface KubaBackgroundProps extends ViewProps {
    children?: React.ReactNode;
    opacity?: number;
}

const KubaBackground: React.FC<KubaBackgroundProps> = ({
    children,
    opacity = 0.06,
    style,
    ...rest
}) => {
    return (
        <View style={[styles.container, style]} {...rest}>
            <ImageBackground
                source={require('../../assets/patterns/kuba-pattern.png')} // ou .svg si supporté
                style={[StyleSheet.absoluteFill, { opacity }]}
                resizeMode="repeat"
            />
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background, // ou Colors.primaryLight si tu veux un fond coloré
    },
});

export default KubaBackground;