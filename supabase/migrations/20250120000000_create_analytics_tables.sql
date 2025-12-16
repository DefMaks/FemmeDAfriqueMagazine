/*
  # Create Analytics Tables

  1. New Tables
    - `analytics_events` - Store all analytics events
    - `article_views` - Store article view tracking
    - `popular_articles` - Materialized view for popular articles

  2. Functions
    - `update_popular_articles()` - Update popular articles ranking

  3. Triggers
    - Auto-update popular articles on new views

  4. Security
    - Enable RLS
    - Public insert access for tracking
    - Read access for analytics queries
*/

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  event_category text,
  event_label text,
  event_value numeric,
  user_id text NOT NULL,
  session_id text,
  timestamp timestamptz DEFAULT now(),
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create article_views table
CREATE TABLE IF NOT EXISTS article_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id text NOT NULL,
  article_title text NOT NULL,
  user_id text NOT NULL,
  source text,
  view_duration integer, -- en secondes
  viewed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_article_views_article_id ON article_views(article_id);
CREATE INDEX IF NOT EXISTS idx_article_views_user_id ON article_views(user_id);
CREATE INDEX IF NOT EXISTS idx_article_views_viewed_at ON article_views(viewed_at);

-- Create materialized view for popular articles
CREATE MATERIALIZED VIEW IF NOT EXISTS popular_articles AS
SELECT 
  article_id,
  MAX(article_title) as article_title,
  COUNT(*) as total_views,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) FILTER (WHERE viewed_at >= NOW() - INTERVAL '7 days') as views_last_7_days,
  COUNT(*) FILTER (WHERE viewed_at >= NOW() - INTERVAL '30 days') as views_last_30_days,
  (
    COUNT(*) * 0.3 +
    COUNT(DISTINCT user_id) * 0.4 +
    COUNT(*) FILTER (WHERE viewed_at >= NOW() - INTERVAL '7 days') * 0.3
  ) as popularity_score
FROM article_views
GROUP BY article_id
ORDER BY popularity_score DESC;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_popular_articles_article_id ON popular_articles(article_id);
CREATE INDEX IF NOT EXISTS idx_popular_articles_popularity ON popular_articles(popularity_score DESC);

-- Function to refresh popular articles
CREATE OR REPLACE FUNCTION refresh_popular_articles()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY popular_articles;
END;
$$;

-- Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_views ENABLE ROW LEVEL SECURITY;

-- Policies for analytics_events
CREATE POLICY "Anyone can insert analytics events"
  ON analytics_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own events"
  ON analytics_events FOR SELECT
  USING (true);

-- Policies for article_views
CREATE POLICY "Anyone can insert article views"
  ON article_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view article views"
  ON article_views FOR SELECT
  USING (true);

-- Create a function to automatically refresh popular articles (run daily via cron)
CREATE OR REPLACE FUNCTION auto_refresh_popular_articles()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only refresh if the view exists
  IF EXISTS (
    SELECT 1 FROM pg_matviews 
    WHERE schemaname = 'public' 
    AND matviewname = 'popular_articles'
  ) THEN
    PERFORM refresh_popular_articles();
  END IF;
END;
$$;

-- Note: Pour exécuter automatiquement tous les jours, utiliser pg_cron:
-- SELECT cron.schedule('refresh-popular-articles', '0 2 * * *', 'SELECT auto_refresh_popular_articles()');
