// src/screens/AuthScreen.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { profileService } from '../services/profileService';
import { sessionService } from '../services/sessionService';
import { analyticsService } from '../services/analytics.simple';

type AuthMode = 'login' | 'register';

const AuthScreen = ({ navigation }: any) => {
    const [mode, setMode] = useState<AuthMode>('login');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('⚠️ Erreur', 'Veuillez remplir tous les champs');
            return;
        }

        setIsLoading(true);
        try {
            // Authentifier via le service de profil
            await profileService.login({ email, password });

            // Créer une session
            await sessionService.createSession();

            // Analytics tracking
            await analyticsService.trackAuth('login_success', email);

            Alert.alert('✅ Connexion réussie', 'Bienvenue !');
            navigation.goBack();

        } catch (error: any) {
            await analyticsService.trackAuth('login_failed', email);
            Alert.alert('❌ Erreur', error.message || 'Identifiants incorrects');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async () => {
        if (!username || !email || !password) {
            Alert.alert('⚠️ Erreur', 'Veuillez remplir tous les champs');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('⚠️ Erreur', 'Les mots de passe ne correspondent pas');
            return;
        }

        if (password.length < 6) {
            Alert.alert('⚠️ Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
            return;
        }

        setIsLoading(true);
        try {
            // Créer le profil
            const profile = await profileService.createProfile(username, email, password);

            // Créer une session avec le user_id
            await sessionService.createSession(profile.id);

            // Analytics tracking
            await analyticsService.trackAuth('signup', username);

            Alert.alert('✅ Compte créé', 'Votre compte a été créé avec succès !');
            navigation.goBack();

        } catch (error: any) {
            await analyticsService.trackAuth('login_failed', username);
            Alert.alert('❌ Erreur', error.message || 'Impossible de créer le compte');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = () => {
        if (mode === 'login') {
            handleLogin();
        } else {
            handleRegister();
        }
    };

    const toggleMode = () => {
        setMode(mode === 'login' ? 'register' : 'login');
        // Reset form
        setUsername('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.header}>
                    <Ionicons
                        name="person-circle-outline"
                        size={80}
                        color={Colors.primary}
                    />
                    <Text style={styles.title}>
                        {mode === 'login' ? 'Connexion' : 'Créer un compte'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {mode === 'login'
                            ? 'Accédez à votre profil personnalisé'
                            : 'Rejoignez la communauté FDA'
                        }
                    </Text>
                </View>

                <View style={styles.form}>
                    {/* Champ Email - toujours affiché */}
                    <View style={styles.inputGroup}>
                        <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} />
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    {/* Champ Username - seulement en mode register */}
                    {mode === 'register' && (
                        <View style={styles.inputGroup}>
                            <Ionicons name="person-outline" size={20} color={Colors.textSecondary} />
                            <TextInput
                                style={styles.input}
                                placeholder="Nom d'utilisateur"
                                value={username}
                                onChangeText={setUsername}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>
                    )}

                    <View style={styles.inputGroup}>
                        <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} />
                        <TextInput
                            style={styles.input}
                            placeholder="Mot de passe"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity
                            onPress={() => setShowPassword(!showPassword)}
                            style={styles.eyeIcon}
                        >
                            <Ionicons
                                name={showPassword ? "eye-off-outline" : "eye-outline"}
                                size={20}
                                color={Colors.textSecondary}
                            />
                        </TouchableOpacity>
                    </View>

                    {mode === 'register' && (
                        <View style={styles.inputGroup}>
                            <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} />
                            <TextInput
                                style={styles.input}
                                placeholder="Confirmer le mot de passe"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showConfirmPassword}
                            />
                            <TouchableOpacity
                                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                style={styles.eyeIcon}
                            >
                                <Ionicons
                                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                                    size={20}
                                    color={Colors.textSecondary}
                                />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, isLoading && styles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={isLoading}
                >
                    <Text style={styles.submitButtonText}>
                        {isLoading
                            ? 'Chargement...'
                            : (mode === 'login' ? 'Se connecter' : 'Créer le compte')
                        }
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.toggleButton} onPress={toggleMode}>
                    <Text style={styles.toggleButtonText}>
                        {mode === 'login'
                            ? 'Pas encore de compte ? Créer un compte'
                            : 'Déjà un compte ? Se connecter'
                        }
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: Colors.text,
        marginTop: 20,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginTop: 8,
    },
    form: {
        marginBottom: 30,
    },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.backgroundLight,
        borderRadius: 12,
        paddingHorizontal: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    input: {
        flex: 1,
        padding: 15,
        fontSize: 16,
        color: Colors.text,
    },
    eyeIcon: {
        padding: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitButton: {
        backgroundColor: Colors.primary,
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 20,
    },
    disabledButton: {
        backgroundColor: Colors.textSecondary,
    },
    submitButtonText: {
        color: Colors.backgroundLight,
        fontSize: 18,
        fontWeight: 'bold',
    },
    toggleButton: {
        alignItems: 'center',
    },
    toggleButtonText: {
        color: Colors.primary,
        fontSize: 16,
    },
});

export default AuthScreen;
