-- Migration pour l'harmonisation de la base Supabase unifiée (yccuwumyebbstwvjbnwr)
-- Tables requises par FemmeDAfriqueMagazine et femmedafrique-revive

-- 1. SAVED ARTICLES
CREATE TABLE IF NOT EXISTS public.saved_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  article_id text NOT NULL,
  article_data jsonb NOT NULL,
  media text NOT NULL DEFAULT 'FDA',
  saved_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_articles_user_id ON public.saved_articles(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_articles_article_id ON public.saved_articles(article_id);
CREATE INDEX IF NOT EXISTS idx_saved_articles_media ON public.saved_articles(media);
CREATE INDEX IF NOT EXISTS idx_saved_articles_saved_at ON public.saved_articles(saved_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_articles_user_article ON public.saved_articles(user_id, article_id);

ALTER TABLE public.saved_articles ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.saved_articles TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Public access to saved_articles" ON public.saved_articles;
CREATE POLICY "Public access to saved_articles" ON public.saved_articles
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 2. ADVERTISEMENTS
CREATE TABLE IF NOT EXISTS public.advertisements (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id uuid,
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz NOT NULL DEFAULT (now() + interval '2 years'),
  status text DEFAULT 'en cours',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  client_id uuid,
  zone text DEFAULT 'home',
  inner_link text,
  external_link text,
  target text[] DEFAULT ARRAY['FDA']
);

CREATE INDEX IF NOT EXISTS idx_advertisements_active ON public.advertisements(is_active, status);
CREATE INDEX IF NOT EXISTS idx_advertisements_dates ON public.advertisements(start_date, end_date);

ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.advertisements TO anon, authenticated;
GRANT ALL ON public.advertisements TO service_role;

DROP POLICY IF EXISTS "Anyone can view active advertisements" ON public.advertisements;
CREATE POLICY "Anyone can view active advertisements" ON public.advertisements
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- 3. AD VIEWS & AD CLICKS
CREATE TABLE IF NOT EXISTS public.ad_views (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ad_id bigint REFERENCES public.advertisements(id) ON DELETE CASCADE,
  user_id text,
  zone text,
  viewed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ad_clicks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ad_id bigint REFERENCES public.advertisements(id) ON DELETE CASCADE,
  user_id text,
  zone text,
  clicked_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ad_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_clicks ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.ad_views TO anon, authenticated, service_role;
GRANT ALL ON public.ad_clicks TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Anyone can insert ad views" ON public.ad_views;
CREATE POLICY "Anyone can insert ad views" ON public.ad_views FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can insert ad clicks" ON public.ad_clicks;
CREATE POLICY "Anyone can insert ad clicks" ON public.ad_clicks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. USER PREFERENCES
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text UNIQUE NOT NULL,
  preferences jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.user_preferences TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Public access to user_preferences" ON public.user_preferences;
CREATE POLICY "Public access to user_preferences" ON public.user_preferences FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 5. USER PROFILE STATS VIEW
CREATE OR REPLACE VIEW public.user_profile_stats AS
SELECT 
    p.id,
    p.email as username,
    'FDA'::text as app_name,
    p.updated_at as last_seen,
    p.updated_at as last_sync,
    COALESCE(COUNT(DISTINCT s.id), 0)::integer as saved_articles_count,
    MAX(s.saved_at) as last_article_saved,
    COALESCE(COUNT(DISTINCT s.id), 0)::integer as articles_read_count,
    MAX(s.saved_at) as last_article_read,
    COALESCE(COUNT(DISTINCT DATE(s.saved_at)), 0)::integer as active_days_from_saves,
    COALESCE(COUNT(DISTINCT DATE(s.saved_at)), 0)::integer as total_active_days,
    'active'::text as activity_status,
    COALESCE(MAX(s.saved_at), p.updated_at) as last_activity
FROM public.profiles p
LEFT JOIN public.saved_articles s ON p.id::text = s.user_id
GROUP BY p.id, p.email, p.updated_at;

GRANT SELECT ON public.user_profile_stats TO anon, authenticated, service_role;

-- 6. POST VIEWS & POST POPULARITY
CREATE TABLE IF NOT EXISTS public.post_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id text NOT NULL,
  user_id text NOT NULL,
  viewed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.post_popularity (
  post_id text PRIMARY KEY,
  total_views integer DEFAULT 0,
  views_last_7_days integer DEFAULT 0,
  views_last_30_days integer DEFAULT 0,
  popularity_score numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_popularity ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.post_views TO anon, authenticated, service_role;
GRANT ALL ON public.post_popularity TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Public post_views" ON public.post_views;
CREATE POLICY "Public post_views" ON public.post_views FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public post_popularity" ON public.post_popularity;
CREATE POLICY "Public post_popularity" ON public.post_popularity FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 7. PURCHASED MAGAZINES
CREATE TABLE IF NOT EXISTS public.purchased_magazines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  magazine_id text NOT NULL,
  magazine_title text,
  amount numeric(12,2),
  currency text DEFAULT 'USD',
  purchase_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, magazine_id)
);

ALTER TABLE public.purchased_magazines ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.purchased_magazines TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Public purchased_magazines" ON public.purchased_magazines;
CREATE POLICY "Public purchased_magazines" ON public.purchased_magazines FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 8. TRUST CONTENT
CREATE TABLE IF NOT EXISTS public.trust_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id text NOT NULL,
  content text,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_verified boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.trust_content ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.trust_content TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Public trust_content" ON public.trust_content;
CREATE POLICY "Public trust_content" ON public.trust_content FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 9. ANALYTICS EVENTS & ARTICLE VIEWS
CREATE TABLE IF NOT EXISTS public.analytics_events (
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

CREATE TABLE IF NOT EXISTS public.article_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id text NOT NULL,
  user_id text NOT NULL,
  viewed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_views ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.analytics_events TO anon, authenticated, service_role;
GRANT ALL ON public.article_views TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Public analytics_events" ON public.analytics_events;
CREATE POLICY "Public analytics_events" ON public.analytics_events FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public article_views" ON public.article_views;
CREATE POLICY "Public article_views" ON public.article_views FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
