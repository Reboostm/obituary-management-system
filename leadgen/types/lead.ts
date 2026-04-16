export type BusinessType = 'owner' | 'employee' | 'mixed';
export type Niche =
  | 'plumber' | 'hvac' | 'electrician' | 'contractor' | 'roofing'
  | 'landscaping' | 'pest_control' | 'cleaning' | 'realtor' | 'dentist'
  | 'photography' | 'moving' | 'home_inspection' | 'septic' | 'restoration'
  | 'locksmith' | 'painter' | 'flooring' | 'hvac_tech' | 'appliance_repair';

export interface LeadContact {
  name: string;
  email?: string;
  phone?: string;
  title?: string;
}

export interface Lead {
  id: string;
  businessName: string;
  niche: Niche;
  location: {
    county: string;
    city: string;
    state: string;
    zip: string;
    address: string;
    lat?: number;
    lng?: number;
  };
  contact: LeadContact;
  owner?: LeadContact;
  website?: string;
  phone?: string;
  email?: string;
  businessType: BusinessType;
  emailVerified: boolean;
  phoneVerified: boolean;
  locationVerified: boolean;
  qualityScore: number;
  googleRating?: number;
  googleReviewCount?: number;
  createdAt: Date;
  updatedAt: Date;
  scraped_source: string;
  ghlContactId?: string;
  ghlSyncedAt?: Date;
}

export interface SearchFilter {
  niche?: Niche[];
  county?: string;
  city?: string;
  minQualityScore?: number;
}
