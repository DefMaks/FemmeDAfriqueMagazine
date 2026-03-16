-- ========================================
-- Table user_sessions_media
-- Gestion des sessions utilisateur avec expiration automatique
-- ========================================

-- Création de la table user_sessions_media
CREATE TABLE user_sessions_media (
    session_id TEXT PRIMARY KEY,
    user_id UUID,
    device_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    
    -- Index pour optimiser les requêtes
    CONSTRAINT user_sessions_media_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.user_profile_media(id) ON DELETE CASCADE
);

-- Index pour optimiser les performances
CREATE INDEX idx_user_sessions_media_device_id ON user_sessions_media(device_id);
CREATE INDEX idx_user_sessions_media_user_id ON user_sessions_media(user_id);
CREATE INDEX idx_user_sessions_media_expires_at ON user_sessions_media(expires_at);
CREATE INDEX idx_user_sessions_media_is_active ON user_sessions_media(is_active);
CREATE INDEX idx_user_sessions_media_last_activity ON user_sessions_media(last_activity DESC);

-- Trigger pour nettoyer automatiquement les sessions expirées
CREATE OR REPLACE FUNCTION cleanup_expired_sessions_media()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE user_sessions_media 
    SET is_active = false 
    WHERE expires_at < NOW() AND is_active = true;
    
    -- Log pour monitoring
    INSERT INTO system_logs (log_type, message, created_at)
    VALUES (
        'session_cleanup', 
        'Sessions expirées nettoyées: ' || (SELECT COUNT(*) FROM user_sessions_media WHERE expires_at < NOW() AND is_active = true),
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger quotidien pour le nettoyage
CREATE TRIGGER trigger_cleanup_expired_sessions_media
    AFTER UPDATE ON user_sessions_media
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_expired_sessions_media();

-- Vue pour les statistiques de sessions
CREATE VIEW session_stats_media AS
SELECT 
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_sessions,
    COUNT(CASE WHEN expires_at > NOW() + INTERVAL '24 hours' THEN 1 END) as sessions_expiring_soon,
    AVG(EXTRACT(EPOCH FROM (expires_at - created_at))/3600) as avg_session_duration_hours,
    MAX(last_activity) as last_activity
FROM user_sessions_media;

-- Politique RLS (Row Level Security) pour la sécurité
ALTER TABLE user_sessions_media ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre aux utilisateurs de voir leurs propres sessions
CREATE POLICY "Users can view their own sessions" ON user_sessions_media
    FOR SELECT 
    USING (
        device_id = current_setting('app.current_device_id', true) OR
        user_id = (
            SELECT id FROM public.user_profile_media 
            WHERE device_id = current_setting('app.current_device_id', true)
            LIMIT 1
        )
    );

-- Politique pour permettre aux utilisateurs de créer des sessions
CREATE POLICY "Users can insert their own sessions" ON user_sessions_media
    FOR INSERT 
    WITH CHECK (
        device_id = current_setting('app.current_device_id', true)
    );

-- Politique pour permettre aux utilisateurs de mettre à jour leurs sessions
CREATE POLICY "Users can update their own sessions" ON user_sessions_media
    FOR UPDATE 
    USING (
        device_id = current_setting('app.current_device_id', true)
    );

-- Fonction pour prolonger automatiquement les sessions
CREATE OR REPLACE FUNCTION extend_session_media(session_key TEXT, days_extension INTEGER DEFAULT 3)
RETURNS BOOLEAN AS $$
DECLARE
    session_exists BOOLEAN;
BEGIN
    -- Vérifier si la session existe et est active
    SELECT EXISTS(
        SELECT 1 FROM user_sessions_media 
        WHERE session_id = session_key AND is_active = true
    ) INTO session_exists;
    
    IF NOT session_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Prolonger la session
    UPDATE user_sessions_media 
    SET 
        expires_at = NOW() + (days_extension || ' days')::INTERVAL,
        last_activity = NOW()
    WHERE session_id = session_key AND is_active = true;
    
    RETURN TRUE;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log l'erreur
        INSERT INTO system_logs (log_type, message, created_at)
        VALUES (
            'session_extension_error', 
            'Erreur extension session ' || session_key || ': ' || SQLERRM,
            NOW()
        );
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour valider une session
CREATE OR REPLACE FUNCTION validate_session_media(session_key TEXT)
RETURNS TABLE(
    is_valid BOOLEAN,
    session_data JSONB,
    message TEXT
) AS $$
DECLARE
    session_record user_sessions_media%ROWTYPE;
    is_expired BOOLEAN;
BEGIN
    -- Récupérer la session
    SELECT * INTO session_record 
    FROM user_sessions_media 
    WHERE session_id = session_key AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::JSONB, 'Session non trouvée ou inactive';
        RETURN;
    END IF;
    
    -- Vérifier l'expiration
    is_expired := session_record.expires_at < NOW();
    
    IF is_expired THEN
        -- Marquer comme inactive
        UPDATE user_sessions_media 
        SET is_active = false 
        WHERE session_id = session_key;
        
        RETURN QUERY SELECT FALSE, NULL::JSONB, 'Session expirée';
        RETURN;
    END IF;
    
    -- Mettre à jour la dernière activité
    UPDATE user_sessions_media 
    SET last_activity = NOW() 
    WHERE session_id = session_key;
    
    -- Retourner les données de session validées
    RETURN QUERY SELECT 
        TRUE, 
        row_to_json(session_record)::JSONB, 
        'Session valide';
    
END;
$$ LANGUAGE plpgsql;

-- Table système pour les logs (si n'existe pas déjà)
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    log_type TEXT NOT NULL,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les logs
CREATE INDEX IF NOT EXISTS idx_system_logs_type ON system_logs(log_type);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);

-- Commentaires pour documentation
COMMENT ON TABLE user_sessions_media IS 'Table de gestion des sessions utilisateur avec expiration automatique';
COMMENT ON COLUMN user_sessions_media.session_id IS 'Identifiant unique de session au format fam-uuid';
COMMENT ON COLUMN user_sessions_media.user_id IS 'Référence au profil utilisateur';
COMMENT ON COLUMN user_sessions_media.device_id IS 'Identifiant unique de l appareil';
COMMENT ON COLUMN user_sessions_media.expires_at IS 'Date d expiration de la session (3 jours par défaut)';
COMMENT ON COLUMN user_sessions_media.last_activity IS 'Dernière activité détectée';
COMMENT ON COLUMN user_sessions_media.is_active IS 'Statut actif de la session';
COMMENT ON COLUMN user_sessions_media.metadata IS 'Métadonnées additionnelles (version app, platform, etc.)';

COMMENT ON FUNCTION extend_session_media IS 'Prolonge une session existante de N jours';
COMMENT ON FUNCTION validate_session_media IS 'Valide une session et retourne ses données';
