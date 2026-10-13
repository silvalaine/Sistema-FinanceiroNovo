import React from 'react';
import {
  Utensils,
  Home,
  Car,
  HeartPulse,
  GraduationCap,
  Film,
  ShoppingBag,
  Receipt,
  Briefcase,
  Laptop,
  TrendingUp,
  PiggyBank,
  CreditCard,
  Tag,
  Coffee,
  Sparkles,
  Package,
  Plane,
  Smile,
  Zap,
  Shield,
  HelpCircle
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  Utensils,
  Home,
  Car,
  HeartPulse,
  GraduationCap,
  Film,
  ShoppingBag,
  Receipt,
  Briefcase,
  Laptop,
  TrendingUp,
  PiggyBank,
  CreditCard,
  Tag,
  Coffee,
  Sparkles,
  Package,
  Plane,
  Smile,
  Zap,
  Shield,
};

export const AVAILABLE_ICONS = [
  'Utensils',
  'Home',
  'Car',
  'HeartPulse',
  'GraduationCap',
  'Film',
  'ShoppingBag',
  'Receipt',
  'Briefcase',
  'Laptop',
  'TrendingUp',
  'PiggyBank',
  'CreditCard',
  'Coffee',
  'Plane',
  'Zap',
  'Shield',
  'Sparkles',
  'Tag',
];

interface CategoryIconProps {
  name: string;
  className?: string;
  color?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, className = 'w-4 h-4', color }) => {
  const IconComponent = ICON_MAP[name] || HelpCircle;
  return <IconComponent className={className} style={color ? { color } : undefined} />;
};
