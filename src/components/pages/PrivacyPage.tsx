import React from 'react';
import { SimpleContentPage } from './SimpleContentPage';
import { DRAFT_FALLBACKS } from '../../types/pageContent';

// FIGYELEM (kanban 71915a0a): a jogi szoveget (adatkezelesi tajekoztato)
// Csabanak kell megadnia/jovahagynia -- lasd TermsPage.tsx megjegyzese.
export const PrivacyPage: React.FC = () => (
  <SimpleContentPage
    slug="privacy"
    heading="Adatkezelési Tájékoztató"
    metaDescription="A Velem Gyere platform adatkezelési tájékoztatója."
    draftFallback={DRAFT_FALLBACKS.privacy}
  />
);
