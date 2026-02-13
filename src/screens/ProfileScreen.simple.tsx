import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../theme/colors';

const ProfileScreen = () => {
  const [notifications, setNotifications] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);
  const navigation = useNavigation();

  const handleMenuPress = (item: any) => {
    console.log('Menu sélectionné:', item.title);

    if (item.id === 6) {
      // Naviguer vers l'écran de debug
      navigation.navigate('Debug' as never);
    }
  };
  { id: 1, title: 'Mes achats', icon: '🛍️', subtitle: 'Historique d\'achats' },
  { id: 2, title: 'Paramètres', icon: '⚙️', subtitle: 'Préférences de l\'application' },
  { id: 3, title: 'À propos', icon: 'ℹ️', subtitle: 'Informations sur Femme D\'Afrique' },
  { id: 4, title: 'Contact', icon: '📧', subtitle: 'Nous contacter' },
  { id: 5, title: 'Partager l\'app', icon: '📤', subtitle: 'Inviter des amies' },
  { id: 6, title: '🔍 Logs d\'erreur', icon: '📊', subtitle: 'Voir les logs de débogage' },
  ];

return (
  <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
    {/* Header */}
    <View style={styles.header}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>FA</Text>
      </View>
      <Text style={styles.userName}>Utilisatrice</Text>
      <Text style={styles.userEmail}>user@femmedafrique.net</Text>
    </View>

    {/* Stats */}
    <View style={styles.statsSection}>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>12</Text>
        <Text style={styles.statLabel}>Articles lus</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>3</Text>
        <Text style={styles.statLabel}>Favoris</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>2</Text>
        <Text style={styles.statLabel}>Achats</Text>
      </View>
    </View>

    {/* Settings */}
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Préférences</Text>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Notifications</Text>
          <Text style={styles.settingSubtitle}>Recevoir les nouveautés</Text>
        </View>
        <Switch
          value={notifications}
          onValueChange={setNotifications}
          trackColor={{ false: Colors.border, true: Colors.primary }}
        />
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Mode sombre</Text>
          <Text style={styles.settingSubtitle}>Interface sombre</Text>
        </View>
        <Switch
          value={darkMode}
          onValueChange={setDarkMode}
          trackColor={{ false: Colors.border, true: Colors.primary }}
        />
      </View>
    </View>

    {/* Menu */}
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: Colors.border, true: Colors.primary }}
          />
        </View >

  <View style={styles.settingItem}>
    <View style={styles.settingInfo}>
      <Text style={styles.settingTitle}>Mode sombre</Text>
      <Text style={styles.settingSubtitle}>Interface sombre</Text>
      <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
    </View>
    <Text style={styles.arrow}>›</Text>
  </TouchableOpacity>
      ))}
    </View >

  {/* Logout Button */ }
  < View style = { styles.section } >
    <TouchableOpacity style={styles.logoutButton}>
      <Text style={styles.logoutText}>Se déconnecter</Text>
    </TouchableOpacity>
    </View >
  </ScrollView >
);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: Colors.backgroundLight,
    margin: 20,
    borderRadius: 12,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  iconText: {
    fontSize: 20,
  },
  menuInfo: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  arrow: {
    fontSize: 20,
    color: Colors.textLight,
  },
  logoutButton: {
    backgroundColor: Colors.error,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ProfileScreen;
