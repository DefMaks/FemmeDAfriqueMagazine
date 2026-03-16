-- Vue CORRIGÉE pour les statistiques utilisateur complètes
-- Cette version inclut les articles lus via post_views et les jours d'activité réelle

DROP VIEW IF EXISTS user_profile_stats;

CREATE VIEW user_profile_stats AS
SELECT 
    u.id,
    u.username,
    u.app_name,
    u.last_seen,
    u.last_sync,
    
    -- Articles sauvegardés
    COUNT(DISTINCT s.id) as saved_articles_count,
    MAX(s.saved_at) as last_article_saved,
    
    -- Articles lus (via post_views)
    COUNT(DISTINCT pv.post_id) as articles_read_count,
    MAX(pv.viewed_at) as last_article_read,
    
    -- Jours d'activité réelle (jours où l'utilisateur a lu ou sauvegardé)
    COUNT(DISTINCT DATE(pv.viewed_at)) as active_days_from_views,
    COUNT(DISTINCT DATE(s.saved_at)) as active_days_from_saves,
    COUNT(DISTINCT COALESCE(DATE(pv.viewed_at), DATE(s.saved_at))) as total_active_days,
    
    -- Statut d'activité basé sur la dernière activité
    CASE 
        WHEN GREATEST(u.last_seen, MAX(pv.viewed_at), MAX(s.saved_at)) > NOW() - INTERVAL '7 days' THEN 'active'
        WHEN GREATEST(u.last_seen, MAX(pv.viewed_at), MAX(s.saved_at)) > NOW() - INTERVAL '30 days' THEN 'inactive'
        ELSE 'dormant'
    END as activity_status,
    
    -- Dernière activité globale
    GREATEST(u.last_seen, MAX(pv.viewed_at), MAX(s.saved_at)) as last_activity
    
FROM user_profile_media u
LEFT JOIN saved_articles s ON u.id::text = s.user_id
LEFT JOIN post_views pv ON u.id::text = pv.user_id
GROUP BY u.id, u.username, u.app_name, u.last_seen, u.last_sync;

-- Commentaires pour documentation
COMMENT ON VIEW user_profile_stats IS 'Statistiques utilisateur complètes avec articles lus, sauvegardés et jours d''activité réelle';

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_post_views_user_id_viewed_at ON post_views(user_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_articles_user_id_saved_at ON saved_articles(user_id, saved_at DESC);

-- Fonction pour mettre à jour les statistiques utilisateur (optionnel)
CREATE OR REPLACE FUNCTION update_user_stats(p_username TEXT)
RETURNS VOID AS $$
BEGIN
    -- Cette fonction peut être appelée périodiquement pour mettre à jour les statistiques
    -- La vue se met à jour automatiquement, mais cette fonction peut pré-calculer des agrégats
    
    -- Mettre à jour last_sync dans user_profile_media
    UPDATE user_profile_media 
    SET last_sync = NOW() 
    WHERE username = p_username;
    
    RAISE NOTICE 'Statistiques mises à jour pour l''utilisateur: %', p_username;
END;
$$ LANGUAGE plpgsql;
