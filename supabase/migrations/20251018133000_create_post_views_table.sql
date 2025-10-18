/*
  # Create post views tracking table for popular posts

  1. New Tables
    - `post_views`
      - `id` (uuid, primary key)
      - `post_id` (text) - WordPress post ID
      - `user_id` (text) - Device identifier
      - `viewed_at` (timestamptz) - When the post was viewed
      - `created_at` (timestamptz)

    - `post_popularity`
      - `id` (uuid, primary key)
      - `post_id` (text, unique) - WordPress post ID
      - `total_views` (integer) - Total view count
      - `views_last_7_days` (integer) - Views in last 7 days
      - `views_last_30_days` (integer) - Views in last 30 days
      - `popularity_score` (decimal) - Calculated score
      - `updated_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Indexes
    - Index on post_id for fast lookups
    - Index on viewed_at for time-based queries
    - Index on popularity_score for sorting

  3. Security
    - Enable RLS on both tables
    - Allow anyone to insert views
    - Allow anyone to read popularity scores
*/

-- Create post_views table for tracking individual views
CREATE TABLE IF NOT EXISTS post_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id text NOT NULL,
  user_id text NOT NULL,
  viewed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for post_views
CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_post_views_user_id ON post_views(user_id);
CREATE INDEX IF NOT EXISTS idx_post_views_viewed_at ON post_views(viewed_at DESC);

-- Enable RLS on post_views
ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;

-- Create policies for post_views
CREATE POLICY "Anyone can insert post views"
  ON post_views
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read post views"
  ON post_views
  FOR SELECT
  USING (true);

-- Create post_popularity table for aggregated data
CREATE TABLE IF NOT EXISTS post_popularity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id text UNIQUE NOT NULL,
  total_views integer DEFAULT 0,
  views_last_7_days integer DEFAULT 0,
  views_last_30_days integer DEFAULT 0,
  popularity_score decimal DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for post_popularity
CREATE INDEX IF NOT EXISTS idx_post_popularity_post_id ON post_popularity(post_id);
CREATE INDEX IF NOT EXISTS idx_post_popularity_score ON post_popularity(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_post_popularity_updated ON post_popularity(updated_at DESC);

-- Enable RLS on post_popularity
ALTER TABLE post_popularity ENABLE ROW LEVEL SECURITY;

-- Create policies for post_popularity
CREATE POLICY "Anyone can read post popularity"
  ON post_popularity
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert post popularity"
  ON post_popularity
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update post popularity"
  ON post_popularity
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Function to update popularity scores
CREATE OR REPLACE FUNCTION update_post_popularity(p_post_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_views integer;
  v_views_7_days integer;
  v_views_30_days integer;
  v_score decimal;
BEGIN
  -- Count total views
  SELECT COUNT(*) INTO v_total_views
  FROM post_views
  WHERE post_id = p_post_id;

  -- Count views in last 7 days
  SELECT COUNT(*) INTO v_views_7_days
  FROM post_views
  WHERE post_id = p_post_id
    AND viewed_at >= NOW() - INTERVAL '7 days';

  -- Count views in last 30 days
  SELECT COUNT(*) INTO v_views_30_days
  FROM post_views
  WHERE post_id = p_post_id
    AND viewed_at >= NOW() - INTERVAL '30 days';

  -- Calculate popularity score
  -- Weight: 50% last 7 days, 30% last 30 days, 20% total
  v_score := (v_views_7_days * 0.5) + (v_views_30_days * 0.3) + (v_total_views * 0.2);

  -- Upsert popularity data
  INSERT INTO post_popularity (post_id, total_views, views_last_7_days, views_last_30_days, popularity_score, updated_at)
  VALUES (p_post_id, v_total_views, v_views_7_days, v_views_30_days, v_score, NOW())
  ON CONFLICT (post_id)
  DO UPDATE SET
    total_views = v_total_views,
    views_last_7_days = v_views_7_days,
    views_last_30_days = v_views_30_days,
    popularity_score = v_score,
    updated_at = NOW();
END;
$$;
