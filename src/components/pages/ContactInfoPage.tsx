import React from 'react';
import { SimpleContentPage } from './SimpleContentPage';

export const ContactInfoPage: React.FC = () => (
  <SimpleContentPage
    slug="contact"
    heading="Kapcsolat"
    metaDescription="Lépj kapcsolatba a Velem Gyere csapatával."
    showContactFields
    draftFallback="Hamarosan itt találod az elérhetőségeinket -- addig is köszönjük a türelmet!"
  />
);
