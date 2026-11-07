import React from 'react';
import { SimpleContentPage } from './SimpleContentPage';
import { DRAFT_FALLBACKS } from '../../types/pageContent';

export const AboutUsPage: React.FC = () => (
  <SimpleContentPage
    slug="about-us"
    heading="Rólunk"
    metaDescription="Ismerd meg a Velem Gyere csapatát és a kezdetek történetét."
    showImage
    draftFallback={DRAFT_FALLBACKS['about-us']}
  />
);
