# WordPress Popular Posts - Native Implementation

## Overview

This document explains how to implement a popular posts system using WordPress's native functionality without external databases like Supabase.

## Method 1: Using WordPress Post Views (Recommended)

### Add View Tracking to functions.php

```php
<?php
/**
 * Track post views
 */
function fda_set_post_views($post_id) {
    $count_key = 'fda_post_views_count';
    $count = get_post_meta($post_id, $count_key, true);

    if($count == '') {
        $count = 0;
        delete_post_meta($post_id, $count_key);
        add_post_meta($post_id, $count_key, '0');
    } else {
        $count++;
        update_post_meta($post_id, $count_key, $count);
    }
}

// Track views on single post
function fda_track_post_views($post_id) {
    if(!is_single()) return;
    if(empty($post_id)) {
        global $post;
        $post_id = $post->ID;
    }
    fda_set_post_views($post_id);
}
add_action('wp_head', 'fda_track_post_views');

/**
 * Get post views count
 */
function fda_get_post_views($post_id) {
    $count_key = 'fda_post_views_count';
    $count = get_post_meta($post_id, $count_key, true);

    if($count == '') {
        delete_post_meta($post_id, $count_key);
        add_post_meta($post_id, $count_key, '0');
        return '0';
    }
    return $count;
}
?>
```

### Create Custom REST API Endpoint

```php
<?php
/**
 * Register popular posts endpoint
 */
add_action('rest_api_init', function () {
    register_rest_route('fda/v1', '/popular-posts', array(
        'methods' => 'GET',
        'callback' => 'fda_get_popular_posts',
        'permission_callback' => '__return_true',
    ));
});

function fda_get_popular_posts($request) {
    $params = $request->get_params();
    $limit = isset($params['limit']) ? intval($params['limit']) : 10;
    $time_range = isset($params['range']) ? $params['range'] : 'all';

    // Base args
    $args = array(
        'post_type' => 'post',
        'post_status' => 'publish',
        'posts_per_page' => $limit,
        'meta_key' => 'fda_post_views_count',
        'orderby' => 'meta_value_num',
        'order' => 'DESC',
        'ignore_sticky_posts' => 1,
    );

    // Add date filter for time ranges
    if($time_range === 'week') {
        $args['date_query'] = array(
            array(
                'after' => '1 week ago'
            )
        );
    } else if($time_range === 'month') {
        $args['date_query'] = array(
            array(
                'after' => '1 month ago'
            )
        );
    }

    $query = new WP_Query($args);
    $posts = array();

    if($query->have_posts()) {
        while($query->have_posts()) {
            $query->the_post();

            $post_id = get_the_ID();
            $views = fda_get_post_views($post_id);

            $posts[] = array(
                'id' => $post_id,
                'title' => array('rendered' => get_the_title()),
                'excerpt' => array('rendered' => get_the_excerpt()),
                'date' => get_the_date('c'),
                'link' => get_permalink(),
                'views' => intval($views),
                '_embedded' => array(
                    'wp:featuredmedia' => array(
                        array(
                            'source_url' => get_the_post_thumbnail_url($post_id, 'large')
                        )
                    )
                )
            );
        }
        wp_reset_postdata();
    }

    return rest_ensure_response($posts);
}
?>
```

### API Usage

Call the endpoint from your React Native app:

```typescript
// src/services/api.ts
export const getPopularPosts = async (limit = 10, range = 'all') => {
  try {
    const response = await api.get(`fda/v1/popular-posts`, {
      params: {
        limit,
        range, // 'all', 'week', 'month'
      },
    });
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des posts populaires:", error);
    throw error;
  }
};
```

## Method 2: Using WordPress Popular Posts Plugin

### Installation

1. Install **WordPress Popular Posts** plugin from WordPress.org
2. Activate the plugin
3. Go to Settings → WordPress Popular Posts

### Configuration

Enable these features:
- **Tracking method**: Use WP PostViews
- **Cache**: Enable caching for 1 hour
- **Time Ranges**: Enable 7 days, 30 days tracking

### Create Custom Endpoint

