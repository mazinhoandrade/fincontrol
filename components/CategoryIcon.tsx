'use client';

import React from 'react';
import {
  Banknote,
  Laptop,
  TrendingUp,
  Utensils,
  Home,
  Car,
  Zap,
  HeartPulse,
  Film,
  GraduationCap,
  Tag,
  ShoppingCart,
  Coffee,
  Dumbbell,
  Plane,
  Gift,
  Wifi,
  Smartphone,
  Landmark,
  Coins,
  Wallet,
  Building2,
  CreditCard,
  CircleHelp,
  LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Banknote,
  Laptop,
  TrendingUp,
  Utensils,
  Home,
  Car,
  Zap,
  HeartPulse,
  Film,
  GraduationCap,
  Tag,
  ShoppingCart,
  Coffee,
  Dumbbell,
  Plane,
  Gift,
  Wifi,
  Smartphone,
  Landmark,
  Coins,
  Wallet,
  Building2,
  CreditCard,
};

export const AVAILABLE_ICONS = Object.keys(ICON_MAP);

interface CategoryIconProps {
  name: string;
  className?: string;
  size?: number;
  color?: string;
}

export function CategoryIcon({ name, className = 'w-5 h-5', size, color }: CategoryIconProps) {
  const IconComponent = ICON_MAP[name] || CircleHelp;
  return <IconComponent className={className} size={size} style={color ? { color } : undefined} />;
}
