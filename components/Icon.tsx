import React from 'react';
import { Globe, Cpu, Briefcase, Activity, Film, Scale, Leaf, Newspaper, ArrowRight, Check, RefreshCw, Cloud, TrendingUp, Twitter, Facebook, Youtube, Linkedin, MessageCircle, Hash, Instagram, Video, Image, AtSign, HelpCircle } from 'lucide-react';

interface IconProps {
  name: string;
  className?: string;
  size?: number;
}

const icons: Record<string, React.ElementType> = {
  Globe,
  Cpu,
  Briefcase,
  Activity,
  Film,
  Scale,
  Leaf,
  Newspaper,
  ArrowRight,
  Check,
  RefreshCw,
  Cloud,
  TrendingUp,
  MessageCircle,
  Hash,
  Instagram,
  Video,
  Image,
  AtSign,
  HelpCircle
};

export const Icon: React.FC<IconProps> = ({ name, className, size = 24 }) => {
  const LucideIcon = icons[name] || Newspaper;
  return <LucideIcon className={className} size={size} />;
};