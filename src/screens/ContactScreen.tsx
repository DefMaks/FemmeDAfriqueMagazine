import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

const ContactScreen = () => {
  const openUrl = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.warn('Impossible d\'ouvrir l\'URL:', url, error);
    }
  };

  const handleCall = (phone: string) => {
    openUrl(`tel:${phone.replace(/\s+/g, '')}`);
  };

  const handleEmail = (email: string) => {
    openUrl(`mailto:${email}?subject=Contact Femme d'Afrique Magazine`);
  };

  const handleMap = () => {
    openUrl('https://maps.app.goo.gl/aaJhrqqnZDr4y2jY6');
  };

  const handleWebsite = () => {
    openUrl('https://femmedafrique.net');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Header Banner */}
      <View style={styles.heroCard}>
        <View style={styles.iconCircle}>
          <Ionicons name="newspaper-outline" size={32} color="#FFFFFF" />
        </View>
        <Text style={styles.heroTitle}>Femme d'Afrique Magazine</Text>
        <Text style={styles.heroSubtitle}>Publication d'actualités et magazine panafricain</Text>
        <Text style={styles.heroBadge}>Édité par DefMaks</Text>
      </View>

      {/* Section 1 : Coordonnées Officielles (Exigence Google Play Actualités) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="call-outline" size={20} color={Colors.primary} />
          <Text style={styles.cardTitle}>Coordonnées de l'éditeur & Contact</Text>
        </View>
        <Text style={styles.cardDescription}>
          Conformément aux normes éditoriales et à la politique relative aux actualités, voici les coordonnées directes de notre rédaction et de l'éditeur de la publication :
        </Text>

        {/* Téléphone Éditrice */}
        <TouchableOpacity style={styles.contactItem} onPress={() => handleCall('+243810046435')} activeOpacity={0.7}>
          <View style={styles.contactIconBg}>
            <Ionicons name="phone-portrait-outline" size={20} color={Colors.primary} />
          </View>
          <View style={styles.contactTextContainer}>
            <Text style={styles.contactLabel}>Téléphone (Éditrice)</Text>
            <Text style={styles.contactValue}>+243 810 046 435</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>

        {/* Téléphone Rédaction */}
        <TouchableOpacity style={styles.contactItem} onPress={() => handleCall('+243850758190')} activeOpacity={0.7}>
          <View style={styles.contactIconBg}>
            <Ionicons name="call-outline" size={20} color={Colors.primary} />
          </View>
          <View style={styles.contactTextContainer}>
            <Text style={styles.contactLabel}>Téléphone (Rédaction)</Text>
            <Text style={styles.contactValue}>+243 850 758 190</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>

        {/* Courriel général */}
        <TouchableOpacity style={styles.contactItem} onPress={() => handleEmail('contact@femmedafrique.net')} activeOpacity={0.7}>
          <View style={styles.contactIconBg}>
            <Ionicons name="mail-outline" size={20} color={Colors.primary} />
          </View>
          <View style={styles.contactTextContainer}>
            <Text style={styles.contactLabel}>Courriel général</Text>
            <Text style={styles.contactValue}>contact@femmedafrique.net</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>

        {/* Courriel Rédaction / Magazine */}
        <TouchableOpacity style={styles.contactItem} onPress={() => handleEmail('magazine@femmedafrique.net')} activeOpacity={0.7}>
          <View style={styles.contactIconBg}>
            <Ionicons name="paper-plane-outline" size={20} color={Colors.primary} />
          </View>
          <View style={styles.contactTextContainer}>
            <Text style={styles.contactLabel}>Courriel Rédaction</Text>
            <Text style={styles.contactValue}>magazine@femmedafrique.net</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>

        {/* Adresse Physique */}
        <TouchableOpacity style={styles.contactItem} onPress={handleMap} activeOpacity={0.7}>
          <View style={styles.contactIconBg}>
            <Ionicons name="location-outline" size={20} color={Colors.primary} />
          </View>
          <View style={styles.contactTextContainer}>
            <Text style={styles.contactLabel}>Siège social & Rédaction</Text>
            <Text style={styles.contactValue}>Avenue Lokele N°16, Q/Commerçant C/Gombe, Kinshasa, RDC</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>

        {/* Site Web Officiel */}
        <TouchableOpacity style={styles.contactItem} onPress={handleWebsite} activeOpacity={0.7}>
          <View style={styles.contactIconBg}>
            <Ionicons name="globe-outline" size={20} color={Colors.primary} />
          </View>
          <View style={styles.contactTextContainer}>
            <Text style={styles.contactLabel}>Site Web officiel d'actualités</Text>
            <Text style={styles.contactValue}>https://femmedafrique.net</Text>
          </View>
          <Ionicons name="open-outline" size={18} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Section 2 : Équipe de Rédaction & Direction */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="people-outline" size={20} color={Colors.primary} />
          <Text style={styles.cardTitle}>Direction & Équipe Éditoriale</Text>
        </View>

        <View style={styles.teamMember}>
          <Text style={styles.memberRole}>Éditrice</Text>
          <Text style={styles.memberName}>Christelle MPONGO</Text>
          <Text style={styles.memberEmail}>christelle@femmedafrique.net</Text>
        </View>

        <View style={styles.teamDivider} />

        <View style={styles.teamMember}>
          <Text style={styles.memberRole}>Directeur de Publication</Text>
          <Text style={styles.memberName}>Alain Diasso</Text>
          <Text style={styles.memberEmail}>alaindassio@gmail.com</Text>
        </View>

        <View style={styles.teamDivider} />

        <View style={styles.teamMember}>
          <Text style={styles.memberRole}>Secrétariat de Rédaction</Text>
          <Text style={styles.memberName}>Alain Prince Eale</Text>
          <Text style={styles.memberEmail}>ealealainprince@gmail.com</Text>
        </View>

        <View style={styles.teamDivider} />

        <View style={styles.teamMember}>
          <Text style={styles.memberRole}>Éditeur Technique & Développement</Text>
          <Text style={styles.memberName}>DefMaks</Text>
          <Text style={styles.memberEmail}>support@defmaks.com — https://defmaks.com</Text>
        </View>
      </View>

      {/* Section 3 : Déontologie, Droit de réponse et Réclamations */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="shield-checkmark-outline" size={20} color={Colors.primary} />
          <Text style={styles.cardTitle}>Déontologie & Droit de réponse</Text>
        </View>
        <Text style={styles.legalText}>
          Femme d'Afrique Magazine respecte la charte de déontologie journalistique et le droit à l'information. Tout article publié fait l'objet d'une vérification des sources et mentionne ses auteurs.
        </Text>
        <Text style={[styles.legalText, { marginTop: 8 }]}>
          Pour toute demande de droit de réponse, de rectification ou réclamation concernant un contenu diffusé, vous pouvez vous adresser directement à la direction de la publication par courriel à <Text style={{ fontWeight: 'bold' }}>contact@femmedafrique.net</Text> ou par courrier à l'adresse de la rédaction.
        </Text>
      </View>

      {/* Footer information */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Femme d'Afrique Magazine • Tous droits réservés</Text>
        <Text style={styles.footerText}>Kinshasa, République Démocratique du Congo</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    textAlign: 'center',
  },
  heroBadge: {
    fontSize: 11,
    color: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    fontWeight: '600',
  },
  card: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  cardDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderLight,
  },
  contactIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(169, 63, 85, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactTextContainer: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  contactValue: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '700',
    marginTop: 2,
  },
  teamMember: {
    paddingVertical: 8,
  },
  memberRole: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 2,
  },
  memberEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  teamDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.borderLight,
    marginVertical: 4,
  },
  legalText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  footer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

export default ContactScreen;

