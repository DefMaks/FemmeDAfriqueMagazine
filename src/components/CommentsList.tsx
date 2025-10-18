import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Colors } from '../theme/colors';

interface Comment {
  id: number;
  author_name: string;
  content: { rendered: string };
  date: string;
}

interface CommentsListProps {
  comments: Comment[];
}

export const CommentsList: React.FC<CommentsListProps> = ({ comments }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>/g, '');
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentCard}>
      <View style={styles.commentHeader}>
        <Text style={styles.authorName}>{item.author_name}</Text>
        <Text style={styles.commentDate}>{formatDate(item.date)}</Text>
      </View>
      <Text style={styles.commentText}>{stripHtml(item.content.rendered)}</Text>
    </View>
  );

  if (comments.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>Aucun commentaire pour le moment</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={comments}
      renderItem={renderComment}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.list}
      scrollEnabled={false}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 20,
  },
  commentCard: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  commentText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textLight,
  },
});
