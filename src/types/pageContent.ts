// Kanban 71915a0a (4-6. pont): a public.pages tabla content oszlopa jsonb,
// oldalankent eltero alakkal -- ezek a varhato alakok, NEM DB-kenyszeritett
// sema (a komponensek ?? '' fallback-kel olvasnak, hianyzo mezonel ures
// marad, nem dob hibat).
export interface PageRecord {
  slug: string;
  title: string;
  content: Record<string, unknown>;
  updated_at?: string;
}

export interface SimpleTextContent {
  bodyText?: string;
}

export interface SimpleTextImageContent {
  bodyText?: string;
  imageUrl?: string;
}

export interface ContactContent {
  bodyText?: string;
  email?: string;
  phone?: string;
}

export interface HowItWorksContent {
  visitorTitle?: string;
  visitorText?: string;
  visitorImageUrl?: string;
  providerTitle?: string;
  providerText?: string;
  providerImageUrl?: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqContent {
  items?: FaqItem[];
}

export const EMPTY_PAGE: PageRecord = { slug: '', title: '', content: {} };
