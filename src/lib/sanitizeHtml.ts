import DOMPurify from 'dompurify';

// Kanban richtext1: egyetlen kozpontositott sanitize-pont, hasznalando MINDEN
// admin-szerkesztett HTML mentese ELOTT es minden dangerouslySetInnerHTML
// megjelenites ELOTT is (defense-in-depth -- a render-oldali hivas akkor is
// vedene, ha egy jovobeli valtoztatas kihagyna a mentes-oldalit).
const ALLOWED_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'a', 'h2', 'h3', 'blockquote'];
const ALLOWED_ATTR = ['href', 'target', 'rel'];

export const sanitizeHtml = (html: string): string =>
  DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });

// Kanban richtext1-bug: a publikus oldalak `whitespace-pre-wrap`-et hasznaltak,
// hogy a REGI, meg-cimkezetlen sima-szoveges tartalom nyers \n karakterei
// sortoresnek szamitsanak. Az UJ, RichTextEditor altal mentett HTML (<p>/<ul>
// stb.) viszont a sajat tag-jeivel mar ad terkozt -- a tag-ek KOZOTTI nyers
// \n-ek pre-wrap alatt LATHATO extra sortoreskent duplazzak azt. A ket forma
// (regi sima szoveg vs. uj HTML) EGYSZERRE van jelen a DB-ben (meg nem minden
// mezőt mentettek ujra admin-ban), ezert rendereles elott kulon kezeljuk: ha
// nincs benne HTML tag, a \n-eket <br>-re alakitjuk ES nincs pre-wrap a
// konteineren; ha mar HTML, a sajat tag-jei adjak a terkozt, pre-wrap nelkul.
const HTML_TAG_RE = /<[a-z][\s\S]*>/i;

export const sanitizeStoredContent = (raw: string): string => {
  const source = HTML_TAG_RE.test(raw) ? raw : raw.replace(/\r\n|\r|\n/g, '<br>');
  return sanitizeHtml(source);
};
