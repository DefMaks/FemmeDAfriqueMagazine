import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

// Import des écrans avec données réelles
import HomeScreen from './src/screens/HomeScreen.data';
import DiscoverScreen from './src/screens/DiscoverScreen.data';
import SavedScreen from './src/screens/SavedScreen.simple';
import ShopScreen from './src/screens/ShopScreen.simple';
import ProfileScreen from './src/screens/ProfileScreen.simple';

// Import des services (sans initialisation)
import {
  SUPABASE_CONFIG,
  WORDPRESS_CONFIG,
  ONESIGNAL_CONFIG,
  FIREBASE_CONFIG
} from './src/config/env';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
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
        tabBarActiveTintColor: '#A93F55',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
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
      <Tab.Screen name="Accueil" component={HomeScreen} />
      <Tab.Screen name="Découvrir" component={DiscoverScreen} />
      <Tab.Screen
        name="Boutique"
        component={ShopScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Ionicons name={focused ? 'bag' : 'bag-outline'} size={26} color="#FFFFFF" />
          ),
          tabBarLabel: 'Boutique',
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
                backgroundColor: '#A93F55',
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
              }}>
              <Ionicons name="bag" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          ),
        }}
      />
      <Tab.Screen name="Favoris" component={SavedScreen} />
      <Tab.Screen name="Profil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    // Log de vérification des variables d'environnement
    console.log('🔍 Vérification des variables d\'environnement:');
    console.log('Supabase URL:', SUPABASE_CONFIG.url ? '✅ Configuré' : '❌ Manquant');
    console.log('WordPress API:', WORDPRESS_CONFIG.apiUrl ? '✅ Configuré' : '❌ Manquant');
    console.log('OneSignal App ID:', ONESIGNAL_CONFIG.appId ? '✅ Configuré' : '❌ Manquant');
    console.log('Firebase Project ID:', FIREBASE_CONFIG.projectId ? '✅ Configuré' : '❌ Manquant');
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={MainTabs} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#A93F55',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});
