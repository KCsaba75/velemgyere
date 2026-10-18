import { useEffect } from 'react';

const DEFAULT_TITLE = 'Velem Gyere – Kirándulások, Élmények és Magyar Nyelvű Vezetések Külföldön';
const DEFAULT_DESCRIPTION = 'Fedezd fel a legizgalmasabb külföldi magyar nyelvű élménytúrákat, városnézéseket és reptéri transzfereket megbízható helyi szolgáltatóktól!';
const DEFAULT_IMAGE = 'https://velemgyere.hu/brand/velemgyere-logo-wide-v2.jpg';
const BASE_URL = 'https://velemgyere.hu';

export interface DocumentMetaOptions {
  image?: string;
  canonicalUrl?: string;
  type?: 'website' | 'article' | 'product';
  jsonLd?: Record<string, any> | Array<Record<string, any>>;
  // Kanban 6b02b939: csak-linkkel elerheto oldalakhoz (nincs nav-bol hivatkozva,
  // Csaba kuldi kozvetlenul) -- a sima robots.txt Disallow a JS-t nem futtato
  // crawlerekre fedi le (prerender.js ezt a route-ot szandekosan nem generalja),
  // ez pedig a JS-t futtato crawlerekre (Googlebot).
  noindex?: boolean;
}

/**
 * Sets document.title, description, canonical link, OpenGraph/Twitter social cards,
 * and dynamic JSON-LD structured data for rich search engines and AI crawlers.
 * Cleans up on unmount to prevent state leakage between SPA routes.
 */
export function useDocumentMeta(
  title?: string,
  description?: string,
  options?: DocumentMetaOptions
) {
  useEffect(() => {
    const fullTitle = title ? `${title} – Velem Gyere` : DEFAULT_TITLE;
    const fullDescription = description || DEFAULT_DESCRIPTION;
    const fullImage = options?.image || DEFAULT_IMAGE;
    const fullType = options?.type || 'website';
    const canonical = options?.canonicalUrl || (typeof window !== 'undefined' ? window.location.href : BASE_URL);

    document.title = fullTitle;

    // Helper to set or update meta tag
    const setMeta = (attr: 'name' | 'property', key: string, content: string) => {
      let tag = document.querySelector(`meta[${attr}="${key}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    // Primary SEO
    setMeta('name', 'description', fullDescription);

    if (options?.noindex) {
      setMeta('name', 'robots', 'noindex, nofollow');
    } else {
      const robotsTag = document.querySelector('meta[name="robots"]');
      if (robotsTag) robotsTag.remove();
    }

    // OpenGraph
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', fullDescription);
    setMeta('property', 'og:image', fullImage);
    setMeta('property', 'og:url', canonical);
    setMeta('property', 'og:type', fullType);
    setMeta('property', 'og:site_name', 'Velem Gyere');

    // Twitter
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', fullDescription);
    setMeta('name', 'twitter:image', fullImage);

    // Canonical link
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', canonical);

    // Dynamic JSON-LD structured data tag
    let jsonLdScript = document.getElementById('route-jsonld') as HTMLScriptElement | null;
    if (options?.jsonLd) {
      if (!jsonLdScript) {
        jsonLdScript = document.createElement('script');
        jsonLdScript.id = 'route-jsonld';
        jsonLdScript.type = 'application/ld+json';
        document.head.appendChild(jsonLdScript);
      }
      jsonLdScript.textContent = JSON.stringify(options.jsonLd);
    } else if (jsonLdScript) {
      jsonLdScript.remove();
    }

    return () => {
      document.title = DEFAULT_TITLE;
      setMeta('name', 'description', DEFAULT_DESCRIPTION);
      const robotsTag = document.querySelector('meta[name="robots"]');
      if (robotsTag) robotsTag.remove();
      setMeta('property', 'og:title', DEFAULT_TITLE);
      setMeta('property', 'og:description', DEFAULT_DESCRIPTION);
      setMeta('property', 'og:image', DEFAULT_IMAGE);
      setMeta('property', 'og:url', BASE_URL);
      setMeta('name', 'twitter:title', DEFAULT_TITLE);
      setMeta('name', 'twitter:description', DEFAULT_DESCRIPTION);
      setMeta('name', 'twitter:image', DEFAULT_IMAGE);
      if (linkCanonical) {
        linkCanonical.setAttribute('href', BASE_URL);
      }
      const activeRouteJsonLd = document.getElementById('route-jsonld');
      if (activeRouteJsonLd) {
        activeRouteJsonLd.remove();
      }
    };
  }, [title, description, options?.image, options?.canonicalUrl, options?.type, options?.noindex, JSON.stringify(options?.jsonLd)]);
}
