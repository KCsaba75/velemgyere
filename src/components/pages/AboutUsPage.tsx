import React from 'react';
import { SimpleContentPage } from './SimpleContentPage';

export const AboutUsPage: React.FC = () => (
  <SimpleContentPage
    slug="about-us"
    heading="Rólunk"
    metaDescription="Ismerd meg a Velem Gyere csapatát és a kezdetek történetét."
    showImage
    draftFallback="Hamarosan itt olvashatod a Velem Gyere történetét -- addig is köszönjük a türelmet!"
  />
);
