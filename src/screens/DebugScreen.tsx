import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Colors } from '../theme/colors';
import { logger } from '../utils/logger';
import { updateService, UpdateInfo } from '../services/updateService';
import { APP_CONFIG } from '../config/env';

const DebugScreen = () => {
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>(() => updateService.getUpdateInfo());

  const loadLogs = async () => {
    try {
      setLoading(true);
      const formattedLogs = await logger.formatErrorLogs();
      setLogs(formattedLogs);
      setUpdateInfo(updateService.getUpdateInfo());
    } catch (error) {
      console.error('Erreur chargement logs:', error);
      setLogs('Impossible de charger les logs');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckUpdate = async () => {
    try {
      setCheckingUpdate(true);
      await updateService.checkManually();
      setUpdateInfo(updateService.getUpdateInfo());
    } finally {
      setCheckingUpdate(false);
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

  useEffect(() => {
    loadLogs();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Section État OTA & Environnement */}
      <View style={styles.otaCard}>
        <Text style={styles.sectionTitle}>État OTA & Système</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>OTA Activé :</Text>
          <Text style={[styles.infoValue, { color: updateInfo.isEnabled ? '#2E7D32' : '#C62828' }]}>
            {updateInfo.isEnabled ? 'Oui' : 'Non (Mode Dev/Test)'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Canal (Channel) :</Text>
          <Text style={styles.infoValue}>{updateInfo.channel || 'non défini'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Runtime Version :</Text>
          <Text style={styles.infoValue}>{updateInfo.runtimeVersion || 'appVersion (2.0.0)'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Update ID :</Text>
          <Text style={[styles.infoValue, styles.monoText]}>
            {updateInfo.updateId ? updateInfo.updateId.slice(0, 16) + '...' : 'binaire initial'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Mode :</Text>
          <Text style={styles.infoValue}>{APP_CONFIG.isProd ? 'Production' : 'Test / Développement'}</Text>
        </View>

        <TouchableOpacity
          style={[styles.updateButton, checkingUpdate && styles.buttonDisabled]}
          disabled={checkingUpdate}
          onPress={handleCheckUpdate}
        >
          {checkingUpdate ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.updateButtonText}>Vérifier les mises à jour (OTA)</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Entête Logs */}
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Logs d'Erreur & Événements</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={clearLogs}>
            <Text style={styles.buttonText}>Effacer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.refreshButton]} onPress={loadLogs}>
            <Text style={styles.buttonText}>Rafraîchir</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.logsContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.logsText}>{logs || 'Aucun log d\'erreur enregistré.'}</Text>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Femme d'Afrique Magazine v2.0.0 — EAS Update Ready
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  otaCard: {
    margin: 16,
    padding: 16,
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600',
  },
  monoText: {
    fontFamily: 'monospace',
    fontSize: 11,
  },
  updateButton: {
    marginTop: 12,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  refreshButton: {
    backgroundColor: Colors.primary,
  },
  clearButton: {
    backgroundColor: Colors.error,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 11,
  },
  logsContainer: {
    flex: 1,
    padding: 16,
  },
  logsText: {
    fontSize: 11,
    color: Colors.text,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  footer: {
    padding: 12,
    backgroundColor: Colors.backgroundLight,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerText: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default DebugScreen;
