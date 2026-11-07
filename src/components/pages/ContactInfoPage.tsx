import React from 'react';
import { SimpleContentPage } from './SimpleContentPage';
import { DRAFT_FALLBACKS } from '../../types/pageContent';

export const ContactInfoPage: React.FC = () => (
  <SimpleContentPage
    slug="contact"
    heading="Kapcsolat"
    metaDescription="Lépj kapcsolatba a Velem Gyere csapatával."
    showContactFields
    draftFallback={DRAFT_FALLBACKS.contact}
  />
);
