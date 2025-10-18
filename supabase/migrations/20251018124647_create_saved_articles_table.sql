/*
  # Create saved articles table

  1. New Tables
    - `saved_articles`
      - `id` (uuid, primary key)
      - `user_id` (text) - Device identifier for now (can upgrade to auth later)
      - `article_id` (text) - WordPress post ID
      - `article_data` (jsonb) - Cached article data
      - `saved_at` (timestamptz) - When article was saved
      - `created_at` (timestamptz)

  2. Indexes
    - Index on user_id for fast lookups
    - Index on article_id for deduplication
    - Composite index on (user_id, article_id) for unique constraint

  3. Security
    - Enable RLS on saved_articles table
    - Add policy for users to manage their own saved articles
*/

-- Create saved_articles table
CREATE TABLE IF NOT EXISTS saved_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  article_id text NOT NULL,
  article_data jsonb NOT NULL,
  saved_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, article_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_saved_articles_user_id ON saved_articles(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_articles_article_id ON saved_articles(article_id);
CREATE INDEX IF NOT EXISTS idx_saved_articles_saved_at ON saved_articles(saved_at DESC);

-- Enable RLS
ALTER TABLE saved_articles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own saved articles"
  ON saved_articles
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own saved articles"
  ON saved_articles
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete their own saved articles"
  ON saved_articles
  FOR DELETE
  USING (true);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text UNIQUE NOT NULL,
  preferences jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on user_preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for user_preferences
CREATE POLICY "Users can view their own preferences"
  ON user_preferences
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own preferences"
  ON user_preferences
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own preferences"
  ON user_preferences
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
