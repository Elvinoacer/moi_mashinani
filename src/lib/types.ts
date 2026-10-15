export type Tier = "FEATURED" | "RECOMMENDED" | "NONE";

export type ListingStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED";

export type VerificationLevel = "L0" | "L1" | "L2";

export interface ServiceItem {
  id: string;
  name: string;
  priceFrom?: number;
  priceTo?: number;
  unit?: string;
  note?: string;
  photo?: string;
  inStock?: boolean;
}

export interface BusinessHours {
  [day: string]: {
    open: string;
    close: string;
    closed?: boolean;
    appointmentOnly?: boolean;
  };
}

export interface BusinessMetrics {
  views: number;
  calls: number;
  whatsapp: number;
  directions: number;
  bookingRequests: number;
  impressions: number;
  lastWeekViews: number;
  lastWeekCalls: number;
  lastWeekWhatsapp: number;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  primaryCategory: string;
  extraCategories: string[];
  tags: string[];
  serviceModes: ("at_shop" | "comes_to_you" | "delivery" | "online")[];
  phone: string;
  whatsapp: string;
  campus: string;
  zone: string;
  servesZones: string[];
  landmark: string;
  address?: string;
  mapPin?: { lat: number; lng: number };
  walkTime?: string;
  hours: BusinessHours;
  services: ServiceItem[];
  priceLevel: 1 | 2 | 3;
  studentDiscount?: string;
  photos: string[];
  coverPhoto: string;
  activeTier: Tier;
  tierEndsAt?: string;
  tierStartsAt?: string;
  proStartsAt?: string;
  proEndsAt?: string;
  responseCount?: number;
  responseAverageSeconds?: number;
  availabilityConfirmedAt?: string;
  utilities?: CampusUtilities;
  listingExpiresAt?: string;
  comradeListingKind?: "DECLUTTER" | "HUSTLE";
  requestAlertsEnabled?: boolean;
  liveStatus?: string;
  sellerType?: "SHOPFRONT" | "COMRADE";
  verificationVisitRequested?: boolean;
  dealBlastEndsAt?: string;
  availableNowUntil?: string; // ISO date string
  isTemporarilyClosed?: boolean;
  temporarilyClosedUntil?: string;
  status: ListingStatus;
  verificationLevel: VerificationLevel;
  moderationReason?: string;
  claimCode?: string;
  isClaimed: boolean;
  ownerPhone?: string;
  ownerId?: string;
  ownerEmail?: string;
  ownerName?: string;
  emailVerifiedAt?: string;
  invitationSentAt?: string;
  invitationError?: string;
  ambassadorId?: string;
  profileStrength: number;
  metrics: BusinessMetrics;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  group?: string;
  id: string;
  slug: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  count?: number;
}

export interface Zone {
  id: string;
  slug: string;
  name: string;
  landmarkHint: string;
  description: string;
  center?: { lat: number; lng: number };
  walkTimeFromGate?: string;
  distanceFromGateMeters?: number;
}

export interface ProblemReport {
  id: string;
  businessId: string;
  businessName: string;
  reason:
    | "wrong_number"
    | "not_responding"
    | "closed_down"
    | "scam"
    | "inappropriate"
    | "other";
  details?: string;
  sessionId: string;
  createdAt: string;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
}

export interface PaymentRecord {
  id: string;
  apiRef: string;
  businessId: string;
  businessName: string;
  planId: "RECOMMENDED" | "FEATURED" | "PRO" | "DEAL_BLAST";
  weeks: number;
  amountKes: number;
  phone: string;
  state:
    "CREATED" | "PENDING" | "PROCESSING" | "COMPLETE" | "FAILED" | "EXPIRED";
  submittedReceipt?: string;
  receiptNumber?: string;
  method: "STK_PUSH" | "MANUAL_MPESA" | "INTASEND_CHECKOUT";
  provider?: string;
  currency?: string;
  checkoutId?: string;
  checkoutUrl?: string;
  checkoutSignature?: string;
  providerInvoiceId?: string;
  providerRef?: string;
  verifiedAt?: string;
  quoteTier?: string;
  quoteTierEndsAt?: string;
  mpesaRef?: string;
  failedReason?: string;
  createdAt: string;
  paidAt?: string;
}

export interface ServiceRequest {
  category?: string;
  contactConsent?: boolean;
  closedAt?: string;
  id: string;
  query: string;
  zone: string;
  contactPhone?: string;
  createdAt: string;
}

export interface BookingIntent {
  id: string;
  businessId: string;
  serviceName: string;
  day: string;
  time: string;
  studentName: string;
  note?: string;
  contactPhone?: string;
  status: "NEW" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  createdAt: string;
}

export interface CampusUtilities {
  hasGenerator?: boolean;
  hasWifi?: boolean;
  hasWater?: boolean;
  lateNightBoda?: boolean;
  freeDelivery?: boolean;
  noBrokerFee?: boolean;
  vacantRooms?: number;
  rentKes?: number;
  security?: string;
  waterStatus?: string;
}
export interface FlashDeal {
  id: string;
  businessId: string;
  title: string;
  priceKes: number;
  endsAt: string;
  dropZone?: string;
  dropAt?: string;
  deliveryFeeKes?: number;
  joins: number;
  businessName: string;
  slug: string;
  zone: string;
  whatsapp: string;
  sponsored: boolean;
}
