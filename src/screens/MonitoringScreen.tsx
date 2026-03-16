// src/screens/MonitoringScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { optimizedApiService } from '../services/optimizedApiService';
import { monitoringService } from '../services/monitoringService';
import { cacheService } from '../services/cacheService';
import { circuitBreakerService } from '../services/circuitBreakerService';
import { adaptiveTimeoutService } from '../services/adaptiveTimeoutService';

const MonitoringScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState<any>(null);
  const [healthChecks, setHealthChecks] = useState<any>(null);
  const [circuitStats, setCircuitStats] = useState<any>(null);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [timeoutStats, setTimeoutStats] = useState<any>(null);

  useEffect(() => {
    loadMonitoringData();
  }, []);

  const loadMonitoringData = async () => {
    try {
      const [dash, health, circuits, cache, timeouts] = await Promise.all([
        optimizedApiService.getMonitoringDashboard(),
        optimizedApiService.performHealthChecks(),
        Promise.resolve(optimizedApiService.getCircuitBreakerStats()),
        Promise.resolve(optimizedApiService.getCacheStats()),
        Promise.resolve(optimizedApiService.getTimeoutStats()),
      ]);

      setDashboard(dash);
      setHealthChecks(health);
      setCircuitStats(circuits);
      setCacheStats(cache);
      setTimeoutStats(timeouts);
    } catch (error) {
      console.error('Error loading monitoring data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMonitoringData();
    setRefreshing(false);
  };

  const handleResetCircuit = (service: string) => {
    Alert.alert(
      'Reset Circuit Breaker',
      `Are you sure you want to reset the circuit breaker for ${service}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            circuitBreakerService.resetCircuitBreaker(service);
            loadMonitoringData();
          },
        },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear all cache?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await cacheService.clear();
            loadMonitoringData();
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'CLOSED':
        return Colors.success || '#4CAF50';
      case 'degraded':
      case 'HALF_OPEN':
        return Colors.warning || '#FF9800';
      case 'down':
      case 'OPEN':
        return Colors.error || '#F44336';
      default:
        return Colors.textSecondary;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Overview */}
        {dashboard && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Overview</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{dashboard.overview.totalRequests}</Text>
                <Text style={styles.statLabel}>Total Requests</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{formatPercentage(dashboard.overview.errorRate)}</Text>
                <Text style={styles.statLabel}>Error Rate</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{formatDuration(dashboard.overview.avgResponseTime)}</Text>
                <Text style={styles.statLabel}>Avg Response</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{dashboard.overview.servicesDown}</Text>
                <Text style={styles.statLabel}>Services Down</Text>
              </View>
            </View>
          </View>
        )}

        {/* Health Checks */}
        {healthChecks && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏥 Health Checks</Text>
            {Object.entries(healthChecks).map(([service, health]: [string, any]) => (
              <View key={service} style={styles.healthCard}>
                <View style={styles.healthHeader}>
                  <Text style={styles.serviceName}>{service.toUpperCase()}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(health.status) }]}>
                    <Text style={styles.statusText}>{health.status}</Text>
                  </View>
                </View>
                <View style={styles.healthDetails}>
                  <Text style={styles.healthDetail}>
                    Response: {formatDuration(health.responseTime)}
                  </Text>
                  <Text style={styles.healthDetail}>
                    Error Rate: {formatPercentage(health.errorRate)}
                  </Text>
                  <Text style={styles.healthDetail}>
                    Uptime: {formatPercentage(health.uptime)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Circuit Breakers */}
        {circuitStats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚡ Circuit Breakers</Text>
            {Object.entries(circuitStats).map(([service, stats]: [string, any]) => (
              <View key={service} style={styles.circuitCard}>
                <View style={styles.circuitHeader}>
                  <Text style={styles.serviceName}>{service.toUpperCase()}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(stats.state) }]}>
                    <Text style={styles.statusText}>{stats.state}</Text>
                  </View>
                </View>
                <View style={styles.circuitDetails}>
                  <Text style={styles.circuitDetail}>
                    Failures: {stats.failureCount}
                  </Text>
                  <Text style={styles.circuitDetail}>
                    Successes: {stats.successCount}
                  </Text>
                  <Text style={styles.circuitDetail}>
                    Total: {stats.totalRequests}
                  </Text>
                </View>
                {stats.state === 'OPEN' && (
                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={() => handleResetCircuit(service)}
                  >
                    <Text style={styles.resetButtonText}>Reset</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Cache Stats */}
        {cacheStats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💾 Cache Statistics</Text>
            <View style={styles.cacheCard}>
              <View style={styles.cacheRow}>
                <Text style={styles.cacheLabel}>Memory Cache:</Text>
                <Text style={styles.cacheValue}>{cacheStats.memorySize} items</Text>
              </View>
              <View style={styles.cacheRow}>
                <Text style={styles.cacheLabel}>Disk Cache:</Text>
                <Text style={styles.cacheValue}>{cacheStats.diskSize} items</Text>
              </View>
              <View style={styles.cacheRow}>
                <Text style={styles.cacheLabel}>Hit Rate:</Text>
                <Text style={styles.cacheValue}>{formatPercentage(cacheStats.hitRate)}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.clearButton} onPress={handleClearCache}>
              <Text style={styles.clearButtonText}>Clear Cache</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Timeout Stats */}
        {timeoutStats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⏱️ Timeout Performance</Text>
            {Object.entries(timeoutStats).map(([service, stats]: [string, any]) => (
              <View key={service} style={styles.timeoutCard}>
                <Text style={styles.serviceName}>{service.toUpperCase()}</Text>
                <View style={styles.timeoutDetails}>
                  <Text style={styles.timeoutDetail}>
                    Avg: {formatDuration(stats.avgResponseTime)}
                  </Text>
                  <Text style={styles.timeoutDetail}>
                    Min: {formatDuration(stats.minResponseTime)}
                  </Text>
                  <Text style={styles.timeoutDetail}>
                    Max: {formatDuration(stats.maxResponseTime)}
                  </Text>
                  <Text style={styles.timeoutDetail}>
                    Samples: {stats.sampleCount}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Recent Alerts */}
        {dashboard?.recentAlerts && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🚨 Recent Alerts</Text>
            {dashboard.recentAlerts.map((alert: any) => (
              <View key={alert.name} style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <Text style={styles.alertName}>{alert.name}</Text>
                  <View style={[
                    styles.alertBadge,
                    { backgroundColor: alert.triggered ? Colors.error : Colors.success }
                  ]}>
                    <Text style={styles.alertText}>
                      {alert.triggered ? 'ACTIVE' : 'RESOLVED'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.alertSeverity}>
                  Severity: {alert.severity}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    margin: 16,
    padding: 16,
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: Colors.card,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  healthCard: {
    backgroundColor: Colors.card,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
  },
  healthDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  healthDetail: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  circuitCard: {
    backgroundColor: Colors.card,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  circuitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  circuitDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  circuitDetail: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  resetButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  cacheCard: {
    backgroundColor: Colors.card,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  cacheRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cacheLabel: {
    fontSize: 14,
    color: Colors.text,
  },
  cacheValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  clearButton: {
    backgroundColor: Colors.warning,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  timeoutCard: {
    backgroundColor: Colors.card,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  timeoutDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  timeoutDetail: {
    fontSize: 12,
    color: Colors.textSecondary,
    width: '50%',
    marginBottom: 4,
  },
  alertCard: {
    backgroundColor: Colors.card,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  alertBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  alertText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
  },
  alertSeverity: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});

export default MonitoringScreen;
