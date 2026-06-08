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
  telegramBotToken?: string;
  telegramChatId?: string;
  telegramGasUrl?: string;
  classicImageUrl?: string;
  duoImageUrl?: string;
  premiumImageUrl?: string;
}

export interface Design {
  id: string;
  name: string;
  imageUrl: string;
  images?: string[]; // Multiple images support (one or more)
  isCustom?: boolean; // True: الملابس المخصوصة (On Demand), False/Undefined: الملابس العادية (Regular Clothes)
  availableSizes?: string[]; // Available sizes list (e.g., ["M", "L", "XL", "XXL"])
  availableColors?: string[]; // Available colors list (e.g., ["Black", "White"])
  imageColors?: string[]; // Matching color labels for each image in the images array
  searchTags: string[];
  whatsappMessage: string;
  createdAt: any; // Firestore Timestamp or serverTimestamp
  showOnHome?: boolean;
  description?: string; // Product description/specifications
  price?: number; // Optional price (e.g., 499)
  originalPrice?: number; // Optional original price
  discountType?: 'percent' | 'fixed' | 'instead' | 'custom' | 'none'; // Discount option
  discountValue?: string; // Value representing actual reduction or text
  discountText?: string; // Calculated or custom label to show (e.g., "100 بدل 200")
  category?: string; // Dynamic custom category (e.g., "بريميم", "كلاسيك", etc.)
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
  altPhone?: string; // Optional phone number for delivery calls
  address?: string;   // Shipping address
  size?: string;      // Chosen size (e.g. M, L, XL, XXL)
  color?: string;     // Chosen color
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
