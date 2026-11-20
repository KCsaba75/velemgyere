import React from 'react';
import { SimpleContentPage } from './SimpleContentPage';
import { DRAFT_FALLBACKS } from '../../types/pageContent';

export const PricingInfoPage: React.FC = () => (
  <SimpleContentPage
    slug="pricing"
    heading="Árazás és fizetés"
    metaDescription="Hogyan épül fel a Velem Gyere foglalási díja, és hogyan történik a fizetés."
    draftFallback={DRAFT_FALLBACKS.pricing}
    heroEyebrow="Velem Gyere · Díjak és fizetés"
    heroSubtitle="Átlátható díjstruktúra és fizetési feltételek, mielőtt lefoglalnál egy programot."
  />
);
