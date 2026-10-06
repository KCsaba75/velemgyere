import { useEffect } from 'react';

const DEFAULT_TITLE = 'Velem Gyere – Kirándulások • Programok • Élmények';
const DEFAULT_DESCRIPTION = 'Külföldi magyar nyelvű idegenvezetések, kirándulásszervezők és megbízható reptéri transzferek egyetlen közös platformon.';

/**
 * Sets document.title and the <meta name="description"> tag for the currently
 * mounted route (16241c32: minimal client-side SEO for the SPA). Resets to the
 * site default on unmount so navigating away never leaves a stale per-page title.
 */
export function useDocumentMeta(title?: string, description?: string) {
  useEffect(() => {
    document.title = title ? `${title} – Velem Gyere` : DEFAULT_TITLE;

    let tag = document.querySelector('meta[name="description"]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('name', 'description');
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', description || DEFAULT_DESCRIPTION);

    return () => {
      document.title = DEFAULT_TITLE;
      tag?.setAttribute('content', DEFAULT_DESCRIPTION);
    };
  }, [title, description]);
}
