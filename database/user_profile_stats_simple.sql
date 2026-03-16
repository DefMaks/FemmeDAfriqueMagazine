-- Vue SIMPLIFIÉE pour les statistiques utilisateur (sans post_views)
-- Cette version utilise uniquement les tables existantes: user_profile_media et saved_articles

DROP VIEW IF EXISTS user_profile_stats;

CREATE VIEW user_profile_stats AS
SELECT 
    u.id,
    u.username,
    u.app_name,
    u.last_seen,
    u.last_sync,
    
    -- Articles sauvegardés (utilisés comme proxy pour articles lus et achats)
    COUNT(DISTINCT s.id) as saved_articles_count,
    MAX(s.saved_at) as last_article_saved,
    
    -- Articles lus (approximation via articles sauvegardés)
    COUNT(DISTINCT s.id) as articles_read_count,
    MAX(s.saved_at) as last_article_read,
    
    -- Jours d'activité basés sur les sauvegardes
    COUNT(DISTINCT DATE(s.saved_at)) as active_days_from_saves,
    COUNT(DISTINCT DATE(s.saved_at)) as total_active_days,
    
    -- Statut d'activité basé sur la dernière activité
    CASE 
        WHEN GREATEST(u.last_seen, MAX(s.saved_at)) > NOW() - INTERVAL '7 days' THEN 'active'
        WHEN GREATEST(u.last_seen, MAX(s.saved_at)) > NOW() - INTERVAL '30 days' THEN 'inactive'
        ELSE 'dormant'
    END as activity_status,
    
    -- Dernière activité globale
    GREATEST(u.last_seen, MAX(s.saved_at)) as last_activity
    
FROM user_profile_media u
LEFT JOIN saved_articles s ON u.id::text = s.user_id
GROUP BY u.id, u.username, u.app_name, u.last_seen, u.last_sync;

-- Commentaires pour documentation
COMMENT ON VIEW user_profile_stats IS 'Statistiques utilisateur simplifiées utilisant les articles sauvegardés comme proxy pour les articles lus et achats';

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_saved_articles_user_id_saved_at ON saved_articles(user_id, saved_at DESC);

-- Fonction pour mettre à jour les statistiques utilisateur (optionnel)
CREATE OR REPLACE FUNCTION update_user_stats(p_username TEXT)
RETURNS VOID AS $$
BEGIN
    -- Mettre à jour last_sync dans user_profile_media
    UPDATE user_profile_media 
    SET last_sync = NOW() 
    WHERE username = p_username;
    
    RAISE NOTICE 'Statistiques mises à jour pour l''utilisateur: %', p_username;
END;
$$ LANGUAGE plpgsql;
