-- Table pour sauvegarder les articles favoris sur Supabase
-- Basée sur l'interface SavedArticle et le modèle Post

-- Création de la table saved_articles
CREATE TABLE saved_articles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,                    -- Device ID ou ID utilisateur
    article_id TEXT NOT NULL,                  -- ID de l'article (string pour compatibilité)
    article_data JSONB NOT NULL,               -- Données complètes de l'article (objet Post)
    media TEXT NOT NULL DEFAULT 'FDA',        -- Media de l'article (depuis .env)
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour optimiser les performances
CREATE INDEX idx_saved_articles_user_id ON saved_articles(user_id);
CREATE INDEX idx_saved_articles_article_id ON saved_articles(article_id);
CREATE INDEX idx_saved_articles_media ON saved_articles(media);
CREATE INDEX idx_saved_articles_saved_at ON saved_articles(saved_at DESC);

-- Index composite pour éviter les doublons par utilisateur/article
CREATE UNIQUE INDEX idx_saved_articles_user_article ON saved_articles(user_id, article_id);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_saved_articles_updated_at 
    BEFORE UPDATE ON saved_articles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Politique RLS (Row Level Security) pour la sécurité
ALTER TABLE saved_articles ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre aux utilisateurs de voir uniquement leurs favoris
CREATE POLICY "Users can view their own saved articles" ON saved_articles
    FOR SELECT USING (user_id = current_setting('app.current_device_id', true));

-- Politique pour permettre aux utilisateurs d'insérer leurs favoris
CREATE POLICY "Users can insert their own saved articles" ON saved_articles
    FOR INSERT WITH CHECK (user_id = current_setting('app.current_device_id', true));

-- Politique pour permettre aux utilisateurs de supprimer leurs favoris
CREATE POLICY "Users can delete their own saved articles" ON saved_articles
    FOR DELETE USING (user_id = current_setting('app.current_device_id', true));

-- Politique pour permettre aux utilisateurs de mettre à jour leurs favoris
CREATE POLICY "Users can update their own saved articles" ON saved_articles
    FOR UPDATE USING (user_id = current_setting('app.current_device_id', true));

-- Commentaires pour documentation
COMMENT ON TABLE saved_articles IS 'Table pour stocker les articles favoris des utilisateurs';
COMMENT ON COLUMN saved_articles.id IS 'UUID primaire généré automatiquement';
COMMENT ON COLUMN saved_articles.user_id IS 'Device ID ou ID utilisateur qui a sauvegardé l''article';
COMMENT ON COLUMN saved_articles.article_id IS 'ID de l''article sauvegardé';
COMMENT ON COLUMN saved_articles.article_data IS 'Données JSON complètes de l''article (objet Post)';
COMMENT ON COLUMN saved_articles.media IS 'Media de l''article (ex: FDA, depuis .env)';
COMMENT ON COLUMN saved_articles.saved_at IS 'Date de sauvegarde de l''article';
COMMENT ON COLUMN saved_articles.created_at IS 'Date de création de l''enregistrement';
COMMENT ON COLUMN saved_articles.updated_at IS 'Date de dernière mise à jour';

-- Exemple de structure pour article_data (JSONB)
/*
{
  "id": 12345,
  "title": { "rendered": "Titre de l'article" },
  "excerpt": { "rendered": "Extrait de l'article..." },
  "content": { "rendered": "Contenu complet de l'article..." },
  "date": "2026-03-09T20:00:00",
  "link": "https://femmedafrique.net/article/titre",
  "categories": [1, 2, 3],
  "tags": [4, 5],
  "_embedded": {
    "author": [{...}],
    "wp:featuredmedia": [{...}],
    "wp:term": [{...}]
  },
  "dmks_featured_image": {...}
}
*/
