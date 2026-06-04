export interface FabricType {
  id: string;
  name: string;
  priceLabel: string; // "السعر: 880 جنيه" or "السعر مفاجئة"
  priceValue: number;
}

export interface ConfigApp {
  classicPrice: number;
  classicDescription: string;
  duoPrice: number;
  duoDescription: string;
  premiumPrice: number;
  premiumDescription: string;
  whatsappNumber: string;
  focusedProduct: 'classic' | 'duo' | 'premium';
  types?: FabricType[];
  wearableAppUrl?: string;
  vipAppUrl?: string;
  stage1IconUrl?: string;
  stage2IconUrl?: string;
  stage3IconUrl?: string;
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
  id?: string;           // Document ID (هوية الوثيقة، مثل: ESM-XXXX or UID)
  uid?: string;          // UID of user
  code?: string;         // نفس Document ID
  accessCode: string;    // نفس Document ID
  username: string;      // اسم المستخدم بالإنجليزية (lowercase)
  arabicName?: string;   // الاسم المعروض بالعربية
  displayName: string;   // نفس الاسم المعروض
  photoUrl: string;      // رابط صورة المستخدم
  bio: string;           // نبذة عن المستخدم
  level: number;         // المستوى (1 = برونزي، 2 = فضي، 3 = ذهبي)
  referralCount: number; // عدد الإحالات
  likes: number;         // عدد الإعجابات
  views?: number;        // عدد المشاهدات
  phone?: string;        // رقم الهاتف (اختياري)
  englishName?: string;  // الاسم بالإنجليزية الكامل (اختياري)
  appName?: string;      // اسم التطبيق المخصص (اختياري)
  createdAt?: any;       // تاريخ الإنشاء
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
