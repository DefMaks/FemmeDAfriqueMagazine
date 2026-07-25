# WordPress Popular Posts Algorithm

This document explains how to implement a popular posts tracking system for WordPress that works with your React Native app.

## Overview

The system tracks post views in real-time using Supabase and calculates popularity scores based on:
- **50%** weight: Views in last 7 days (trending content)
- **30%** weight: Views in last 30 days (recent popularity)
- **20%** weight: Total views (evergreen content)

## Database Schema

### Tables Created

1. **post_views** - Individual view tracking
   - `post_id`: WordPress post ID
   - `user_id`: Device identifier
   - `viewed_at`: Timestamp

2. **post_popularity** - Aggregated popularity data
   - `post_id`: WordPress post ID (unique)
   - `total_views`: Total view count
   - `views_last_7_days`: Views in last 7 days
   - `views_last_30_days`: Views in last 30 days
   - `popularity_score`: Calculated score

## App Integration

### Track Views When User Opens Article

```typescript
import { postViewsService } from '../services/supabaseService';

// In ArticleDetailScreen
useEffect(() => {
  trackPostView();
}, []);

const trackPostView = async () => {
  await postViewsService.trackView(article.id.toString());
};
```

### Get Popular Posts

```typescript
import { postViewsService } from '../services/supabaseService';
import { getPosts } from '../services/api';

async function getPopularPosts() {
  // Get popular post IDs from Supabase
  const popularData = await postViewsService.getPopularPosts(10);
  const popularIds = popularData.map(p => p.post_id);

  // Fetch full post data from WordPress
  const posts = await Promise.all(
    popularIds.map(id => getPostById(parseInt(id)))
  );

  return posts;
}
```

## WordPress REST API Integration

### Option 1: Create Custom WordPress Endpoint (Recommended)

Add this to your theme's `functions.php`:

```php
<?php
// Register custom REST API endpoint for popular posts
add_action('rest_api_init', function () {
    register_rest_route('custom/v1', '/popular-posts', array(
        'methods' => 'GET',
        'callback' => 'get_popular_posts',
        'permission_callback' => '__return_true',
    ));
});

function get_popular_posts($request) {
    $limit = $request->get_param('limit') ?: 10;

    // Get popular post IDs from Supabase
    $supabase_url = 'https://your-project.supabase.co';
    $supabase_key = 'your-anon-key';

    $response = wp_remote_get(
        "$supabase_url/rest/v1/post_popularity?select=post_id&order=popularity_score.desc&limit=$limit",
        array(
            'headers' => array(
                'apikey' => $supabase_key,
                'Authorization' => "Bearer $supabase_key"
            )
        )
    );

    if (is_wp_error($response)) {
        return new WP_Error('api_error', 'Failed to fetch popular posts', array('status' => 500));
    }

    $popular_data = json_decode(wp_remote_retrieve_body($response), true);
    $post_ids = array_map(function($item) {
        return intval($item['post_id']);
    }, $popular_data);

    // Get WordPress posts
    $args = array(
        'post__in' => $post_ids,
        'post_type' => 'post',
        'post_status' => 'publish',
        'orderby' => 'post__in',
        'posts_per_page' => $limit,
    );

    $query = new WP_Query($args);
    $posts = array();

    foreach ($query->posts as $post) {
        $posts[] = array(
            'id' => $post->ID,
            'title' => array('rendered' => $post->post_title),
            'excerpt' => array('rendered' => wp_trim_words($post->post_excerpt, 20)),
            'date' => $post->post_date,
            'link' => get_permalink($post->ID),
            '_embedded' => array(
                'wp:featuredmedia' => array(
                    array('source_url' => get_the_post_thumbnail_url($post->ID, 'large'))
                )
            )
        );
    }

    wp_reset_postdata();
    return $posts;
}
```

### Option 2: Use WordPress Plugin

Install **Post Views Counter** plugin and sync with Supabase:

```php
// Add to functions.php
add_action('wp_footer', 'sync_views_to_supabase');

function sync_views_to_supabase() {
    if (is_single()) {
        global $post;
        $views = pvc_get_post_views($post->ID);

        // Send to Supabase via REST API
        $data = array(
            'post_id' => strval($post->ID),
            'total_views' => $views,
            'updated_at' => current_time('c')
        );

        // Use wp_remote_post to send to Supabase
        // ... (implementation similar to above)
    }
}
```

## App Usage Example

### Display Popular Posts Section

```typescript
import React, { useEffect, useState } from 'react';
import { postViewsService } from '../services/supabaseService';
import { getPostById } from '../services/api';

const PopularPosts = () => {
  const [popularPosts, setPopularPosts] = useState([]);

  useEffect(() => {
    loadPopularPosts();
  }, []);

  const loadPopularPosts = async () => {
    const popularData = await postViewsService.getPopularPosts(5);

    // Fetch full post data
    const posts = await Promise.all(
      popularData.map(async (item) => {
        const post = await getPostById(parseInt(item.post_id));
        return { ...post, viewCount: item.total_views };
      })
    );

    setPopularPosts(posts);
  };

  return (
    <View>
      <Text style={styles.title}>Articles Populaires</Text>
      {popularPosts.map(post => (
        <ArticleCard key={post.id} article={post} />
      ))}
    </View>
  );
};
```

## Performance Optimization

### Caching Strategy

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'popular_posts_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

async function getCachedPopularPosts() {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    }
  } catch (error) {
    console.error('Cache error:', error);
  }
  return null;
}

async function setCachedPopularPosts(data: any[]) {
  const cacheData = {
    data,
    timestamp: Date.now()
  };
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
}
```

## Analytics Dashboard

Query popular posts from Supabase:

```sql
-- Top 10 posts by popularity score
SELECT
  post_id,
  total_views,
  views_last_7_days,
  views_last_30_days,
  popularity_score
FROM post_popularity
ORDER BY popularity_score DESC
LIMIT 10;

-- Trending posts (high recent activity)
SELECT
  post_id,
  views_last_7_days,
  popularity_score
FROM post_popularity
WHERE views_last_7_days > 0
ORDER BY views_last_7_days DESC
LIMIT 10;
```

## Maintenance

### Cleanup Old Views

Run periodically to remove old view records:

```sql
DELETE FROM post_views
WHERE viewed_at < NOW() - INTERVAL '90 days';
```

### Recalculate All Scores

```sql
-- Run this to refresh all popularity scores
SELECT update_post_popularity(post_id)
FROM post_popularity;
```

## Best Practices

1. **Track views on ArticleDetailScreen mount** - Only count when user actually opens the article
2. **Cache popular posts** - Update every 30 minutes to reduce API calls
3. **Debounce view tracking** - Prevent duplicate views from same user quickly
4. **Monitor performance** - Use Supabase analytics to track query performance
5. **Clean old data** - Schedule cleanup of views older than 90 days

## Testing

Test the tracking system:

```typescript
// Test tracking a view
await postViewsService.trackView('123');

// Test getting popular posts
const popular = await postViewsService.getPopularPosts(5);
console.log('Popular posts:', popular);

// Test getting specific post views
const views = await postViewsService.getPostViews('123');
console.log('Post 123 views:', views);
```

Your popular posts system is now ready to use!
