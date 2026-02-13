import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Colors } from '../theme/colors';
import { logger } from '../utils/logger';

const DebugScreen = () => {
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const formattedLogs = await logger.formatErrorLogs();
      setLogs(formattedLogs);
    } catch (error) {
      console.error('Erreur chargement logs:', error);
      setLogs('❌ Impossible de charger les logs');
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    Alert.alert(
      'Effacer les logs',
      'Voulez-vous effacer tous les logs d\'erreur ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer',
          style: 'destructive',
          onPress: async () => {
            await logger.clearLogs();
            await loadLogs();
          },
        },
      ]
    );
  };

  const shareLogs = async () => {
    try {
      // Simuler le partage - dans une vraie app, on utiliserait Share
      Alert.alert(
        'Partager les logs',
        'Les logs seraient partagés avec le support technique',
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error) {
      console.error('Erreur partage logs:', error);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Chargement des logs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔍 Logs d'Erreur</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.button, styles.shareButton]} onPress={shareLogs}>
            <Text style={styles.buttonText}>📤 Partager</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={clearLogs}>
            <Text style={styles.buttonText}>🗑️ Effacer</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.logsContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.logsText}>{logs}</Text>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Ces logs aident à identifier les problèmes de l'application
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 20,
    backgroundColor: Colors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  shareButton: {
    backgroundColor: Colors.primary,
  },
  clearButton: {
    backgroundColor: Colors.error,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  logsContainer: {
    flex: 1,
    padding: 20,
  },
  logsText: {
    fontSize: 12,
    color: Colors.text,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    backgroundColor: Colors.backgroundLight,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default DebugScreen;