```php
<?php
add_action('rest_api_init', function () {
    register_rest_route('fda/v1', '/popular-wpp', array(
        'methods' => 'GET',
        'callback' => 'fda_get_wpp_posts',
        'permission_callback' => '__return_true',
    ));
});

function fda_get_wpp_posts($request) {
    $params = $request->get_params();
    $limit = isset($params['limit']) ? intval($params['limit']) : 10;
    $range = isset($params['range']) ? $params['range'] : 'all';

    // Map range to WPP time unit
    $time_unit = 'all';
    $time_quantity = 0;

    if($range === 'week') {
        $time_unit = 'day';
        $time_quantity = 7;
    } else if($range === 'month') {
        $time_unit = 'day';
        $time_quantity = 30;
    }

    // Get popular posts using WPP
    $popular = wpp_get_mostpopular(array(
        'range' => $range,
        'time_unit' => $time_unit,
        'time_quantity' => $time_quantity,
        'limit' => $limit,
        'post_type' => 'post',
        'stats_views' => 1,
    ));

    $posts = array();
    foreach($popular as $post_data) {
        $post_id = $post_data->id;
        $post = get_post($post_id);

        if($post) {
            $posts[] = array(
                'id' => $post_id,
                'title' => array('rendered' => $post->post_title),
                'excerpt' => array('rendered' => wp_trim_words($post->post_excerpt, 20)),
                'date' => $post->post_date,
                'link' => get_permalink($post_id),
                'views' => intval($post_data->pageviews),
                '_embedded' => array(
                    'wp:featuredmedia' => array(
                        array(
                            'source_url' => get_the_post_thumbnail_url($post_id, 'large')
                        )
                    )
                )
            );
        }
    }

    return rest_ensure_response($posts);
}
?>
```

## Method 3: Using Post Meta for Advanced Analytics

### Track Multiple Metrics

```php
<?php
/**
 * Advanced post tracking with time-based views
 */
function fda_track_post_view_advanced($post_id) {
    if(!$post_id) return;

    // Total views
    $total_views = get_post_meta($post_id, 'fda_total_views', true);
    update_post_meta($post_id, 'fda_total_views', intval($total_views) + 1);

    // Daily views
    $today = date('Y-m-d');
    $daily_key = 'fda_views_' . $today;
    $daily_views = get_post_meta($post_id, $daily_key, true);
    update_post_meta($post_id, $daily_key, intval($daily_views) + 1);

    // Update last view date
    update_post_meta($post_id, 'fda_last_viewed', current_time('mysql'));
}

/**
 * Calculate popularity score
 */
function fda_calculate_popularity_score($post_id) {
    $total = intval(get_post_meta($post_id, 'fda_total_views', true));

    // Get last 7 days views
    $last_7_days = 0;
    for($i = 0; $i < 7; $i++) {
        $date = date('Y-m-d', strtotime("-$i days"));
        $key = 'fda_views_' . $date;
        $last_7_days += intval(get_post_meta($post_id, $key, true));
    }

    // Get last 30 days views
    $last_30_days = 0;
    for($i = 0; $i < 30; $i++) {
        $date = date('Y-m-d', strtotime("-$i days"));
        $key = 'fda_views_' . $date;
        $last_30_days += intval(get_post_meta($post_id, $key, true));
    }

    // Calculate score: 50% recent (7d) + 30% medium (30d) + 20% total
    $score = ($last_7_days * 0.5) + ($last_30_days * 0.3) + ($total * 0.2);

    update_post_meta($post_id, 'fda_popularity_score', $score);

    return $score;
}

/**
 * Daily cron to update all scores
 */
add_action('fda_daily_score_update', 'fda_update_all_popularity_scores');

function fda_update_all_popularity_scores() {
    $posts = get_posts(array(
        'post_type' => 'post',
        'post_status' => 'publish',
        'posts_per_page' => -1,
        'fields' => 'ids',
    ));

    foreach($posts as $post_id) {
        fda_calculate_popularity_score($post_id);
    }
}

// Schedule daily update
if(!wp_next_scheduled('fda_daily_score_update')) {
    wp_schedule_event(time(), 'daily', 'fda_daily_score_update');
}
?>
```

## React Native Integration

```typescript
// Get popular posts
const popularPosts = await getPopularPosts(10, 'week');

// Display in app
<SectionHeader title="Articles Populaires" icon="flame" />
{popularPosts.map(post => (
  <ArticleCard
    key={post.id}
    article={post}
    badge={`${post.views} vues`}
  />
))}
```

## Performance Tips

1. **Cache Results**: Cache popular posts for 30-60 minutes
2. **Limit Queries**: Don't calculate scores on every page load
3. **Use Transients**: Store results in WordPress transients
4. **Async Tracking**: Use AJAX for view tracking to avoid page slowdown
5. **Clean Old Data**: Remove daily view meta older than 90 days

## Maintenance

### Cleanup Old View Data

```php
<?php
function fda_cleanup_old_views() {
    global $wpdb;

    $old_date = date('Y-m-d', strtotime('-90 days'));

    $wpdb->query($wpdb->prepare(
        "DELETE FROM $wpdb->postmeta
        WHERE meta_key LIKE 'fda_views_%'
        AND meta_key < %s",
        'fda_views_' . $old_date
    ));
}

// Run monthly
add_action('fda_monthly_cleanup', 'fda_cleanup_old_views');
if(!wp_next_scheduled('fda_monthly_cleanup')) {
    wp_schedule_event(time(), 'monthly', 'fda_monthly_cleanup');
}
?>
```

This is a complete native WordPress solution!
