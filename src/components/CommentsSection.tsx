// src/components/CommentsSection.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { getComments, postComment, postGuestComment, Comment } from '../services/wordpressInteractions';
import { isLoggedIn, getUser } from '../services/wordpressAuth';
import { decodeHtmlEntities } from '../utils/textUtils';

interface CommentsSectionProps {
    postId: number;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({ postId }) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
    const [showGuestFields, setShowGuestFields] = useState(false);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        loadComments();
        checkLoginStatus();
    }, [postId]);

    const checkLoginStatus = async () => {
        const loggedIn = await isLoggedIn();
        setIsUserLoggedIn(loggedIn);
    };

    const loadComments = async () => {
        try {
            setLoading(true);
            const data = await getComments(postId);
            setComments(data);
        } catch (error) {
            console.error('Erreur chargement commentaires:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitComment = async () => {
        if (!newComment.trim()) {
            Alert.alert('Erreur', 'Veuillez entrer un commentaire');
            return;
        }

        setSubmitting(true);

        try {
            let result;
            
            if (isUserLoggedIn) {
                result = await postComment({
                    post: postId,
                    content: newComment,
                });
            } else {
                if (!guestName.trim() || !guestEmail.trim()) {
                    Alert.alert('Erreur', 'Veuillez entrer votre nom et email');
                    setSubmitting(false);
                    setShowGuestFields(true);
                    return;
                }
                result = await postGuestComment(postId, newComment, guestName, guestEmail);
            }

            if (result) {
                setComments(prev => [result, ...prev]);
                setNewComment('');
                Alert.alert('Succès', 'Votre commentaire a été publié');
            }
        } catch (error: any) {
            Alert.alert('Erreur', error.message || 'Impossible de publier le commentaire');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const renderComment = ({ item }: { item: Comment }) => (
        <View style={styles.commentCard}>
            <View style={styles.commentHeader}>
                <View style={styles.avatar}>
                    <Ionicons name="person" size={16} color={Colors.primary} />
                </View>
                <View style={styles.commentMeta}>
                    <Text style={styles.authorName}>{item.author_name}</Text>
                    <Text style={styles.commentDate}>{formatDate(item.date)}</Text>
                </View>
            </View>
            <Text style={styles.commentContent} selectable>
                {decodeHtmlEntities(item.content.rendered.replace(/<[^>]*>/g, ''))}
            </Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <TouchableOpacity 
                style={styles.header}
                onPress={() => setExpanded(!expanded)}
            >
                <View style={styles.headerLeft}>
                    <Ionicons name="chatbubbles-outline" size={20} color={Colors.text} />
                    <Text style={styles.headerTitle}>
                        Commentaires ({comments.length})
                    </Text>
                </View>
                <Ionicons 
                    name={expanded ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color={Colors.textLight} 
                />
            </TouchableOpacity>

            {expanded && (
                <View style={styles.content}>
                    {/* Formulaire de commentaire */}
                    <View style={styles.inputSection}>
                        {!isUserLoggedIn && showGuestFields && (
                            <>
                                <TextInput
                                    style={styles.guestInput}
                                    placeholder="Votre nom"
                                    value={guestName}
                                    onChangeText={setGuestName}
                                />
                                <TextInput
                                    style={styles.guestInput}
                                    placeholder="Votre email"
                                    value={guestEmail}
                                    onChangeText={setGuestEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </>
                        )}
                        <View style={styles.inputRow}>
                            <TextInput
                                style={styles.commentInput}
                                placeholder="Écrire un commentaire..."
                                value={newComment}
                                onChangeText={setNewComment}
                                multiline
                                maxLength={1000}
                            />
                            <TouchableOpacity
                                style={[styles.sendButton, submitting && styles.sendButtonDisabled]}
                                onPress={handleSubmitComment}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Ionicons name="send" size={18} color="#FFF" />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Liste des commentaires */}
                    {loading ? (
                        <ActivityIndicator size="small" color={Colors.primary} style={styles.loader} />
                    ) : comments.length === 0 ? (
                        <Text style={styles.emptyText}>
                            Aucun commentaire. Soyez le premier à réagir !
                        </Text>
                    ) : (
                        <FlatList
                            data={comments}
                            renderItem={renderComment}
                            keyExtractor={(item) => `comment_${item.id}`}
                            scrollEnabled={false}
                            ItemSeparatorComponent={() => <View style={styles.separator} />}
                        />
                    )}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.backgroundLight,
        borderRadius: 16,
        marginHorizontal: 20,
        marginTop: 20,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginLeft: 8,
    },
    content: {
        padding: 16,
    },
    inputSection: {
        marginBottom: 16,
    },
    guestInput: {
        backgroundColor: Colors.background,
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
        fontSize: 14,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    commentInput: {
        flex: 1,
        backgroundColor: Colors.background,
        borderRadius: 10,
        padding: 12,
        fontSize: 14,
        maxHeight: 100,
        marginRight: 8,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        opacity: 0.6,
    },
    loader: {
        paddingVertical: 20,
    },
    emptyText: {
        textAlign: 'center',
        color: Colors.textLight,
        fontSize: 14,
        paddingVertical: 20,
    },
    commentCard: {
        paddingVertical: 12,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    commentMeta: {
        flex: 1,
    },
    authorName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    commentDate: {
        fontSize: 12,
        color: Colors.textLight,
    },
    commentContent: {
        fontSize: 14,
        color: Colors.text,
        lineHeight: 20,
        paddingLeft: 42,
    },
    separator: {
        height: 1,
        backgroundColor: Colors.border,
        marginVertical: 4,
    },
});

export default CommentsSection;
