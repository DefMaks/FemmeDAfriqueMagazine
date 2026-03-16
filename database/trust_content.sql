-- Table pour stocker les contenus de confiance (Trust Content)
-- Cette table permet de gérer les textes et messages de rassurance pour les paiements

CREATE TABLE trust_content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL, -- Clé unique pour identifier le contenu (ex: 'shop_screen_default')
    
    -- Contenu principal
    title VARCHAR(255) NOT NULL,
    short_message TEXT NOT NULL,
    
    -- Contenu du modal
    modal_title VARCHAR(255) NOT NULL,
    modal_content TEXT NOT NULL,
    
    -- Fonctionnalités de sécurité (JSON array)
    security_features JSONB DEFAULT '[]'::jsonb,
    
    -- Partenaires (JSON array)
    partners JSONB DEFAULT '[]'::jsonb,
    
    -- Textes des boutons
    cta_text VARCHAR(255) NOT NULL DEFAULT 'Je paie en toute confiance',
    cancel_text VARCHAR(255) NOT NULL DEFAULT 'Annuler',
    
    -- Métadonnées
    is_active BOOLEAN DEFAULT true,
    language VARCHAR(10) DEFAULT 'fr', -- Langue: fr, en, ln, etc.
    app_name VARCHAR(100), -- Nom de l'application: 'fam', 'katuni', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Index pour les recherches rapides
    CONSTRAINT trust_content_key_active UNIQUE (key, is_active)
);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_trust_content_updated_at 
    BEFORE UPDATE ON trust_content 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insertion des données par défaut pour le ShopScreen
INSERT INTO trust_content (
    key,
    title,
    short_message,
    modal_title,
    modal_content,
    security_features,
    partners,
    cta_text,
    cancel_text,
    language,
    app_name
) VALUES (
    'shop_screen_default',
    '🛡️ Paiement Sécurisé',
    'Transactions protégées et garanties par TwigaPaie',
    '🛡️ Paiement 100% Sécurisé & Transparent',
    'Vous finalisez votre achat pour Femmes d''Afrique. Pour garantir la sécurité de votre transaction, celle-ci est traitée par TwigaPaie, la solution de paiement développée par DefMaks.',
    '[
        "🔒 Transactions chiffrées de bout en bout",
        "✅ Partenariat officiel avec les opérateurs mobiles",
        "🛡️ Conformité aux standards de sécurité OHADA / PCI-DSS",
        "📞 Support disponible 24/7 en cas de problème"
    ]'::jsonb,
    '[
        {
            "name": "TwigaPaie",
            "type": "principal",
            "description": "Solution de paiement principale développée par DefMaks"
        },
        {
            "name": "AvadPay",
            "type": "mobile_money",
            "description": "Traitement des paiements Mobile Money"
        },
        {
            "name": "Flexpay",
            "type": "ecard",
            "description": "Traitement des paiements E-Card"
        }
    ]'::jsonb,
    'Je paie en toute confiance',
    'Annuler',
    'fr',
    'fam'
) ON CONFLICT (key) DO NOTHING;

-- Insertion d'une version pour Katuni (si différente)
INSERT INTO trust_content (
    key,
    title,
    short_message,
    modal_title,
    modal_content,
    security_features,
    partners,
    cta_text,
    cancel_text,
    language,
    app_name
) VALUES (
    'katuni_screen_default',
    '🛡️ Paiement Sécurisé',
    'Transactions protégées et garanties par TwigaPaie',
    '🛡️ Paiement 100% Sécurisé & Transparent',
    'Vous finalisez votre achat pour Katuni. Pour garantir la sécurité de votre transaction, celle-ci est traitée par TwigaPaie, la solution de paiement développée par DefMaks.',
    '[
        "🔒 Transactions chiffrées de bout en bout",
        "✅ Partenariat officiel avec les opérateurs mobiles",
        "🛡️ Conformité aux standards de sécurité OHADA / PCI-DSS",
        "📞 Support disponible 24/7 en cas de problème"
    ]'::jsonb,
    '[
        {
            "name": "TwigaPaie",
            "type": "principal",
            "description": "Solution de paiement principale développée par DefMaks"
        },
        {
            "name": "AvadPay",
            "type": "mobile_money",
            "description": "Traitement des paiements Mobile Money"
        },
        {
            "name": "Flexpay",
            "type": "ecard",
            "description": "Traitement des paiements E-Card"
        }
    ]'::jsonb,
    'Je paie en toute confiance',
    'Annuler',
    'fr',
    'katuni'
) ON CONFLICT (key) DO NOTHING;

-- Commentaires pour la documentation
COMMENT ON TABLE trust_content IS 'Stocke les contenus de confiance pour les messages de rassurance des paiements';
COMMENT ON COLUMN trust_content.key IS 'Clé unique pour identifier le contenu (ex: shop_screen_default)';
COMMENT ON COLUMN trust_content.title IS 'Titre court affiché dans le badge';
COMMENT ON COLUMN trust_content.short_message IS 'Message court affiché dans le badge';
COMMENT ON COLUMN trust_content.modal_title IS 'Titre du modal de confirmation';
COMMENT ON COLUMN trust_content.modal_content IS 'Contenu principal du modal';
COMMENT ON COLUMN trust_content.security_features IS 'Liste des fonctionnalités de sécurité (JSON array)';
COMMENT ON COLUMN trust_content.partners IS 'Liste des partenaires avec leurs descriptions (JSON array)';
COMMENT ON COLUMN trust_content.language IS 'Langue du contenu: fr, en, ln, etc.';
COMMENT ON COLUMN trust_content.app_name IS 'Nom de l''application: fam, katuni, etc.';
