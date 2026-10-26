import React from 'react';
import { 
  Compass, 
  Landmark, 
  Trees, 
  Palette, 
  Music, 
  Utensils, 
  Sparkles, 
  Users, 
  Sun, 
  CalendarDays,
  MapPin,
  Clock,
  Tag,
  Car,
  Ship,
  Shield,
  Globe,
  Luggage,
  Briefcase,
  Bus,
  BusFront,
  PersonStanding,
  Footprints
} from 'lucide-react';

/**
 * Pixel-perfect Walking Person (Sétáló ember) icon designed in Lucide SVG specification:
 * 24x24 viewBox, stroke-width: 2, stroke-linecap: round, stroke-linejoin: round
 */
export const WalkingPerson: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Head */}
    <circle cx="13.5" cy="4" r="2" />
    {/* Body & front leg forward */}
    <path d="M13 6.5 11.5 12l4 3.5-1.5 5.5" />
    {/* Back leg in trailing stride */}
    <path d="m11.5 12-3.5 4-2 4" />
    {/* Front arm swinging forward */}
    <path d="m12 8 4 3 2.5-1" />
    {/* Back arm swinging backward */}
    <path d="M11 8.5 8 11l-2-1" />
  </svg>
);

export interface ServiceTypeIconOption {
  value: string;
  label: string;
  emoji: string;
  description: string;
}

/**
 * Available service type icon set on the platform, expanded with:
 * - Luggage (Bőrönd)
 * - Bus (Busz)
 * - Walking (Sétáló ember)
 */
export const AVAILABLE_SERVICE_ICONS: ServiceTypeIconOption[] = [
  { value: 'Luggage', label: 'Bőrönd', emoji: '🧳', description: 'Csomag & Utazás' },
  { value: 'Bus', label: 'Busz', emoji: '🚌', description: 'Csoportos transzfer & Busz' },
  { value: 'Walking', label: 'Sétáló ember', emoji: '🚶', description: 'Gyalogtúra & Városi séta' },
  { value: 'Compass', label: 'Iránytű', emoji: '🧭', description: 'Kirándulás & Túra' },
  { value: 'Landmark', label: 'Műemlék', emoji: '🏛️', description: 'Városnézés & Múzeum' },
  { value: 'Car', label: 'Autó', emoji: '🚗', description: 'Reptéri & Helyi transzfer' },
  { value: 'Ship', label: 'Hajó', emoji: '🚢', description: 'Hajókirándulás & Vízitúra' },
  { value: 'Utensils', label: 'Étkészlet', emoji: '🍴', description: 'Gasztro & Kóstoló' },
  { value: 'Shield', label: 'Pajzs', emoji: '🛡️', description: 'Privát kíséret & Biztonság' },
  { value: 'Users', label: 'Közösség', emoji: '👥', description: 'Családi & Csoportos program' },
  { value: 'Trees', label: 'Fák', emoji: '🌲', description: 'Természet & Erdő' },
  { value: 'Sun', label: 'Nap', emoji: '☀️', description: 'Tengerpart & Strand' },
  { value: 'Footprints', label: 'Lábnyomok', emoji: '👣', description: 'Ösvény & Trekking' },
  { value: 'Palette', label: 'Paletta', emoji: '🎨', description: 'Művészet & Kultúra' },
  { value: 'Music', label: 'Zene', emoji: '🎵', description: 'Koncert & Rendezvény' },
  { value: 'Globe', label: 'Földgömb', emoji: '🌍', description: 'Nemzetközi / Egyéb' },
];

export const CategoryIcon: React.FC<{ icon: string; className?: string }> = ({ icon, className = 'w-4 h-4' }) => {
  const normalized = (icon || '').trim();

  switch (normalized) {
    // Luggage / Bőrönd
    case 'Luggage':
    case 'Suitcase':
    case 'Baggage':
    case 'borond':
      return <Luggage className={className} />;
    case 'Briefcase':
      return <Briefcase className={className} />;

    // Bus / Busz
    case 'Bus':
    case 'busz':
    case 'bus':
      return <Bus className={className} />;
    case 'BusFront':
      return <BusFront className={className} />;

    // Walking / Sétáló ember
    case 'Walking':
    case 'WalkingPerson':
    case 'PersonWalking':
    case 'setalo-ember':
    case 'setalo_ember':
    case 'Walk':
    case 'Seta':
      return <WalkingPerson className={className} />;
    case 'PersonStanding':
      return <PersonStanding className={className} />;
    case 'Footprints':
      return <Footprints className={className} />;

    // Other platform service icons
    case 'Compass':
      return <Compass className={className} />;
    case 'Landmark':
      return <Landmark className={className} />;
    case 'Car':
      return <Car className={className} />;
    case 'Ship':
      return <Ship className={className} />;
    case 'Utensils':
      return <Utensils className={className} />;
    case 'Shield':
      return <Shield className={className} />;
    case 'Users':
      return <Users className={className} />;
    case 'Trees':
      return <Trees className={className} />;
    case 'Palette':
      return <Palette className={className} />;
    case 'Music':
      return <Music className={className} />;
    case 'Sun':
      return <Sun className={className} />;
    case 'CalendarDays':
      return <CalendarDays className={className} />;
    case 'Globe':
      return <Globe className={className} />;
    case 'MapPin':
      return <MapPin className={className} />;
    case 'Sparkles':
      return <Sparkles className={className} />;
    case 'Clock':
      return <Clock className={className} />;
    case 'Tag':
      return <Tag className={className} />;
    default:
      return <Compass className={className} />;
  }
};
