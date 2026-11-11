// src/utils/textUtils.ts

/**
 * Décode toutes les entités HTML et nettoie les espaces insécables / balises résiduelles
 */
export const decodeHtmlEntities = (text: string): string => {
  if (!text || typeof text !== 'string') return '';

  const decodePass = (str: string): string =>
    str
      // Supprimer d'éventuelles balises HTML résiduelles
      .replace(/<[^>]*>/g, '')
      // Espaces insécables
      .replace(/&nbsp;/gi, ' ')
      .replace(/&#160;/g, ' ')
      .replace(/&#xa0;/gi, ' ')
      .replace(/\u00A0/g, ' ')
      // Apostrophes
      .replace(/&rsquo;/gi, "'")
      .replace(/&lsquo;/gi, "'")
      .replace(/&apos;/gi, "'")
      .replace(/&#0*39;/g, "'")
      .replace(/&#8217;/g, "'")
      .replace(/&#8216;/g, "'")
      .replace(/&#8242;/g, "'")
      // Guillemets français et anglais
      .replace(/&laquo;/gi, '«')
      .replace(/&raquo;/gi, '»')
      .replace(/&#171;/g, '«')
      .replace(/&#187;/g, '»')
      .replace(/&ldquo;/gi, '"')
      .replace(/&rdquo;/gi, '"')
      .replace(/&quot;/gi, '"')
      .replace(/&#8220;/g, '"')
      .replace(/&#8221;/g, '"')
      .replace(/&#34;/g, '"')
      // Accents français (minuscules et majuscules)
      .replace(/&eacute;/g, 'é')
      .replace(/&Eacute;/g, 'É')
      .replace(/&egrave;/g, 'è')
      .replace(/&Egrave;/g, 'È')
      .replace(/&ecirc;/g, 'ê')
      .replace(/&Ecirc;/g, 'Ê')
      .replace(/&euml;/g, 'ë')
      .replace(/&Euml;/g, 'Ë')
      .replace(/&agrave;/g, 'à')
      .replace(/&Agrave;/g, 'À')
      .replace(/&acirc;/g, 'â')
      .replace(/&Acirc;/g, 'Â')
      .replace(/&auml;/g, 'ä')
      .replace(/&Auml;/g, 'Ä')
      .replace(/&ocirc;/g, 'ô')
      .replace(/&Ocirc;/g, 'Ô')
      .replace(/&ouml;/g, 'ö')
      .replace(/&Ouml;/g, 'Ö')
      .replace(/&ugrave;/g, 'ù')
      .replace(/&Ugrave;/g, 'Ù')
      .replace(/&ucirc;/g, 'û')
      .replace(/&Ucirc;/g, 'Û')
      .replace(/&uuml;/g, 'ü')
      .replace(/&Uuml;/g, 'Ü')
      .replace(/&icirc;/g, 'î')
      .replace(/&Icirc;/g, 'Î')
      .replace(/&iuml;/g, 'ï')
      .replace(/&Iuml;/g, 'Ï')
      .replace(/&ccedil;/g, 'ç')
      .replace(/&Ccedil;/g, 'Ç')
      .replace(/&oelig;/g, 'œ')
      .replace(/&OElig;/g, 'Œ')
      .replace(/&aelig;/g, 'æ')
      .replace(/&AElig;/g, 'Æ')
      // Tirets et ponctuation
      .replace(/&ndash;/gi, '–')
      .replace(/&mdash;/gi, '—')
      .replace(/&#8211;/g, '–')
      .replace(/&#8212;/g, '—')
      .replace(/&hellip;/gi, '…')
      .replace(/&#8230;/g, '…')
      // Symboles
      .replace(/&copy;/gi, '©')
      .replace(/&reg;/gi, '®')
      .replace(/&trade;/gi, '™')
      .replace(/&euro;/gi, '€')
      .replace(/&pound;/gi, '£')
      .replace(/&yen;/gi, '¥')
      // Entités numériques décimales et hexadécimales
      .replace(/&#(\d+);/g, (_, dec) => {
        const code = parseInt(dec, 10);
        return code === 160 ? ' ' : String.fromCharCode(code);
      })
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
        const code = parseInt(hex, 16);
        return code === 160 ? ' ' : String.fromCharCode(code);
      })
      // Ampersand en dernier pour permettre un second passage propre
      .replace(/&amp;/gi, '&');

  // Deux passages pour gérer les entités doublement encodées (ex: &amp;nbsp; ou &amp;rsquo;)
  return decodePass(decodePass(text))
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Supprime les balises HTML d'une chaîne et décode les entités
 */
export const stripHtml = (html: string): string => {
  if (!html) return '';
  return decodeHtmlEntities(html);
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
