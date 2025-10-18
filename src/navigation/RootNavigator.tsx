import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import SavedScreen from '../screens/SavedScreen';
import ShopScreen from '../screens/ShopScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import ArticleDetailScreen from '../screens/ArticleDetailScreen';
import { Colors } from '../theme/colors';
import { Post } from '../models/Post';
import { Magazine } from '../models/Magazine';

export type RootStackParamList = {
  Main: undefined;
  Checkout: { magazine: Magazine };
  ArticleDetail: { article: Post };
};

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator<RootStackParamList>();

function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName = 'ellipse';
                    let iconSize = size;
                    if (route.name === 'Accueil') iconName = focused ? 'home' : 'home-outline';
                    else if (route.name === 'Découvrir') iconName = focused ? 'search' : 'search-outline';
                    else if (route.name === 'Sauvegardés') iconName = focused ? 'bookmark' : 'bookmark-outline';
                    else if (route.name === 'Boutique') {
                        iconName = focused ? 'cart' : 'cart-outline';
                        iconSize = size + 4;
                    }
                    else if (route.name === 'Profil') iconName = focused ? 'person' : 'person-outline';
                    return <Ionicons name={iconName as any} size={iconSize} color={color} />;
                },
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.textLight,
                tabBarStyle: {
                    backgroundColor: Colors.backgroundLight,
                    borderTopColor: Colors.border,
                    borderTopWidth: 1,
                    paddingBottom: 8,
                    paddingTop: 8,
                    height: 65,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                },
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
                <Stack.Screen name="ArticleDetail" component={ArticleDetailScreen} />
                <Stack.Screen name="Checkout" component={CheckoutScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
