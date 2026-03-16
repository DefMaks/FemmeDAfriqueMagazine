-- Tests et exemples pour la vue user_profile_stats
-- Script de validation et démonstration

-- ========================================
-- 1. SÉLECTION DE DONNÉES DE TEST
-- ========================================

-- Afficher quelques lignes de la vue pour validation
SELECT 
    username,
    app_name,
    saved_articles_count,
    articles_read_count,
    total_active_days,
    activity_status,
    last_seen,
    last_activity,
    last_article_saved
FROM user_profile_stats 
ORDER BY last_activity DESC 
LIMIT 5;

-- ========================================
-- 2. STATISTIQUES GLOBALES
-- ========================================

-- Résumé des statistiques par application
SELECT 
    app_name,
    COUNT(*) as total_users,
    SUM(saved_articles_count) as total_saved_articles,
    SUM(articles_read_count) as total_articles_read,
    AVG(total_active_days) as avg_active_days,
    COUNT(CASE WHEN activity_status = 'active' THEN 1 END) as active_users,
    COUNT(CASE WHEN activity_status = 'inactive' THEN 1 END) as inactive_users,
    COUNT(CASE WHEN activity_status = 'dormant' THEN 1 END) as dormant_users
FROM user_profile_stats 
GROUP BY app_name;

-- ========================================
-- 3. TESTS DE LA FONCTION update_user_stats
-- ========================================

-- Exemple 1: Mettre à jour les stats pour un utilisateur spécifique
SELECT update_user_stats('testuser') as result;

-- Exemple 2: Mettre à jour pour plusieurs utilisateurs (boucle simulée)
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN 
        SELECT username 
        FROM user_profile_media 
        WHERE app_name = 'FAM' 
        LIMIT 3
    LOOP
        PERFORM update_user_stats(user_record.username);
        RAISE NOTICE 'Stats mises à jour pour: %', user_record.username;
    END LOOP;
END $$;

-- ========================================
-- 4. VALIDATION DES DONNÉES
-- ========================================

-- Vérifier la cohérence des données
SELECT 
    'Validation des données' as test_type,
    COUNT(*) as total_profiles,
    COUNT(CASE WHEN saved_articles_count > 0 THEN 1 END) as users_with_saves,
    COUNT(CASE WHEN total_active_days > 0 THEN 1 END) as users_with_activity,
    COUNT(CASE WHEN last_activity > last_seen THEN 1 END) as users_with_recent_activity
FROM user_profile_stats;

-- ========================================
-- 5. PERFORMANCES DE LA VUE
-- ========================================

-- Temps d'exécution de la vue
EXPLAIN ANALYZE 
SELECT * FROM user_profile_stats 
WHERE username = 'testuser' 
LIMIT 1;

-- ========================================
-- 6. EXEMPLES D'UTILISATION
-- ========================================

-- Exemple A: Obtenir les meilleurs utilisateurs
SELECT 
    username,
    saved_articles_count,
    total_active_days,
    RANK() OVER (ORDER BY saved_articles_count DESC) as save_rank,
    RANK() OVER (ORDER BY total_active_days DESC) as activity_rank
FROM user_profile_stats 
WHERE saved_articles_count > 0
ORDER BY saved_articles_count DESC
LIMIT 10;

-- Exemple B: Utilisateurs inactifs récemment
SELECT 
    username,
    activity_status,
    last_activity,
    last_seen,
    total_active_days
FROM user_profile_stats 
WHERE activity_status = 'dormant'
   OR last_activity < NOW() - INTERVAL '30 days'
ORDER BY last_activity DESC
LIMIT 5;

-- Exemple C: Statistiques par période
SELECT 
    DATE_TRUNC('month', last_activity) as month,
    COUNT(*) as users_with_activity,
    SUM(saved_articles_count) as articles_saved_this_month
FROM user_profile_stats 
WHERE last_activity >= NOW() - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', last_activity)
ORDER BY month DESC;

-- ========================================
-- 7. NETTOYAGE ET MAINTENANCE
-- ========================================

-- Optionnel: Nettoyer les anciennes données de sauvegarde (garder 1 an)
-- DELETE FROM saved_articles 
-- WHERE saved_at < NOW() - INTERVAL '1 year';

-- Optionnel: Mettre à jour les stats pour tous les utilisateurs actifs
-- DO $$
-- DECLARE
--     user_record RECORD;
-- BEGIN
--     FOR user_record IN 
--         SELECT username 
--         FROM user_profile_stats 
--         WHERE activity_status = 'active'
--     LOOP
--         PERFORM update_user_stats(user_record.username);
--     END LOOP;
--     RAISE NOTICE 'Stats mises à jour pour tous les utilisateurs actifs';
-- END $$;
