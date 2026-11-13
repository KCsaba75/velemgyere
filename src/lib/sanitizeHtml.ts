import DOMPurify from 'dompurify';

// Kanban richtext1: egyetlen kozpontositott sanitize-pont, hasznalando MINDEN
// admin-szerkesztett HTML mentese ELOTT es minden dangerouslySetInnerHTML
// megjelenites ELOTT is (defense-in-depth -- a render-oldali hivas akkor is
// vedene, ha egy jovobeli valtoztatas kihagyna a mentes-oldalit).
const ALLOWED_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'a', 'h2', 'h3', 'blockquote'];
const ALLOWED_ATTR = ['href', 'target', 'rel'];

export const sanitizeHtml = (html: string): string =>
  DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
