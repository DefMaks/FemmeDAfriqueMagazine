// src/navigation/RootNavigator.tsx
import React, { useEffect } from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
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
import AllArticlesScreen from '../screens/AllArticlesScreen';
import DebugScreen from '../screens/DebugScreen';
import AuthScreen from '../screens/AuthScreen';
import { Colors } from '../theme/colors';
import { Post } from '../models/Post';
import { Magazine } from '../models/Magazine';
import { Text, TouchableOpacity } from 'react-native';
import { analyticsService } from '../services/analytics.simple';

export type RootStackParamList = {
    Main: undefined;
    AuthScreen: undefined;
    Checkout: { magazine: Magazine };
    ArticleDetail: { article: Post };
    AllArticles: undefined;
    CategoryArticles: { categoryId: number; categoryName: string; isTag?: boolean; fromArticle?: boolean };
    Debug: undefined;
};

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator<RootStackParamList>();

function MainTabs() {
    useEffect(() => {
        // Tracker la vue de l'écran principal au chargement
        analyticsService.trackScreenView('MainTabs');
    }, []);

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName = 'ellipse';
                    if (route.name === 'Accueil') iconName = focused ? 'home' : 'home-outline';
                    else if (route.name === 'Découvrir') iconName = focused ? 'search' : 'search-outline';
                    else if (route.name === 'Favoris') iconName = focused ? 'bookmark' : 'bookmark-outline';
                    else if (route.name === 'Profil') iconName = focused ? 'person' : 'person-outline';
                    return <Ionicons name={iconName as any} size={size} color={color} />;
                },
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.textLight,
                tabBarStyle: {
                    backgroundColor: Colors.backgroundLight,
                    borderTopColor: Colors.border,
                    borderTopWidth: 1,
                    paddingBottom: 8,
                    paddingTop: 8,
                    height: 70,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                },
                headerShown: false,
            })}
        >
            <Tab.Screen
                name="Accueil"
                component={HomeScreen}
                listeners={{
                    focus: () => analyticsService.trackScreenView('Accueil'),
                }}
            />
            <Tab.Screen
                name="Découvrir"
                component={DiscoverScreen}
                listeners={{
                    focus: () => analyticsService.trackScreenView('Découvrir'),
                }}
            />
            <Tab.Screen
                name="Boutique"
                component={ShopScreen}
                options={{
                    tabBarIcon: ({ focused }) => (
                        <>
                            <Ionicons
                                name={focused ? 'bag' : 'bag-outline'}
                                size={26}
                                color="#FFFFFF"
                            />
                            <Text>Boutique</Text>
                        </>
                    ),
                    tabBarLabel: ({ focused }) => (
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF', marginTop: 4 }}>
                            Boutique
                        </Text>
                    ),
                    tabBarButton: (props) => (
                        <TouchableOpacity
                            onPress={props.onPress}
                            accessibilityLabel={props.accessibilityLabel}
                            accessibilityRole={props.accessibilityRole}
                            accessibilityState={props.accessibilityState}
                            testID={props.testID}
                            style={{
                                top: -35,
                                marginBottom: -15,
                                backgroundColor: Colors.primary,
                                borderRadius: 35,
                                width: 70,
                                height: 70,
                                justifyContent: 'center',
                                alignItems: 'center',
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.25,
                                shadowRadius: 6,
                                elevation: 6,
                                marginHorizontal: 10
                            }}
                        >
                            <Ionicons name="bag" size={26} color="#FFFFFF" />
                        </TouchableOpacity>
                    ),
                }}
                listeners={{
                    focus: () => analyticsService.trackScreenView('Boutique'),
                }}
            />
            <Tab.Screen
                name="Favoris"
                component={SavedScreen}
                listeners={{
                    focus: () => analyticsService.trackScreenView('Favoris'),
                }}
            />
            <Tab.Screen
                name="Profil"
                component={ProfileScreen}
                listeners={{
                    focus: () => analyticsService.trackScreenView('Profil'),
                }}
            />
        </Tab.Navigator>
    );
}

const linking: LinkingOptions<RootStackParamList> = {
    prefixes: [
        'femmedafrique://',
        'https://femmedafrique.net',
        'http://femmedafrique.net',
    ],
    config: {
        screens: {
            Main: {
                screens: {
                    Accueil: '',
                    'Découvrir': 'decouvrir',
                    Boutique: 'boutique',
                    Favoris: 'favoris',
                    Profil: 'profil',
                },
            },
            ArticleDetail: 'article/:id',
            AllArticles: 'articles',
            CategoryArticles: 'categorie/:categoryId',
            AuthScreen: 'connexion',
            Checkout: 'checkout',
            Debug: 'debug',
        },
    },
};

export default function RootNavigator() {
    return (
        <NavigationContainer linking={linking}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Main" component={MainTabs} />
                <Stack.Screen
                    name="AuthScreen"
                    component={AuthScreen}
                    options={{
                        headerShown: true,
                        title: 'Connexion',
                        headerStyle: { backgroundColor: Colors.primary },
                        headerTintColor: '#FFFFFF',
                    }}
                />
                <Stack.Screen
                    name="ArticleDetail"
                    component={ArticleDetailScreen}
                    listeners={{
                        focus: (e: any) => {
                            const article = e.route?.params?.article;
                            if (article) {
                                analyticsService.trackScreenView('ArticleDetail');
                                // Tracker l'événement article_viewed personnalisé
                                analyticsService.trackArticleViewed(
                                    article.title?.rendered || 'Article sans titre',
                                    undefined, // Catégorie - peut être ajoutée plus tard
                                    article.id
                                );
                            }
                        },
                    }}
                />
                <Stack.Screen
                    name="Checkout"
                    component={CheckoutScreen}
                    listeners={{
                        focus: () => analyticsService.trackScreenView('Checkout'),
                    }}
                />
                <Stack.Screen
                    name="AllArticles"
                    component={AllArticlesScreen}
                    listeners={{
                        focus: () => analyticsService.trackScreenView('AllArticles'),
                    }}
                />
                <Stack.Screen
                    name="CategoryArticles"
                    component={DiscoverScreen}
                    listeners={{
                        focus: (e: any) => {
                            const params = e.route?.params;
                            const categoryName = params?.categoryName || 'Catégorie';
                            const isTag = params?.isTag || false;
                            analyticsService.trackScreenView(`${isTag ? 'Tag' : 'Category'}_${categoryName}`);
                        },
                    }}
                />
                <Stack.Screen
                    name="Debug"
                    component={DebugScreen}
                    options={{
                        headerShown: true,
                        title: 'Debug Logs',
                        headerStyle: { backgroundColor: Colors.primary },
                        headerTintColor: '#FFFFFF',
                    }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
