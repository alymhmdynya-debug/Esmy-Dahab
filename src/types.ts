export interface ConfigApp {
  classicPrice: number;
  classicDescription: string;
  duoPrice: number;
  duoDescription: string;
  premiumPrice: number;
  premiumDescription: string;
  whatsappNumber: string;
  focusedProduct: 'classic' | 'duo' | 'premium';
}

export interface Design {
  id: string;
  name: string;
  imageUrl: string;
  searchTags: string[];
  whatsappMessage: string;
  createdAt: any; // Firestore Timestamp or serverTimestamp
  showOnHome?: boolean;
}

export interface AccessCode {
  code: string;
  name: string;
  phone: string;
  product: 'classic' | 'duo' | 'premium';
  used: boolean;
  createdAt: any;
  activatedBy?: string; // UID of user
}

export interface User {
  uid?: string; // we can map this on load
  username: string;
  displayName: string;
  photoUrl: string;
  bio: string;
  phone: string;
  accessCode: string;
  level: 1 | 2 | 3;
  referralCount: number;
  likes?: number;
  createdAt: any;
}

export interface Order {
  id: string;
  name: string;
  phone: string;
  fabric: 'Classic' | 'Premium';
  notes: string;
  designId?: string | null;
  status: 'pending' | 'contacted' | 'completed';
  createdAt: any;
}

export interface Referral {
  id?: string;
  fromUsername: string;
  visitorId: string;
  timestamp: any;
}
