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
  Globe
} from 'lucide-react';

export const CategoryIcon: React.FC<{ icon: string; className?: string }> = ({ icon, className = 'w-4 h-4' }) => {
  switch (icon) {
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
    default:
      return <Compass className={className} />;
  }
};
