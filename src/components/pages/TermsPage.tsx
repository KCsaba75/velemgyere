import React from 'react';
import { SimpleContentPage } from './SimpleContentPage';
import { DRAFT_FALLBACKS } from '../../types/pageContent';

// FIGYELEM (kanban 71915a0a): a jogi szoveget (ÁSZF) Csabanak kell megadnia/
// jovahagynia -- ez a komponens szandekosan csak egy draft-cimkevel ellatott
// placeholder-t mutat, amig az admin be nem tolti a valodi szoveget.
export const TermsPage: React.FC = () => (
  <SimpleContentPage
    slug="terms"
    heading="Általános Szerződési Feltételek"
    metaDescription="A Velem Gyere platform Általános Szerződési Feltételei."
    draftFallback={DRAFT_FALLBACKS.terms}
  />
);
