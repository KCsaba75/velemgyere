import React from 'react';
import { SimpleContentPage } from './SimpleContentPage';

// FIGYELEM (kanban 71915a0a): a jogi szoveget (adatkezelesi tajekoztato)
// Csabanak kell megadnia/jovahagynia -- lasd TermsPage.tsx megjegyzese.
export const PrivacyPage: React.FC = () => (
  <SimpleContentPage
    slug="privacy"
    heading="Adatkezelési Tájékoztató"
    metaDescription="A Velem Gyere platform adatkezelési tájékoztatója."
    draftFallback="[DRAFT -- PLACEHOLDER SZÖVEG] Az Adatkezelési Tájékoztató végleges szövegét Csaba adja meg/hagyja jóvá az admin felületen. Ez a szöveg ideiglenes, nem jogilag kötelező erejű tartalom."
  />
);
