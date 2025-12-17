// src/utils/textUtils.ts

/**
 * Décode les entités HTML dans une chaîne de caractères
 */
export const decodeHtmlEntities = (text: string): string => {
  if (!text) return '';
  
  return text
    // Apostrophes
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    // Guillemets
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    // Accents français
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .replace(/&ecirc;/g, 'ê')
    .replace(/&euml;/g, 'ë')
    .replace(/&agrave;/g, 'à')
    .replace(/&acirc;/g, 'â')
    .replace(/&auml;/g, 'ä')
    .replace(/&ocirc;/g, 'ô')
    .replace(/&ouml;/g, 'ö')
    .replace(/&ugrave;/g, 'ù')
    .replace(/&ucirc;/g, 'û')
    .replace(/&uuml;/g, 'ü')
    .replace(/&icirc;/g, 'î')
    .replace(/&iuml;/g, 'ï')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&oelig;/g, 'œ')
    .replace(/&aelig;/g, 'æ')
    // Symboles
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&hellip;/g, '…')
    .replace(/&copy;/g, '©')
    .replace(/&reg;/g, '®')
    .replace(/&trade;/g, '™')
    .replace(/&euro;/g, '€')
    .replace(/&pound;/g, '£')
    .replace(/&yen;/g, '¥')
    // Entités numériques génériques
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
};

/**
 * Supprime les balises HTML d'une chaîne
 */
export const stripHtml = (html: string): string => {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
};

/**
 * Formate un titre d'article en décodant les entités HTML
 */
export const formatArticleTitle = (title: string): string => {
  return decodeHtmlEntities(title);
};

/**
 * Génère le message de partage d'un article
 */
export const getShareMessage = (title: string, link: string): string => {
  const cleanTitle = decodeHtmlEntities(title);
  return `${cleanTitle}

Lire sur Femme d'Afrique : ${link}

Téléchargez notre application sur
Playstore: https://bit.ly/461FINi
AppStore : Bientôt disponible`;
};
