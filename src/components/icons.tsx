import React from 'react';
import {
  Search,
  MapPin,
  Phone,
  MessageSquare,
  Star,
  CheckCircle2,
  CheckCircle,
  X,
  ChevronDown,
  ChevronRight,
  Menu,
  Store,
  Tag,
  Percent,
  ShieldCheck,
  Award,
  LayoutDashboard,
  ShieldAlert,
  Plus,
  ArrowRight,
  Clock,
  AlertCircle,
  Wrench,
  Printer,
  Scissors,
  UtensilsCrossed,
  Shirt,
  Flame,
  Building2,
  ShoppingBag,
  Bike,
  HeartPulse,
  Headphones,
  Camera,
  RefreshCw,
  Send,
  Share2,
  Calendar,
  Trash2,
  Eye,
  Rocket,
  QrCode,
  Check,
  Home,
  PlusCircle,
  HelpCircle,
  Footprints,
  SlidersHorizontal,
  ExternalLink,
  Info,
  BarChart3,
  CreditCard,
  Edit3,
  Receipt,
  ThumbsUp,
  MoreVertical,
  Smartphone,
  Navigation,
  Navigation2,
  Compass,
  Locate,
  LocateFixed,
  Map,
  Route,
  Radio,
  Crosshair,
  Layers,
  GraduationCap,
  Wifi,
  Cake,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Target,
  Zap,
  Activity,
  Maximize2,
  Filter,
} from 'lucide-react';

export {
  Search,
  MapPin,
  Phone,
  MessageSquare,
  Star,
  CheckCircle2,
  CheckCircle,
  X,
  ChevronDown,
  ChevronRight,
  Menu,
  Store,
  Tag,
  Percent,
  ShieldCheck,
  Award,
  LayoutDashboard,
  ShieldAlert,
  Plus,
  ArrowRight,
  Clock,
  AlertCircle,
  Wrench,
  Printer,
  Scissors,
  UtensilsCrossed,
  Shirt,
  Flame,
  Building2,
  ShoppingBag,
  Bike,
  HeartPulse,
  Headphones,
  Camera,
  RefreshCw,
  Send,
  Share2,
  Calendar,
  Trash2,
  Eye,
  Rocket,
  QrCode,
  Check,
  Home,
  PlusCircle,
  HelpCircle,
  Footprints,
  SlidersHorizontal,
  ExternalLink,
  Info,
  BarChart3,
  CreditCard,
  Edit3,
  Receipt,
  ThumbsUp,
  MoreVertical,
  Smartphone,
  Navigation,
  Navigation2,
  Compass,
  Locate,
  LocateFixed,
  Map,
  Route,
  Radio,
  Crosshair,
  Layers,
  GraduationCap,
  Wifi,
  Cake,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Target,
  Zap,
  Activity,
  Maximize2,
  Filter,
};

export function WhatsAppIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      className={className}
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

export function CategoryIcon({
  slug,
  className = 'w-5 h-5',
}: {
  slug: string;
  className?: string;
}) {
  switch (slug) {
    case 'phone-laptop-repair':
      return <Wrench className={className} />;
    case 'printing-cyber':
      return <Printer className={className} />;
    case 'hair-beauty-kinyozi':
      return <Scissors className={className} />;
    case 'food-cafes':
      return <UtensilsCrossed className={className} />;
    case 'laundry-mama-fua':
      return <Shirt className={className} />;
    case 'gas-groceries':
      return <Flame className={className} />;
    case 'hostels-rooms':
    case 'hostels-rentals':
      return <Building2 className={className} />;
    case 'photography-video':
    case 'photography-media':
      return <Camera className={className} />;
    case 'tutors-academics':
      return <GraduationCap className={className} />;
    case 'tailoring-fashion':
    case 'fashion-thrift':
      return <ShoppingBag className={className} />;
    case 'wifi-tech-gadgets':
    case 'electronics-accessories':
      return <Wifi className={className} />;
    case 'cakes-bakes':
      return <Cake className={className} />;
    case 'boda-transport':
      return <Bike className={className} />;
    case 'pharmacy-health':
      return <HeartPulse className={className} />;
    default:
      return <Store className={className} />;
  }
}
