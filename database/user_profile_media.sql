-- ========================================
-- Table user_profile_media
-- Stockage des métadonnées utilisateur et préférences
-- ========================================

-- Création de la table user_profile_media
CREATE TABLE user_profile_media (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    device_id TEXT NOT NULL,                    -- Identifiant unique de l'appareil
    username TEXT UNIQUE NOT NULL,                -- Nom d'utilisateur unique
    email TEXT UNIQUE,                             -- Email unique (optionnel)
    password_hash TEXT NOT NULL,                  -- Hash du mot de passe (bcrypt)
    profile_data JSONB DEFAULT '{}',              -- Préférences utilisateur (thème, langue, etc.)
    app_name TEXT DEFAULT 'FAM',                 -- Nom de l'application
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),     -- Dernière connexion
    last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),     -- Dernière synchronisation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),     -- Date de création
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()      -- Dernière mise à jour
);

-- Index pour optimiser les performances
CREATE INDEX idx_user_profile_media_device_id ON user_profile_media(device_id);
CREATE INDEX idx_user_profile_media_username ON user_profile_media(username);
CREATE INDEX idx_user_profile_media_email ON user_profile_media(email);
CREATE INDEX idx_user_profile_media_last_seen ON user_profile_media(last_seen DESC);
CREATE INDEX idx_user_profile_media_last_sync ON user_profile_media(last_sync DESC);

-- Trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_user_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profile_media_updated_at 
    BEFORE UPDATE ON user_profile_media 
    FOR EACH ROW 
    EXECUTE FUNCTION update_user_profile_updated_at();

-- Politique RLS (Row Level Security) pour la sécurité
ALTER TABLE user_profile_media ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre aux utilisateurs de voir leur propre profil
CREATE POLICY "Users can view their own profile" ON user_profile_media
    FOR SELECT USING (device_id = current_setting('app.current_device_id', true));

-- Politique pour permettre aux utilisateurs d'insérer leur profil
CREATE POLICY "Users can insert their own profile" ON user_profile_media
    FOR INSERT WITH CHECK (device_id = current_setting('app.current_device_id', true));

-- Politique pour permettre aux utilisateurs de mettre à jour leur profil
CREATE POLICY "Users can update their own profile" ON user_profile_media
    FOR UPDATE USING (device_id = current_setting('app.current_device_id', true));

-- Politique pour permettre aux utilisateurs de supprimer leur profil
CREATE POLICY "Users can delete their own profile" ON user_profile_media
    FOR DELETE USING (device_id = current_setting('app.current_device_id', true));

-- Fonction de nettoyage des comptes inactifs (12 mois)
CREATE OR REPLACE FUNCTION cleanup_inactive_user_profiles()
RETURNS void AS $$
BEGIN
    -- Supprimer les profils inactifs depuis plus de 12 mois
    -- Sauf s'ils ont des articles sauvegardés récemment (30 jours)
    DELETE FROM user_profile_media 
    WHERE last_seen < NOW() - INTERVAL '12 months'
    AND id NOT IN (
        SELECT DISTINCT user_id::text 
        FROM saved_articles 
        WHERE saved_at > NOW() - INTERVAL '30 days'
    );
    
    -- Log du nettoyage
    INSERT INTO system_logs (log_type, message, created_at)
    VALUES ('cleanup', CONCAT('Nettoyage de ', COUNT(*), ' profils inactifs'), NOW());
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log d'erreur
        INSERT INTO system_logs (log_type, message, created_at)
        VALUES ('error', CONCAT('Erreur nettoyage profils: ', SQLERRM), NOW());
END;
$$ LANGUAGE plpgsql;

-- Trigger quotidien pour le nettoyage (exécuté à minuit)
CREATE OR REPLACE FUNCTION schedule_cleanup_trigger()
RETURNS void AS $$
BEGIN
    -- Exécuter le nettoyage seulement si l'heure actuelle est entre minuit et 1h du matin
    IF EXTRACT(HOUR FROM NOW()) = 0 THEN
        PERFORM cleanup_inactive_user_profiles();
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour planifier le nettoyage automatique
CREATE TRIGGER schedule_user_profile_cleanup
    AFTER INSERT ON user_profile_media
    FOR EACH ROW
    EXECUTE FUNCTION schedule_cleanup_trigger();

-- Vue pour les statistiques utilisateur
CREATE VIEW user_profile_stats AS
SELECT 
    u.id,
    u.username,
    u.app_name,
    u.last_seen,
    u.last_sync,
    COUNT(s.id) as saved_articles_count,
    MAX(s.saved_at) as last_article_saved,
    CASE 
        WHEN u.last_seen > NOW() - INTERVAL '7 days' THEN 'active'
        WHEN u.last_seen > NOW() - INTERVAL '30 days' THEN 'inactive'
        ELSE 'dormant'
    END as activity_status
FROM user_profile_media u
LEFT JOIN saved_articles s ON u.id::text = s.user_id
GROUP BY u.id, u.username, u.app_name, u.last_seen, u.last_sync;

-- Commentaires pour documentation
COMMENT ON TABLE user_profile_media IS 'Table des profils utilisateurs avec métadonnées et préférences';
COMMENT ON COLUMN user_profile_media.device_id IS 'Identifiant unique de l''appareil pour la sécurité';
COMMENT ON COLUMN user_profile_media.profile_data IS 'Préférences utilisateur en format JSON (thème, langue, notifications)';
COMMENT ON COLUMN user_profile_media.app_name IS 'Nom de l''application (FAM pour Femme d''Afrique Magazine)';
COMMENT ON COLUMN user_profile_media.last_sync IS 'Dernière synchronisation avec le serveur';
COMMENT ON VIEW user_profile_stats IS 'Statistiques utilisateur avec nombre d''articles sauvegardés et statut d''activité';