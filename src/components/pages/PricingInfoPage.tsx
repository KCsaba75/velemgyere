import React from 'react';
import { SimpleContentPage } from './SimpleContentPage';

export const PricingInfoPage: React.FC = () => (
  <SimpleContentPage
    slug="pricing"
    heading="Árazás és fizetés"
    metaDescription="Hogyan épül fel a Velem Gyere foglalási díja, és hogyan történik a fizetés."
    draftFallback="Hamarosan itt olvashatod, hogyan épül fel a foglalási díj és hogyan történik a fizetés."
  />
);
