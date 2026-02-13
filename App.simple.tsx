import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' }}>
        <Text style={{ fontSize: 24, color: '#A93F55', marginBottom: 20 }}>
          Femme D'Afrique Magazine
        </Text>
        <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center', paddingHorizontal: 40 }}>
          Application chargée avec succès !
        </Text>
        <Text style={{ fontSize: 14, color: '#9CA3AF', marginTop: 20 }}>
          Version de test simplifiée
        </Text>
      </View>
    </SafeAreaProvider>
  );
}
