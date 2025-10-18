// src/navigation/RootNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

// Importe uniquement les écrans existants
import HomeScreen from '../screens/HomeScreen';
import ShopScreen from '../screens/ShopScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import { Colors } from '../theme/colors';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Écrans temporaires (tu les remplaceras plus tard)
const DiscoverScreen = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Découvrir (à venir)</Text>
    </View>
);

const SavedScreen = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Sauvegardés (à venir)</Text>
    </View>
);

const ProfileScreen = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Profil (à venir)</Text>
    </View>
);

function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName = 'ellipse';
                    if (route.name === 'Accueil') iconName = focused ? 'home' : 'home-outline';
                    else if (route.name === 'Découvrir') iconName = focused ? 'search' : 'search-outline';
                    else if (route.name === 'Sauvegardés') iconName = focused ? 'bookmark' : 'bookmark-outline';
                    else if (route.name === 'Boutique') iconName = focused ? 'cart' : 'cart-outline';
                    else if (route.name === 'Profil') iconName = focused ? 'person' : 'person-outline';
                    return <Ionicons name={iconName as any} size={size} color={color} />;
                },
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: 'gray',
                headerShown: false,
            })}
        >
            <Tab.Screen name="Accueil" component={HomeScreen} />
            <Tab.Screen name="Découvrir" component={DiscoverScreen} />
            <Tab.Screen name="Sauvegardés" component={SavedScreen} />
            <Tab.Screen name="Boutique" component={ShopScreen} />
            <Tab.Screen name="Profil" component={ProfileScreen} />
        </Tab.Navigator>
    );
}

export default function RootNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Main" component={MainTabs} />
                <Stack.Screen name="Checkout" component={CheckoutScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}