import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  db, auth, handleFirestoreError, OperationType 
} from './lib/firebase';
import { 
  collection, query, where, getDocs, addDoc, doc, getDoc, setDoc, serverTimestamp, updateDoc, orderBy, increment 
} from 'firebase/firestore';
import { signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, User } from 'firebase/auth';
import { uploadToImgBB } from './lib/imgbb';
import { Design, AccessCode, Order, User as UserProfile, ConfigApp } from './types';
import AdminDashboard from './components/AdminDashboard';
import ReturnPolicy from './components/ReturnPolicy';
import { updatePwaAssets } from './lib/pwa';
import { DEFAULT_WEARABLE_APP_URL, DEFAULT_VIP_APP_URL } from './config';
import { 
  X, Plus, Crown, Search, ShoppingBag, Shield, Sparkles, Check, Gift, Heart, Send, 
  Users, UploadCloud, ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, HelpCircle, Copy, MessageSquare, Share2, Award
} from 'lucide-react';

// Floating gold sparkles component for premium styling
const ParticleBackground = () => {
  const [particles, setParticles] = useState<any[]>([]);
  useEffect(() => {
    // Generate static positions client side to avoid SSR/hydration discrepancies
    const items = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      duration: 10 + Math.random() * 15,
      delay: Math.random() * 5,
    }));
    setParticles(items);
  }, []);

  return (
    <div id="gold-particles-bg" className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute w-1 h-1 rounded-full bg-gold/40"
          style={{ top: p.top, left: p.left }}
          animate={{
            y: [0, -100, 0],
            opacity: [0, 0.7, 0],
            scale: [1, 2, 1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

// Beautiful Royal Crown for gold rank avatar top-left
const TiltedRoyalCrown = () => (
  <svg 
    viewBox="0 0 100 100" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className="w-[38%] h-[38%] drop-shadow-[0_2.5px_4.5px_rgba(184,151,83,0.7)] absolute -top-[14%] -left-[11%] rotate-[-22deg] z-20 pointer-events-none"
  >
    <path d="M15,80 L20,38 L40,55 L50,22 L60,55 L80,38 L85,80 Z" fill="url(#crownGoldGrad)" stroke="#A27B2B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <ellipse cx="50" cy="80" rx="35" ry="5" fill="#A27B2B" />
    <circle cx="20" cy="38" r="3.5" fill="#FFFFFF" stroke="#A27B2B" strokeWidth="1" />
    <circle cx="40" cy="55" r="2.5" fill="#FFFFFF" stroke="#A27B2B" strokeWidth="1" />
    <circle cx="50" cy="22" r="4.5" fill="#FFE082" stroke="#A27B2B" strokeWidth="1" />
    <circle cx="60" cy="55" r="2.5" fill="#FFFFFF" stroke="#A27B2B" strokeWidth="1" />
    <circle cx="80" cy="38" r="3.5" fill="#FFFFFF" stroke="#A27B2B" strokeWidth="1" />
    
    <path d="M35,74 L40,71 L45,74 L40,77 Z" fill="#FFE082" />
    <path d="M50,74 L55,71 L60,74 L55,77 Z" fill="#93C5FD" />
    <path d="M65,74 L70,71 L75,74 L70,77 Z" fill="#FFE082" />
    
    <defs>
      <linearGradient id="crownGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FCF6BA" />
        <stop offset="30%" stopColor="#BF953F" />
        <stop offset="60%" stopColor="#FBF5B7" />
        <stop offset="100%" stopColor="#AA771C" />
      </linearGradient>
    </defs>
  </svg>
);

// Level badge icons (bronze, silver, gold) to show at bottom right of avatar container
const AvatarLevelBadge = ({ level }: { level: number }) => {
  if (level === 3) {
    return (
      <div className="absolute -bottom-1 -right-1 bg-gradient-to-tr from-[#BF953F] to-[#FCF6BA] border-2 border-amber-600 rounded-full p-1 shadow-md z-10 flex items-center justify-center animate-none">
        <Crown className="w-3.5 h-3.5 text-stone-950 stroke-[2.5]" />
      </div>
    );
  }
  if (level === 2) {
    return (
      <div className="absolute -bottom-1 -right-1 bg-gradient-to-tr from-slate-300 via-zinc-100 to-slate-400 border-2 border-stone-450 rounded-full p-1 shadow-md z-10 flex items-center justify-center">
        <Award className="w-3.5 h-3.5 text-stone-900 stroke-[2.5]" />
      </div>
    );
  }
  return (
    <div className="absolute -bottom-1 -right-1 bg-gradient-to-tr from-[#8A4F1D] to-[#CD7F32] border-2 border-[#5c310b] rounded-full p-1 shadow-md z-10 flex items-center justify-center">
      <Sparkles className="w-3.5 h-3.5 text-stone-100 stroke-[2.5]" />
    </div>
  );
};

interface ProfileAvatarProps {
  photoUrl: string;
  name: string;
  level: number;
  sizeClass?: string; // e.g. "w-20 h-20" or "w-16 h-16"
  onClick?: () => void;
}

const ProfileAvatar = ({ photoUrl, name, level, sizeClass = "w-16 h-16", onClick }: ProfileAvatarProps) => {
  const isBronze = level === 1;
  const isSilver = level === 2;
  const isGold = level === 3;

  // Frame colors based on rank level
  let borderStyle = "";
  let shadowStyle = "";

  if (isGold) {
    borderStyle = "border-[4px] border-[#BF953F] ring-[3px] ring-[#FCF6BA]/40";
    shadowStyle = "shadow-lg shadow-gold/25 hover:shadow-gold/45";
  } else if (isSilver) {
    borderStyle = "border-[4px] border-stone-300 ring-[3px] ring-zinc-200/55";
    shadowStyle = "shadow-md shadow-stone-300/15 hover:shadow-stone-300/30";
  } else {
    // Bronze
    borderStyle = "border-[4px] border-[#B08D57] ring-[3px] ring-[#CD7F32]/15";
    shadowStyle = "shadow-md shadow-orange-950/15 hover:shadow-orange-950/25";
  }

  return (
    <div id={`avatar-container-${name.replace(/\s+/g, '-')}`} className={`relative inline-block ${sizeClass} mx-auto transition-all duration-300 hover:scale-105 select-none`}>
      {/* 1. Tilted Premium Royal Crown fixed on top-left (Level 3 ONLY) */}
      {isGold && <TiltedRoyalCrown />}

      {/* 2. Main profile photo */}
      <img
        src={photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200'}
        alt={name}
        onClick={onClick}
        className={`${sizeClass} rounded-full object-cover cursor-zoom-in hover:brightness-110 transition-all ${borderStyle} ${shadowStyle} bg-stone-900`}
        referrerPolicy="no-referrer"
      />

      {/* 3. Corner level badge at bottom-right */}
      <AvatarLevelBadge level={level} />
    </div>
  );
};

export default function App() {
  // Navigation & Routing state
  const [currentPath, setCurrentPath] = useState<string>('');
  const [urlParams, setUrlParams] = useState<URLSearchParams>(new URLSearchParams());
  
  // App Config and Prices
  const [configApp, setConfigApp] = useState<ConfigApp>({
    classicPrice: 499,
    classicDescription: "تيشرت وان سايز أوفرسايز بخامات مريحة وفخمة\n• جودة أقمشة حلوة وممتازة للغاية\n• طباعة وتطريز مذهب عالي الدقة بالاسم الكلاسيكي",
    duoPrice: 899,
    duoDescription: "عرض التبادل الثنائي (الكابلز) المذهب\n• قطعتين بخامات ممتازة واسمين من اختيارك\n• توفير استثنائي بقيمة 120 جنيه مصري\n• كود ثنائي لتفعيل بوابة VIP المخصصة",
    premiumPrice: 880,
    premiumDescription: "باقة بريميوم - النسخة الملكية الأقوى\n• حفر وطباعة بالاسم مع تصميم التاج الملكي الفاخر\n• خامات مريحة ومقاومة للغسيل مع تفاصيل فخمة\n• دخول مجاني مدى الحياة لبوابة النفاذ VIP والترقيات",
    whatsappNumber: '201223043867',
    focusedProduct: 'premium',
    wearableAppUrl: DEFAULT_WEARABLE_APP_URL,
    stage1IconUrl: '/icons/stage1.png',
    stage2IconUrl: '/icons/stage2.png',
    stage3IconUrl: '/icons/stage3.png'
  });

  // Client states - Home
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchedName, setSearchedName] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Design[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [featuredDesigns, setFeaturedDesigns] = useState<Design[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState<boolean>(false);
  const [selectedCustomCategory, setSelectedCustomCategory] = useState<string>('الجميع');
  const [selectedRegularCategory, setSelectedRegularCategory] = useState<string>('الجميع');

  // Fetch Featured designs for homepage display
  useEffect(() => {
    async function fetchFeatured() {
      setLoadingFeatured(true);
      try {
        const q = query(collection(db, 'designs'));
        const snap = await getDocs(q);
        const list: Design[] = [];
        snap.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Design);
        });
        setFeaturedDesigns(list);
      } catch (err) {
        console.warn('Error fetching featured designs:', err);
      } finally {
        setLoadingFeatured(false);
      }
    }
    fetchFeatured();
  }, [currentPath]);

  // Quick Lead Order Form (For names not found)
  const [leadName, setLeadName] = useState<string>('');
  const [leadPhone, setLeadPhone] = useState<string>('');
  const [leadFabric, setLeadFabric] = useState<string>('Premium');
  const [leadNotes, setLeadNotes] = useState<string>('');
  const [submittingLead, setSubmittingLead] = useState<boolean>(false);
  const [leadSuccess, setLeadSuccess] = useState<boolean>(false);

  // Fullscreen Image Viewer Modal state
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // Custom Order Form state ("مش لاقي اسمك؟")
  const [showCustomOrderForm, setShowCustomOrderForm] = useState<boolean>(false);
  const [customNameAr, setCustomNameAr] = useState<string>('');
  const [customNameEn, setCustomNameEn] = useState<string>('');
  const [customPhone, setCustomPhone] = useState<string>('');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [customFabric, setCustomFabric] = useState<string>('');
  const [customOrderSuccess, setCustomOrderSuccess] = useState<boolean>(false);
  const [submittingCustomOrder, setSubmittingCustomOrder] = useState<boolean>(false);
  const [customOrderError, setCustomOrderError] = useState<string>('');

  // Policy Modal
  const [isPolicyOpen, setIsPolicyOpen] = useState<boolean>(false);

  // Unified Checkout Modal states
  const [checkoutProduct, setCheckoutProduct] = useState<any | null>(null); // holds Design or package
  const [checkoutName, setCheckoutName] = useState<string>('');
  const [checkoutPhone, setCheckoutPhone] = useState<string>('');
  const [checkoutAltPhone, setCheckoutAltPhone] = useState<string>('');
  const [checkoutAddress, setCheckoutAddress] = useState<string>('');
  const [checkoutSize, setCheckoutSize] = useState<string>('');
  const [checkoutColor, setCheckoutColor] = useState<string>('');
  const [checkoutNotes, setCheckoutNotes] = useState<string>('');
  const [checkoutSubmitting, setCheckoutSubmitting] = useState<boolean>(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState<boolean>(false);

  // Couples/Double custom state fields
  const [checkoutName1, setCheckoutName1] = useState<string>('');
  const [checkoutName2, setCheckoutName2] = useState<string>('');
  const [checkoutSize2, setCheckoutSize2] = useState<string>('');

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutProduct) return;
    if (!checkoutName.trim()) {
      alert('يرجى كتابة الاسم بالكامل للتسجيل الفاخر للطلب!');
      return;
    }
    if (checkoutProduct.isDuo) {
      if (!checkoutName1.trim() || !checkoutName2.trim()) {
        alert('يرجى كتابة الاسمين المطلوبين للتطريز الثنائي!');
        return;
      }
      if (!checkoutSize2) {
        alert('يرجى اختيار مقاس القطعة الثانية!');
        return;
      }
    }
    if (!checkoutPhone.trim()) {
      alert('يرجى ملء رقم الواتساب!');
      return;
    }
    if (!checkoutAddress.trim()) {
      alert('يرجى ملء عنوان التوصيل بالتفصيل لتجنب تأخر الشحنة!');
      return;
    }
    if (!checkoutSize) {
      alert('يرجى اختيار مقاس من المقاسات المتاحة للطلب!');
      return;
    }

    setCheckoutSubmitting(true);
    try {
      const orderId = doc(collection(db, 'orders')).id;
      const isCustomProduct = checkoutProduct.isCustom !== false;
      const finalFabric = isCustomProduct ? 'Premium' : 'Classic';

      const finalName = checkoutProduct.isDuo
        ? `المستلم: ${checkoutName.trim()} | الأسماء الثنائية: ${checkoutName1.trim()} & ${checkoutName2.trim()}`
        : `${checkoutName.trim()} - طلب: ${checkoutProduct.name}`;

      const finalSize = checkoutProduct.isDuo
        ? `الأول: ${checkoutSize} | الثاني: ${checkoutSize2}`
        : checkoutSize;

      const orderData: Order = {
        id: orderId,
        name: finalName,
        phone: checkoutPhone.trim(),
        altPhone: checkoutAltPhone.trim(),
        address: checkoutAddress.trim(),
        size: finalSize,
        color: checkoutColor || '',
        fabric: finalFabric as any,
        notes: checkoutNotes.trim() || `أوردر فخم مباشر لـ ${checkoutProduct.name}`,
        designId: checkoutProduct.id,
        status: 'pending',
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'orders', orderId), orderData);
      setCheckoutSuccess(true);

      // Trigger Telegram notification
      const telegramText = checkoutProduct.isDuo
        ? `👥 <b>أوردر كابلز/ثنائي جديد تم تسجيله بالموقع! 🎉</b>\n\n` +
          `👤 <b>الاسم للمستلم:</b> ${checkoutName.trim()}\n` +
          `👩‍❤️‍👨 <b>تفاصيل التطريز الثنائي:</b> الاسم الأول (<code>${checkoutName1.trim()}</code>) والاسم الثاني (<code>${checkoutName2.trim()}</code>)\n` +
          `📏 <b>المقاسات المحددة:</b> الأول (<code>${checkoutSize}</code>) | الثاني (<code>${checkoutSize2}</code>)\n` +
          `📱 <b>الواتس:</b> <code>${checkoutPhone.trim()}</code>\n` +
          `📞 <b>هاتف بديل (اختياري):</b> ${checkoutAltPhone.trim() || 'لا يوجد'}\n` +
          `📍 <b>العنوان بالتفصيل:</b> ${checkoutAddress.trim()}\n` +
          `🎨 <b>اللون المختار:</b> <code>${checkoutColor || 'غير محدد'}</code>\n` +
          `👕 <b>نوع وخيار المنتج:</b> ${checkoutProduct.name}\n` +
          `🛑 <b>ملاحظات إضافية:</b> ${checkoutNotes.trim() || 'لا يوجد'}\n` +
          `🆔 <b>كود الأوردر:</b> <code>${orderId}</code>`
        : `🔔 <b>أوردر جديد تم تسجيله بالموقع! 🎉</b>\n\n` +
          `👤 <b>الاسم:</b> ${checkoutName.trim()}\n` +
          `📱 <b>الواتس:</b> <code>${checkoutPhone.trim()}</code>\n` +
          `📞 <b>هاتف بديل (اختياري):</b> ${checkoutAltPhone.trim() || 'لا يوجد'}\n` +
          `📍 <b>العنوان بالتفصيل:</b> ${checkoutAddress.trim()}\n` +
          `📏 <b>المقاس:</b> <code>${checkoutSize}</code>\n` +
          `🎨 <b>اللون المختار:</b> <code>${checkoutColor || 'غير محدد'}</code>\n` +
          `👕 <b>نوع وخيار المنتج:</b> ${checkoutProduct.name}\n` +
          `🛑 <b>ملاحظات إضافية:</b> ${checkoutNotes.trim() || 'لا يوجد'}\n` +
          `🆔 <b>كود الأوردر:</b> <code>${orderId}</code>`;

      await sendTelegramNotification(orderData, telegramText);

    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء رصد الأوردر بالخادم الرئيسي، من فضلك تفقد اتصالك بالشبكة.');
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  // VIP Pages - Apps states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
  
  // VIP Gate input
  const [codeInputValue, setCodeInputValue] = useState<string>('');
  const [checkingCode, setCheckingCode] = useState<boolean>(false);
  const [gateError, setGateError] = useState<string>('');

  // VIP setup state
  const [setupUsername, setSetupUsername] = useState<string>('');
  const [setupDisplayName, setSetupDisplayName] = useState<string>('');
  const [setupArabicName, setSetupArabicName] = useState<string>('');
  const [setupEnglishName, setSetupEnglishName] = useState<string>('');
  const [setupBio, setSetupBio] = useState<string>('');
  const [setupPhone, setSetupPhone] = useState<string>('');
  const [setupFile, setSetupFile] = useState<File | null>(null);
  const [setupPreview, setSetupPreview] = useState<string>('');
  const [savingSetup, setSavingSetup] = useState<boolean>(false);
  const [setupError, setSetupError] = useState<string>('');

  // VIP Share statistics
  const [referralsCount, setReferralsCount] = useState<number>(0);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Leaderboard & Community Stats
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [totalJoinedCount, setTotalJoinedCount] = useState<number>(0);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState<boolean>(false);

  // Public profile visitor view
  const [publicProfile, setPublicProfile] = useState<UserProfile | null>(null);
  const [loadingPublicProfile, setLoadingPublicProfile] = useState<boolean>(false);
  const [hasLikedPublic, setHasLikedPublic] = useState<boolean>(false);

  // PWA customized installation states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState<boolean>(false);

  // Install custom PWA prompts listener
  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallBtn(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Dynamically configure and inject manifest based on current profile or logged in user
  useEffect(() => {
    let usernameForManifest = '';
    let level: 1 | 2 | 3 = 1;
    const isProfileViewActive = currentPath.substring(1).trim().length > 0 && !['admin', 'apps', 'api', 'assets', 'icons', 'public'].includes(currentPath.substring(1).trim().toLowerCase());
    
    // Determine which username and level to use for the PWA manifest/assets
    if (isProfileViewActive) {
      usernameForManifest = currentPath.substring(1).toLowerCase().trim();
      if (publicProfile) {
        level = (publicProfile.level as 1 | 2 | 3) || 1;
      }
    } else if (userProfile && userProfile.username) {
      usernameForManifest = userProfile.username.toLowerCase().trim();
      level = (userProfile.level as 1 | 2 | 3) || 1;
    }

    // Call our modular PWA asset and badge updater
    updatePwaAssets(level, usernameForManifest);
  }, [userProfile, publicProfile, currentPath]);


  // Standalone PWA detection and profile lockout for extreme luxury branding
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
      setIsStandalone(!!isStandaloneMode);

      if (isStandaloneMode) {
        try {
          const cachedMe = localStorage.getItem('esm_my_profile');
          if (cachedMe) {
            const profile = JSON.parse(cachedMe);
            if (profile && profile.username) {
              const profilePath = `/${profile.username.toLowerCase().trim()}`;
              if (window.location.pathname !== profilePath) {
                window.history.replaceState({ ...window.history.state }, '', profilePath);
                setCurrentPath(profilePath);
                console.log('[PWA Standalone] Cleanly isolated view lock to user profile:', profilePath);
              }
            }
          }
        } catch (e) {
          console.warn('[PWA Standalone] Skipping automatic redirect setup:', e);
        }
      }
    }
  }, [userProfile]);


  // Router listener
  useEffect(() => {
    const handleNavigation = () => {
      // Decode path
      const path = window.location.pathname;
      setCurrentPath(path);
      setUrlParams(new URLSearchParams(window.location.search));
    };

    handleNavigation();
    window.addEventListener('popstate', handleNavigation);
    return () => window.removeEventListener('popstate', handleNavigation);
  }, []);

  // Dynamic SEO Head Update for optimal Google Crawling
  useEffect(() => {
    let title = "إسمي ذهب | براند تيشرتات بالاسم مخصصة فخمة 👑 ESMY DAHAB";
    let desc = "براند إسمي ذهب (ESMY DAHAB) لصناعة أرقى تيشيرتات الأوفرسايز بالاسم للشباب والبنات. تيشيرت وان سايز قطن مصري 100% ثقيل ومطرز باسمك بالخط العربي المذهب والتاج الفاخر.";
    
    const cleanPath = currentPath.substring(1).trim().toLowerCase();
    const isReserved = ['admin', 'apps', 'api', 'assets', 'icons', 'public', ''].includes(cleanPath);
    
    if (!isReserved && publicProfile) {
      title = `الملف الملكي لـ ${publicProfile.displayName || publicProfile.username} 👑 براند إسمي ذهب`;
      desc = `تصفح الملف التعريفي الفاخر للأستاذ(ة) ${publicProfile.displayName || publicProfile.username} من عشاق الألبسة المذهبة لبراند إسمي ذهب. اطلب تيشيرت وان سايز أوفرسايز مطرز باسمك وكن في لوحة الصدارة.`;
    } else if (currentPath === '/admin' || currentPath === '/admin/') {
      title = "لوحة إدارة الأسياد | إسمي ذهب";
    }
    
    document.title = title;
    
    // Update Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', desc);
    
    // Update Open Graph tags for rich previews
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title);
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', desc);
  }, [currentPath, publicProfile]);

  // Dynamic URL Query-Param Search Loader for SEO & Google Sitelinks Compatibility
  useEffect(() => {
    const qParam = urlParams.get('search') || urlParams.get('q');
    if (qParam && qParam.trim()) {
      const qVal = qParam.trim();
      setSearchQuery(qVal);
      setSearchedName(qVal);
      setIsSearching(true);
      
      const performUrlSearch = async () => {
        try {
          const q = query(
            collection(db, 'designs'), 
            where('searchTags', 'array-contains', qVal.toLowerCase())
          );
          const snap = await getDocs(q);
          const fetched: Design[] = [];
          snap.forEach(d => {
            fetched.push({ id: d.id, ...d.data() } as Design);
          });
          setSearchResults(fetched);
          setHasSearched(true);
          
          // Smooth scroll to search container to highlight findings
          setTimeout(() => {
            const el = document.getElementById('search-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }, 800);
        } catch (err) {
          console.error('[SEO Search Loader] Error performing parameterized search:', err);
        } finally {
          setIsSearching(false);
        }
      };
      
      performUrlSearch();
    }
  }, [urlParams]);

  // Fetch prices settings globally and trigger auto-seeding if empty
  useEffect(() => {
    async function initAndSeed() {
      try {
        // 1. Config seeding
        const configDocRef = doc(db, 'config', 'app');
        const configSnap = await getDoc(configDocRef);
        const defaultTypes = [
          { id: 'premium', name: 'تيشرت بريميوم مذهب فخم (Premium)', priceLabel: 'السعر: 880 ج.م', priceValue: 880 },
          { id: 'classic', name: 'تيشرت كلاسيك بالاسم (Classic)', priceLabel: 'السعر: 499 ج.م', priceValue: 499 },
          { id: 'duo', name: 'عرض الكابلز الثنائي المذهب (Duo)', priceLabel: 'السعر: 899 ج.م (قطعتين)', priceValue: 899 }
        ];

        if (!configSnap.exists()) {
          const defaultConfig: ConfigApp = {
            classicPrice: 499,
            classicDescription: "تيشرت وان سايز أوفرسايز بخامات مريحة وفخمة\n• جودة أقمشة حلوة وممتازة للغاية\n• طباعة وتطريز مذهب عالي الدقة بالاسم الكلاسيكي",
            duoPrice: 899,
            duoDescription: "عرض التبادل الثنائي (الكابلز) المذهب\n• قطعتين بخامات ممتازة واسمين من اختيارك\n• توفير استثنائي بقيمة 120 جنيه مصري\n• كود ثنائي لتفعيل بوابة VIP المخصصة",
            premiumPrice: 880,
            premiumDescription: "باقة بريميوم - النسخة الملكية الأقوى\n• حفر وطباعة بالاسم مع تصميم التاج الملكي الفاخر\n• خامات مريحة ومقاومة للغسيل مع تفاصيل فخمة\n• دخول مجاني مدى الحياة لبوابة النفاذ VIP والترقيات",
            whatsappNumber: '201223043867',
            focusedProduct: 'premium',
            types: defaultTypes,
            wearableAppUrl: DEFAULT_WEARABLE_APP_URL,
            vipAppUrl: DEFAULT_VIP_APP_URL,
            stage1IconUrl: '/icons/stage1.png',
            stage2IconUrl: '/icons/stage2.png',
            stage3IconUrl: '/icons/stage3.png',
            telegramBotToken: '123456789:AAFGfakeTokenStringHere',
            telegramChatId: '987654321'
          };
          await setDoc(configDocRef, defaultConfig);
          setConfigApp(defaultConfig);
          console.log('Autoseeded default config App settings successfully.');
        } else {
          // If already exists, ensure fields are safe or merge
          const data = configSnap.data();
          const merged: ConfigApp = {
            classicPrice: data.classicPrice || 499,
            classicDescription: data.classicDescription || "تيشرت وان سايز أوفرسايز بخامات مريحة وفخمة\n• جودة أقمشة حلوة وممتازة للغاية\n• طباعة وتطريز مذهب عالي الدقة بالاسم الكلاسيكي",
            duoPrice: data.duoPrice || 899,
            duoDescription: data.duoDescription || "عرض التبادل الثنائي (الكابلز) المذهب\n• قطعتين بخامات ممتازة واسمين من اختيارك\n• توفير استثنائي بقيمة 120 جنيه مصري\n• كود ثنائي لتفعيل بوابة VIP المخصصة",
            premiumPrice: data.premiumPrice || 880,
            premiumDescription: data.premiumDescription || "باقة بريميوم - النسخة الملكية الأقوى\n• حفر وطباعة بالاسم مع تصميم التاج الملكي الفاخر\n• خامات مريحة ومقاومة للغسيل مع تفاصيل فخمة\n• دخول مجاني مدى الحياة لبوابة النفاذ VIP والترقيات",
            whatsappNumber: data.whatsappNumber || '201223043867',
            focusedProduct: data.focusedProduct || 'premium',
            types: data.types || defaultTypes,
            wearableAppUrl: data.wearableAppUrl || DEFAULT_WEARABLE_APP_URL,
            vipAppUrl: data.vipAppUrl || DEFAULT_VIP_APP_URL,
            stage1IconUrl: data.stage1IconUrl || '/icons/stage1.png',
            stage2IconUrl: data.stage2IconUrl || '/icons/stage2.png',
            stage3IconUrl: data.stage3IconUrl || '/icons/stage3.png',
            telegramBotToken: data.telegramBotToken || '123456789:AAFGfakeTokenStringHere',
            telegramChatId: data.telegramChatId || '987654321'
          };
          setConfigApp(merged);
        }

        // 2. Access Codes seeding
        const accessCodesCollection = collection(db, 'accessCodes');
        const codesSnap = await getDocs(query(accessCodesCollection));
        if (codesSnap.empty) {
          const defaultCodes: AccessCode[] = [
            {
              code: 'ESM-VIP1',
              name: 'سيد أحمد الفاخر',
              phone: '01000000000',
              product: 'premium',
              used: false,
              createdAt: new Date()
            },
            {
              code: 'ESM-VIP2',
              name: 'الأميرة سارة الملكية',
              phone: '01100000000',
              product: 'premium',
              used: false,
              createdAt: new Date()
            },
            {
              code: 'ESM-GOLDEN',
              name: 'نفاذ الأسياد الذهبي الرئيسي',
              phone: '01200000000',
              product: 'premium',
              used: false,
              createdAt: new Date()
            }
          ];
          for (const item of defaultCodes) {
            await setDoc(doc(db, 'accessCodes', item.code), item);
          }
          console.log('Autoseeded default VIP access codes successfully.');
        }

        // 3. Designs Catalog seeding
        const designsCollection = collection(db, 'designs');
        const designsSnap = await getDocs(query(designsCollection));
        if (designsSnap.empty) {
          const defaultDesigns = [
            {
              id: 'design_ali',
              name: 'تصميم علي المذهب الملكي',
              imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=400',
              searchTags: ['علي', 'ali', 'علّي'],
              whatsappMessage: 'مرحباً براند إسمي ذهب الملكي، أود استكمال تخصيص وطلب تيشيرت باسمي المذهب (تصميم علي بالتاج)',
              createdAt: new Date()
            },
            {
              id: 'design_ahmed',
              name: 'تصميم أحمد المذهب الملكي',
              imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=400',
              searchTags: ['أحمد', 'احمد', 'ahmed', 'أحمّد'],
              whatsappMessage: 'مرحباً براند إسمي ذهب الملكي، أود استكمال تخصيص وطلب تيشيرت باسمي المذهب (تصميم أحمد بالتاج)',
              createdAt: new Date()
            },
            {
              id: 'design_sarah',
              name: 'تصميم سارة المذهب الملكي',
              imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=400',
              searchTags: ['سارة', 'ساره', 'sarah', 'sara'],
              whatsappMessage: 'مرحباً براند إسمي ذهب الملكي، أود استكمال تخصيص وطلب تيشيرت باسمي المذهب (تصميم سارة بالتاج)',
              createdAt: new Date()
            },
            {
              id: 'design_mohamed',
              name: 'تصميم محمد المذهب الملكي',
              imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=400',
              searchTags: ['محمد', 'محمّد', 'mohamed', 'mohammad', 'mohamad'],
              whatsappMessage: 'مرحباً براند إسمي ذهب الملكي، أود استكمال تخصيص وطلب تيشيرت باسمي المذهب (تصميم محمد بالتاج)',
              createdAt: new Date()
            }
          ];
          for (const item of defaultDesigns) {
            await setDoc(doc(db, 'designs', item.id), item);
          }
          console.log('Autoseeded default name designs successfully.');
        }
      } catch (err) {
        console.warn('Could not complete database initialization / auto-seeding:', err);
      }
    }
    initAndSeed();
  }, [currentPath]);

  // Handle URL Referrals for visitor logging
  useEffect(() => {
    const refUser = urlParams.get('ref');
    if (refUser && !localStorage.getItem('visited_someone')) {
      // Generate a brand new visitor ID
      const visitorId = localStorage.getItem('esm_visitor_id') || `VIST-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      localStorage.setItem('esm_visitor_id', visitorId);

      const logReferral = async () => {
        try {
          const refId = `${refUser}_${visitorId}`;
          await setDoc(doc(db, 'referrals', refId), {
            fromUsername: refUser.toLowerCase(),
            visitorId,
            timestamp: serverTimestamp()
          });
          // Mark visited
          localStorage.setItem('visited_someone', refUser);
        } catch (err) {
          console.error('Error logging referral statistics:', err);
        }
      };

      logReferral();
    }
  }, [urlParams]);

  // Observe User State for apps tab with offline cache
  useEffect(() => {
    // Optimistic offline loading of my profile
    try {
      const cachedMe = localStorage.getItem('esm_my_profile');
      const cachedMeRefs = localStorage.getItem('esm_my_referrals_count');
      if (cachedMe) {
        setUserProfile(JSON.parse(cachedMe));
      }
      if (cachedMeRefs) {
        setReferralsCount(Number(cachedMeRefs));
      }
    } catch (e) {
      console.warn('Could not read cached my profile:', e);
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setLoadingProfile(true);
        try {
          const profileDoc = await getDoc(doc(db, 'users', user.uid));
          if (profileDoc.exists()) {
            const data = profileDoc.data() as UserProfile;
            setUserProfile(data);
            localStorage.setItem('esm_my_profile', JSON.stringify(data));
            
            // Calculate live Referral Count matching username
            const refQuery = query(collection(db, 'referrals'), where('fromUsername', '==', data.username.toLowerCase()));
            const querySnap = await getDocs(refQuery);
            const liveCount = querySnap.size;
            setReferralsCount(liveCount);
            localStorage.setItem('esm_my_referrals_count', String(liveCount));

            // Level upgrade logic: >= 15 level=2, >= 35 level=3
            let finalLevel: 1 | 2 | 3 = (data.level as 1 | 2 | 3) || 1;
            if (liveCount >= 35) {
              finalLevel = 3;
            } else if (liveCount >= 15) {
              finalLevel = 2;
            } else {
              finalLevel = 1;
            }

            if (finalLevel !== data.level || liveCount !== data.referralCount) {
              // Update firestore
              await updateDoc(doc(db, 'users', user.uid), {
                level: finalLevel,
                referralCount: liveCount
              });
              const updated = { ...data, level: finalLevel, referralCount: liveCount };
              setUserProfile(updated);
              localStorage.setItem('esm_my_profile', JSON.stringify(updated));
            }
          }
        } catch (err) {
          console.error('Error listening to user profile changes:', err);
        } finally {
          setLoadingProfile(false);
        }
      } else {
        setUserProfile(null);
        setReferralsCount(0);
        localStorage.removeItem('esm_my_profile');
        localStorage.removeItem('esm_my_referrals_count');
      }
    });

    return () => unsub();
  }, [currentPath]);

  // Fetch Public Profile details with offline cache fallback
  useEffect(() => {
    const cleanPath = currentPath.substring(1).trim();
    const isReserved = ['admin', 'apps', 'api', 'assets', 'icons', 'public', ''].includes(cleanPath.toLowerCase());

    if (!isReserved) {
      const fetchPublicUserProfile = async () => {
        setLoadingPublicProfile(true);
        const cacheKey = `esm_profile_${cleanPath.toLowerCase()}`;
        
        // Optimistic offline loading
        try {
          const stored = localStorage.getItem(cacheKey);
          if (stored) {
            setPublicProfile(JSON.parse(stored));
          }
        } catch (e) {
          console.warn('Could not read stored public profile:', e);
        }

        try {
          const uQuery = query(collection(db, 'users'), where('username', '==', cleanPath.toLowerCase()));
          const userSnap = await getDocs(uQuery);
          if (!userSnap.empty) {
            const docSnap = userSnap.docs[0];
            const profileData = { uid: docSnap.id, ...docSnap.data() } as UserProfile;
            setPublicProfile(profileData);
            localStorage.setItem(cacheKey, JSON.stringify(profileData));
          } else {
            setPublicProfile(null);
          }
        } catch (err) {
          console.error('Firestore public profile fetch offline/failed:', err);
          // Keep cached data or let it remain if already set from stored
        } finally {
          setLoadingPublicProfile(false);
        }
      };
      fetchPublicUserProfile();
    } else {
      setPublicProfile(null);
    }
  }, [currentPath]);

  // Load Top 3 leaderboard and platform-wide community statistics
  useEffect(() => {
    async function fetchLeaderboardStats() {
      setLoadingLeaderboard(true);
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const allUsers: UserProfile[] = [];
        querySnapshot.forEach((docSnap) => {
          allUsers.push({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
        });

        // Community size counting
        setTotalJoinedCount(allUsers.length || 0);

        // Sort all users client-side by likes descending (and by referralCount secondary) to determine Top 3
        const sorted = allUsers.sort((a, b) => {
          const likesA = a.likes || 0;
          const likesB = b.likes || 0;
          if (likesB !== likesA) {
            return likesB - likesA;
          }
          return b.referralCount - a.referralCount;
        });

        setLeaderboard(sorted.slice(0, 3));

        // Find current logged-in user's index in sorted hierarchy
        const currentUserId = auth.currentUser?.uid;
        if (currentUserId) {
          const myIndex = sorted.findIndex(u => u.uid === currentUserId || (userProfile && u.username === userProfile.username));
          if (myIndex !== -1) {
            setUserRank(myIndex + 1);
          } else {
            setUserRank(null);
          }
        } else {
          setUserRank(null);
        }
      } catch (err) {
        console.warn('Error loading leaderboard statistics:', err);
      } finally {
        setLoadingLeaderboard(false);
      }
    }
    
    fetchLeaderboardStats();
  }, [currentPath, userProfile, currentUser]);

  // Navigate Helper
  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    
    let cleanPath = path;
    let searchString = '';
    
    const queryIdx = path.indexOf('?');
    if (queryIdx !== -1) {
      cleanPath = path.substring(0, queryIdx);
      searchString = path.substring(queryIdx);
    }
    
    setCurrentPath(cleanPath);
    setUrlParams(new URLSearchParams(searchString));
  };

  // Synchronize visitors like states
  useEffect(() => {
    if (publicProfile && publicProfile.username) {
      setHasLikedPublic(!!localStorage.getItem(`esm_liked_${publicProfile.username}`));
    } else {
      setHasLikedPublic(false);
    }
  }, [publicProfile]);

  // Handle toggling of votes for user profile
  const handleToggleLike = async () => {
    if (!publicProfile || !publicProfile.uid || !publicProfile.username) return;
    const key = `esm_liked_${publicProfile.username}`;
    const alreadyLiked = !!localStorage.getItem(key);

    try {
      const diffChange = alreadyLiked ? -1 : 1;
      const finalLikesCount = Math.max(0, (publicProfile.likes || 0) + diffChange);

      // Optimistic updates
      setPublicProfile(prev => prev ? { ...prev, likes: finalLikesCount } : null);
      setHasLikedPublic(!alreadyLiked);

      if (alreadyLiked) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, 'true');
      }

      // Update Firestore with transactional increment
      const userRef = doc(db, 'users', publicProfile.uid);
      await updateDoc(userRef, {
        likes: increment(diffChange)
      });
    } catch (err) {
      console.error('Error toggling premium user profile like:', err);
    }
  };

  // Search Action
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchedName(searchQuery);
    try {
      const q = query(
        collection(db, 'designs'), 
        where('searchTags', 'array-contains', searchQuery.trim().toLowerCase())
      );
      const snap = await getDocs(q);
      const fetched: Design[] = [];
      snap.forEach(d => {
        fetched.push({ id: d.id, ...d.data() } as Design);
      });
      setSearchResults(fetched);
      setHasSearched(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // Send notifications of new orders to private Telegram Channel/User / GAS Webhook
  const sendTelegramNotification = async (order: Order, whatsappMessageText: string) => {
    try {
      // 1. Google Apps Script Webhook integration if configured
      if (configApp.telegramGasUrl && configApp.telegramGasUrl.startsWith('http')) {
        console.log('[GAS API] Dispatched notification payload to Webhook...');
        try {
          await fetch(configApp.telegramGasUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: order.id,
              name: order.name,
              phone: order.phone,
              fabric: order.fabric || '',
              size: order.size || '',
              color: order.color || '',
              notes: order.notes || '',
              designId: order.designId || '',
              whatsappMessageText: whatsappMessageText,
              timestamp: new Date().toISOString()
            })
          });
          console.log('[GAS API] Payload sent successfully.');
        } catch (gasErr) {
          console.error('[GAS API] Webhook dispatch error:', gasErr);
        }
      }

      // 2. Direct Telegram Bot API fallback
      const token = configApp.telegramBotToken;
      const chatId = configApp.telegramChatId;
      if (!token || !chatId || token.includes('fake') || chatId.includes('fake')) {
        console.log('[Telegram API] Telegram credentials are not yet set or use dummy values. Notification skipped.');
        return;
      }
      const rawText = `🔔 <b>طلب ملكي جديد وارد! (ESM Store)</b>\n\n` +
        `👤 <b>الاسم:</b> ${order.name}\n` +
        `📱 <b>الجوال:</b> <code>${order.phone}</code>\n` +
        `👕 <b>نوع الخامة:</b> ${order.fabric}\n` +
        `📝 <b>ملاحظات وتخصيص:</b> ${order.notes || 'لا يوجد'}\n` +
        `🏷️ <b>رمز التصميم/البحث:</b> ${order.designId || 'لا يوجد'}\n` +
        `🆔 <b>رقم أوردر النظام:</b> <code>${order.id}</code>\n\n` +
        `💬 <b>نص رسالة الواتس الكلي للنسخ:</b>\n<i>${whatsappMessageText}</i>`;

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: rawText,
          parse_mode: 'HTML'
        })
      });
      console.log('[Telegram API] Notification dispatch completed.');
    } catch (err) {
      console.error('[Telegram API] Error sending private notification:', err);
    }
  };

  // Quick Order submit (no results matched)
  const handleQuickOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName || !leadPhone) {
      alert('يرجى كتابة الاسم ورقم الواتساب!');
      return;
    }
    setSubmittingLead(true);
    try {
      const orderId = doc(collection(db, 'orders')).id;
      const orderData: Order = {
        id: orderId,
        name: leadName.trim(),
        phone: leadPhone.trim(),
        fabric: leadFabric as any,
        notes: leadNotes.trim() || 'طلب تخصيص قطعة مذهبة نادرة بالاسم.',
        designId: searchedName,
        status: 'pending',
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'orders', orderId), orderData);
      setLeadSuccess(true);

      // Redirect to WhatsApp with a precalculated generic message
      const textMsg = `أهلاً براند إسمي ذهب الفخم، قمت للتو بطلب تيشيرت مخصص في الكتالوج:\nالاسم المرغوب: ${leadName}\nرقم المحمول: ${leadPhone}\nنوع الخامة: ${leadFabric === 'Premium' ? 'تاج مذهب بريميوم' : 'كلاسيك مصفر'}\nملاحظات: ${leadNotes || 'لا يوجد'}`;
      const encodedText = encodeURIComponent(textMsg);
      
      // Dispatch Telegram notification
      await sendTelegramNotification(orderData, textMsg);

      setTimeout(() => {
        window.open(`https://wa.me/${configApp.whatsappNumber}?text=${encodedText}`, '_blank');
      }, 1000);

    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء رصد الطلب، يرجى تكرار المحاولة.');
    } finally {
      setSubmittingLead(false);
    }
  };

  // Custom order submission ("مش لاقي اسمي")
  const handleCustomOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomOrderError('');

    // 1. Mandatory Arabic check
    const trimmedAr = customNameAr.trim();
    if (!trimmedAr) {
      setCustomOrderError('يرجى ملء حقل الاسم بالعربي (حقل إجباري)!');
      return;
    }
    const hasArabicRegex = /[\u0600-\u06FF]/;
    if (!hasArabicRegex.test(trimmedAr)) {
      setCustomOrderError('الاسم بالعربي يجب أن يحتوي على حروف عربية صالحة وفخمة 👑');
      return;
    }

    // 2. Mandatory Phone check
    const trimmedPhone = customPhone.trim();
    if (!trimmedPhone) {
      setCustomOrderError('يرجى كتابة رقم هاتف الواتس الخاص بكم لتسهيل التواصل الفوري!');
      return;
    }

    setSubmittingCustomOrder(true);
    try {
      const orderId = doc(collection(db, 'orders')).id;
      
      const defaultTypes = [
        { id: 'premium', name: 'تيشيرت التاج المذهب الملكي (Premium)', priceLabel: 'السعر: 880 ج.م', priceValue: 880 },
        { id: 'classic', name: 'تيشيرت كلاسيك قطن مصري كلاسيكي (Classic)', priceLabel: 'السعر: 499 ج.م', priceValue: 499 },
        { id: 'duo', name: 'عرض الكابلز الثنائي المذهب (Duo)', priceLabel: 'السعر: 899 ج.م (قطعتين)', priceValue: 899 }
      ];
      
      const availableTypes = configApp.types && configApp.types.length > 0 ? configApp.types : defaultTypes;
      const selectedType = availableTypes.find(t => t.id === customFabric || t.name === customFabric) || availableTypes[0];
      const finalFabricName = selectedType.name;

      const formattedDisplayName = customNameEn.trim() 
        ? `${trimmedAr} (${customNameEn.trim()})` 
        : trimmedAr;

      const orderData: Order = {
        id: orderId,
        name: formattedDisplayName,
        phone: trimmedPhone,
        fabric: finalFabricName as any,
        notes: customNotes.trim() || 'طلب تخصيص قطعة مذهبة نادرة بالاسم.',
        designId: 'custom_order_form',
        status: 'pending',
        createdAt: serverTimestamp()
      };

      // Store in firestore
      await setDoc(doc(db, 'orders', orderId), orderData);
      setCustomOrderSuccess(true);

      // Craft beautiful WhatsApp message (WITHOUT customer's phone number as requested for privacy/cleanliness)
      const textMsg = `أهلاً براند إسمي ذهب الفخم 👑\n\nلقد قمت للتو بطلب تصميم ملكي مخصص بالاسم عبر الموقع:\n- الاسم المطلوب (بالعربي): ${trimmedAr}\n- الاسم المطلوب (بالإنجليزي): ${customNameEn.trim() || 'لا يوجد'}\n- نوع وخامة التيشرت: ${selectedType.name} (${selectedType.priceLabel})\n- ملاحظات وتعديلات خاصة: ${customNotes.trim() || 'لا يوجد'}\n\nبرجاء تأكيد حجز هذا الطلب الملكي الفاخر والبدء الفوري ⚡`;
      const encodedText = encodeURIComponent(textMsg);

      // Dispatch Telegram notification
      await sendTelegramNotification(orderData, textMsg);

      setTimeout(() => {
        window.open(`https://wa.me/${configApp.whatsappNumber}?text=${encodedText}`, '_blank');
      }, 1000);

    } catch (err) {
      console.error('Error submitting custom order:', err);
      setCustomOrderError('عذراً، حدث خطأ أثناء إرسال طلبكم الفاخر. يرجى تكرار المحاولة بعدها.');
    } finally {
      setSubmittingCustomOrder(false);
    }
  };

  // Check VIP code in gate
  const handleGateVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedCode = codeInputValue.trim().toUpperCase();
    if (!formattedCode) return;
    
    setCheckingCode(true);
    setGateError('');
    try {
      const codeRef = doc(db, 'accessCodes', formattedCode);
      const codeSnap = await getDoc(codeRef);
      if (!codeSnap.exists()) {
        setGateError('هذا الكود غير صحيح أو انتهت فترة إتاحته. فضلاً راجع الإدارة.');
        setCheckingCode(false);
        return;
      }

      const codeData = codeSnap.data() as AccessCode;
      const userEmail = `${formattedCode.toLowerCase()}@esmydahab.com`;
      const userPassword = `Pass-${formattedCode}`;

      if (codeData.used) {
        // If the code is already used, try to let them log in as the returning owner of this code.
        try {
          await signInWithEmailAndPassword(auth, userEmail, userPassword);
          localStorage.setItem('esm_code', formattedCode);
          setCodeInputValue('');
        } catch (loginErr: any) {
          console.warn('Email login failed, trying anonymous auth...', loginErr);
          // Fallback if they registered with anonymous auth before this email/pass update
          try {
            await signInAnonymously(auth);
            localStorage.setItem('esm_code', formattedCode);
            setCodeInputValue('');
          } catch (anonErr: any) {
            setGateError('أوبس! هذا الكود تم استخدامه مسبقاً. إذا كنت صاحب الكود، المرجو التواصل مع الدعم لمساعدتك.');
          }
        }
        setCheckingCode(false);
        return;
      }

      // If code is not used, register them
      let activeUser;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, userEmail, userPassword);
        activeUser = userCredential.user;
      } catch (signUpErr: any) {
        if (signUpErr.code === 'auth/email-already-in-use') {
          try {
            const userCredential = await signInWithEmailAndPassword(auth, userEmail, userPassword);
            activeUser = userCredential.user;
          } catch (signInErr) {
            throw new Error('البريد الإلكتروني المرتبط بالكود مستخدم ولدينا مشكلة في تسجيل دخولك.');
          }
        } else {
          // Fallback to anonymous auth if Email-Password is disabled in client's Firebase Console
          const userCredential = await signInAnonymously(auth);
          activeUser = userCredential.user;
        }
      }

      const uid = activeUser.uid;

      // Mark code as used
      await updateDoc(codeRef, {
        used: true,
        activatedBy: uid
      });

      // Save in Locastorage
      localStorage.setItem('esm_code', formattedCode);

      // Proceed state
      setCodeInputValue('');
    } catch (err: any) {
      console.error(err);
      setGateError('فشل نظام الاتصال في مراجعة التذكرة. لعل المشكلة بهبّة سيرفر.');
    } finally {
      setCheckingCode(false);
    }
  };

  // Setup VIP parameters
  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError('');
    const cleanUsername = setupUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanUsername || cleanUsername.length < 3) {
      setSetupError('اسم الحساب فريد ويجب أن يتكون فقط من حروف إنجليزية وأرقام وبطول 3 على الأقل.');
      return;
    }
    if (!setupFile) {
      setSetupError('يرجى اختيار صورتك الفخمة بالتيشيرت لتجهيز ملفك الراقي.');
      return;
    }
    setSavingSetup(true);

    try {
      // 1. Check uniqueness of username
      const uQuery = query(collection(db, 'users'), where('username', '==', cleanUsername));
      const qSnap = await getDocs(uQuery);
      if (!qSnap.empty) {
        setSetupError('عذراً، اسم المستخدم هذا محجوز مسبقاً لعضو فخم آخر!');
        setSavingSetup(false);
        return;
      }

      // 2. Upload file to ImgBB
      const photoUrl = await uploadToImgBB(setupFile);

      // 3. Retrieve original accessCode bought product type
      const activeCode = localStorage.getItem('esm_code') || 'FREE-TRIAL';
      let boughtProductLevel: 1 | 2 | 3 = 1;
      try {
        const codeSnap = await getDoc(doc(db, 'accessCodes', activeCode));
        if (codeSnap.exists()) {
          const pType = codeSnap.data().product;
          if (pType === 'premium') boughtProductLevel = 3;
          else if (pType === 'duo') boughtProductLevel = 2;
        }
      } catch (err) {}

      // 4. Create user doc
      const arabic = setupArabicName.trim();
      const english = setupEnglishName.trim();
      const finalDisplayName = (arabic && english)
        ? `${arabic} ● ${english}`
        : (arabic || english || `@${cleanUsername}`);

      const newUserProfile: UserProfile = {
        id: auth.currentUser!.uid,
        uid: auth.currentUser!.uid,
        code: activeCode,
        accessCode: activeCode,
        username: cleanUsername,
        arabicName: arabic || '',
        englishName: english || '',
        displayName: finalDisplayName,
        bio: setupBio.trim() || 'شخص فحم يقتني ملابس الملوك الفخمة من ESM',
        phone: setupPhone.trim() || '',
        photoUrl,
        level: boughtProductLevel, // Level starts according to what product they bought
        referralCount: 0,
        likes: 0,
        views: 0,
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'users', auth.currentUser!.uid), newUserProfile);
      localStorage.setItem('esm_my_profile', JSON.stringify(newUserProfile));
      setUserProfile(newUserProfile);
    } catch (err: any) {
      console.error(err);
      setSetupError('حدث شيء خاطئ أثناء رفع ملفك. يرجى إعادة المحاولة.');
    } finally {
      setSavingSetup(false);
    }
  };

  const copyShareLink = (username: string) => {
    const link = `${window.location.origin}/${username}?ref=${username}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Route Views Matcher
  const isProfileView = currentPath.substring(1).trim().length > 0 && !['admin', 'apps', 'api', 'assets', 'icons', 'public'].includes(currentPath.substring(1).trim().toLowerCase());
  const isAdminView = currentPath === '/admin' || currentPath === '/admin/';
  const isAppsView = currentPath === '/apps' || currentPath === '/apps/';

  // RENDERING LOGICS

  // Admin routing
  if (isAdminView) {
    return <AdminDashboard />;
  }

  // User VIP Dashboard /apps route
  if (isAppsView) {
    window.location.replace(configApp.vipAppUrl || DEFAULT_VIP_APP_URL);
    return null;
  }


  // PUBLIC PROFILE VIEW /{username}
  if (isProfileView) {
    const isProfileFound = !!publicProfile;

    return (
      <div className="min-h-screen bg-[#FAFAF9] text-stone-900 relative flex flex-col justify-between overflow-hidden">
        <ParticleBackground />

        {/* Dynamic header - Hidden in Standalone PWA mode for premium feeling */}
        {!isStandalone && (
          <header className="border-b border-stone-200 bg-white sticky top-0 z-40 backdrop-blur w-full">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
              <button onClick={() => navigateTo('/')} className="flex items-center gap-2 cursor-pointer bg-transparent border-0">
                <Crown className="w-6 h-6 text-gold gold-glow" />
                <span className="font-serif font-black tracking-wider text-sm gold-gradient">ESM • إسمي ذهب</span>
              </button>
              <button 
                onClick={() => navigateTo('/')}
                className="text-xs font-bold text-stone-500 hover:text-gold flex items-center gap-1 transition-all cursor-pointer bg-transparent border-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>اطلب قطعة لنفسك</span>
              </button>
            </div>
          </header>
        )}

        <main className="flex-grow flex items-center justify-center p-4 relative z-10 my-8">
          {loadingPublicProfile ? (
            <div className="text-center">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full mx-auto"
              />
              <p className="text-xs text-stone-500 mt-4">جاري فتح ملف الأسياد الفخم...</p>
            </div>
          ) : isProfileFound && publicProfile ? (
            /* Premium Profile matched! */
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md bg-white border border-stone-200 p-8 rounded-3xl shadow-xl text-center backdrop-blur-md relative space-y-6"
            >
              {/* Profile Image card */}
              <div className="relative inline-block mx-auto">
                <img 
                  src={publicProfile.photoUrl} 
                  alt={publicProfile.displayName} 
                  className="w-28 h-28 rounded-full object-cover border-4 border-gold mx-auto shadow-md cursor-zoom-in hover:brightness-110 transition-all"
                  onClick={() => setFullscreenImage(publicProfile.photoUrl)}
                />
                {publicProfile.level === 3 && (
                  <div className="absolute top-0 right-0 bg-white border border-gold rounded-full p-2 shadow-lg shadow-gold/10">
                    <Crown className="w-6 h-6 text-gold gold-glow" />
                  </div>
                )}
              </div>

              {/* Badges, Names and Bio (Combined as Child 2) */}
              <div className="space-y-4 text-center">
                <div className="space-y-1">
                  <div className="flex justify-center items-center gap-1.5">
                    <h1 className="text-xl font-black font-serif gold-gradient">وجدنا قطعة باسمك {publicProfile.displayName} ✨</h1>
                  </div>
                  <p className="text-xs text-stone-500 font-mono font-semibold">@{publicProfile.username}</p>
                  <div className="pt-1">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase inline-block mx-auto ${
                      publicProfile.level === 3 ? 'bg-gold text-black shadow shadow-gold/20' :
                      publicProfile.level === 2 ? 'bg-zinc-200 text-black' :
                      'bg-zinc-100 text-stone-600'
                    }`}>
                      {publicProfile.level === 3 ? 'رتبة التاج الذهبي الملكية 👑' :
                       publicProfile.level === 2 ? 'الرتبة الفضية الفاخرة🥈' :
                       'الرتبة البرونزية كلاسيك🥉'}
                    </span>
                  </div>
                </div>

                <div className="py-4 border-y border-stone-100">
                  <p className="text-xs text-stone-700 font-medium italic leading-relaxed select-all">
                    "{publicProfile.bio || 'محب ومقتني لملابس الأسياد الفخمة من ESM'}"
                  </p>
                </div>
              </div>

              {/* Likes and Interactivity (Child 3) */}
              <div className="p-4 bg-stone-50 border border-stone-100 rounded-2xl flex flex-col items-center justify-center space-y-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-32 h-32 bg-gold/5 blur-2xl rounded-full pointer-events-none" />
                <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider relative">ادعم صاحب الملف المذهب بنقرة إعجاب</span>
                
                <div className="flex items-center gap-4 relative">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleToggleLike}
                    className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all cursor-pointer shadow-md ${
                      hasLikedPublic
                        ? 'bg-red-50 border-red-500 text-white shadow-red-500/10'
                        : 'bg-white border-stone-200 text-stone-400 hover:border-gold/30 hover:text-gold'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${hasLikedPublic ? 'fill-white text-white' : ''}`} />
                  </motion.button>
                  
                  <div className="text-right">
                    <p className="text-xs text-stone-500 font-medium font-sans">إجمالي التفاعل الحالي</p>
                    <p className="text-sm font-black text-stone-900 font-sans">{publicProfile?.likes || 0} إعجاب فخم ✨</p>
                  </div>
                </div>
              </div>

              {/* Order button redirects back to Homepage (Child 4) */}
              <div className="space-y-3">
                <button
                  onClick={() => {
                    navigateTo(`/?ref=${publicProfile.username}`);
                    setTimeout(() => {
                      const el = document.getElementById('leaderboard-section');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }, 500);
                  }}
                  className="w-full py-3 bg-stone-950 text-white hover:bg-stone-900 transition-colors text-xs font-black rounded-xl cursor-pointer shadow-lg flex items-center justify-center gap-2"
                >
                  <span>شوف أعلى المتصدرين واطلب قطعتك المذهبة 🏆</span>
                </button>
                <p className="text-[10px] text-stone-500 leading-relaxed font-sans mt-1">
                  احصل على تيشيرت وان سايز أوفرسايز قطن مصري 100% ثقيل مطرز باسمك الفخم بلمسات ملكية أنيقة.
                </p>
              </div>
            </motion.div>
          ) : (
            /* User profile not found fallback */
            <div className="text-center space-y-4 max-w-sm">
              <div className="w-16 h-16 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center mx-auto">
                <HelpCircle className="w-8 h-8 text-stone-400" />
              </div>
              <h2 className="text-lg font-bold text-stone-900">الملف الفخم غير مدرج بالبراند</h2>
              <p className="text-xs text-stone-500 leading-relaxed">
                عذراً، هذا الحساب ليس مسجلاً أو ربما تم تغيير اسم المعرف الملكي الخاص به. يرجى مراجعة وتفقد الرابط الفخم مجدداً.
              </p>
              <button 
                onClick={() => navigateTo('/')}
                className="px-4 py-2 bg-stone-950 text-white rounded-xl text-xs hover:bg-stone-900 cursor-pointer"
              >
                العودة للرئيسية
              </button>
            </div>
          )}
        </main>

        {!isStandalone && (
          <footer className="border-t border-stone-200 bg-white py-4 text-center text-[10px] text-stone-500 leading-relaxed relative z-10">
            <p>© جميع الحقوق محفوظة لبراند إسمي ذهب • 2026</p>
          </footer>
        )}
      </div>
    );
  }

  // HOMEPAGE VIEW (/) DEFAULT VIEW
  return (
    <div className="min-h-screen bg-[#FAFAF9] text-stone-900 relative flex flex-col justify-between overflow-x-hidden">
      <ParticleBackground />

      {/* LUXURY ROYAL HEADER */}
      <header className="border-b border-stone-200 bg-white/95 sticky top-0 z-40 backdrop-blur w-full">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo element */}
          <button onClick={() => navigateTo('/')} className="flex items-center gap-2 bg-transparent border-0 cursor-pointer">
            <Crown className="w-7 h-7 text-gold gold-glow" />
            <h1 className="font-serif font-black tracking-wider text-md sm:text-lg gold-gradient">ESM • إسمي ذهب</h1>
          </button>

          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                const targetUrl = configApp.vipAppUrl || DEFAULT_VIP_APP_URL;
                window.open(targetUrl, '_blank');
              }}
              className="px-4 py-2 rounded-xl bg-stone-950 text-white text-xs font-black hover:bg-stone-900 transition-colors cursor-pointer flex items-center gap-1 shadow-md border border-stone-850"
            >
              <Crown className="w-3.5 h-3.5 text-gold gold-glow" />
              <span>بوابة الدخول الملكي VIP 👑</span>
            </button>
            <button 
              onClick={() => setIsPolicyOpen(true)}
              className="text-xs font-bold text-stone-500 hover:text-gold transition-colors hidden sm:inline-block cursor-pointer bg-transparent border-0"
            >
              سياسة الضمان والاسترجاع 📖
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-7xl mx-auto px-4 py-8 relative z-10 w-full space-y-16">
        
        {/* HERO SLOGAN SECTION */}
        <section className="text-center max-w-3xl mx-auto space-y-6 pt-4">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-gold/10 border border-gold/20 rounded-full"
          >
            <Crown className="w-3.5 h-3.5 text-gold gold-glow animate-pulse" />
            <span className="text-[10px] text-gold font-extrabold uppercase tracking-widest leading-relaxed">براند الألبسة الفخمة والأسياد • ESM Store</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-5xl font-black font-serif leading-tight sm:leading-none text-stone-900 gold-gradient"
          >
            بصمة فخامة نادرة تخبر العالم بهويتك!
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xs sm:text-sm text-stone-600 max-w-xl mx-auto leading-relaxed"
          >
            خطوط استثنائية منسوجة بقطن مصري 100% ثقيل للغاية ثقيل القوام (Oversized). سواء كنت تبحث عن تيشيرت مذهب ومطرز ومصمم يدوياً باسمك الفاخر، أو تبحث عن قطع فنية معاصرة وجذابة تناسب ذوق الأسياد؛ علامتنا صممت لتتفوق على أرقى دور الأزياء العالمية بأسلوب مبهر.
          </motion.p>
        </section>

        {/* TOP SEARCH BAR IN CATOLOGUE */}
        <section id="search-section" className="max-w-2xl mx-auto bg-white border border-stone-200 rounded-3xl p-6 md:p-8 space-y-6 shadow-lg shadow-stone-100/60 backdrop-blur">
          <div className="text-center space-y-2">
            <h3 className="text-md sm:text-lg font-bold text-stone-900 flex items-center justify-center gap-2">
              <Search className="w-5 h-5 text-gold" />
              <span>ابحث عن نمط اسمك المذهب</span>
            </h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              اكتب اسمك باللغة العربية أو الإنجليزية لتفقد جاهزيته بالخط المذهب الفاخر من مصممينا المعتمدين.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="مثال: علي، أحمد، سارة، مريم..."
              className="flex-grow px-4 py-3 bg-stone-50 border border-stone-200 text-stone-900 text-xs rounded-xl focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold transition-all"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="px-5 py-3 bg-stone-950 hover:bg-stone-900 text-white font-black text-xs rounded-xl transition-colors cursor-pointer"
            >
              {isSearching ? 'جاري الاستعلام...' : 'ابحث الآن'}
            </button>
          </form>

          {/* Results Display */}
          <AnimatePresence mode="wait">
            {hasSearched && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4 pt-4 border-t border-stone-100"
              >
                {searchResults.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center justify-center p-4 bg-amber-50/50 rounded-2xl border border-gold/20 text-center space-y-1">
                      <div className="text-xs sm:text-sm font-black text-[#A27B2B] flex items-center justify-center gap-2 gold-glow">
                        <Sparkles className="w-4 h-4 text-[#A27B2B] animate-bounce" />
                        <span>وجدنا قطعة باسمك!</span>
                        <Crown className="w-4 h-4 text-[#A27B2B]" />
                      </div>
                      <p className="text-[10px] text-stone-600">لقد حظيت بتصميم مذهب نادر يليق بك تماماً:</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {searchResults.map((design) => (
                        <div 
                          key={design.id} 
                          className="bg-white border border-stone-100 hover:border-gold/30 rounded-2xl p-4 flex gap-4 items-center transition-all group relative overflow-hidden shadow-sm"
                        >
                          <div className="w-20 h-20 bg-stone-50 p-1.5 rounded-xl flex items-center justify-center border border-stone-100">
                            <img 
                              src={design.imageUrl} 
                              alt={design.name} 
                              className="h-full object-contain group-hover:scale-105 transition-transform cursor-zoom-in hover:brightness-110" 
                              onClick={() => setFullscreenImage(design.imageUrl)}
                            />
                          </div>
                          
                          <div className="flex-grow space-y-1 text-right">
                            <h4 className="font-bold text-xs text-stone-900">{design.name}</h4>
                            <p className="text-[10px] text-stone-500 font-serif leading-relaxed">بتاج الملوك المذهب</p>
                            <button
                              onClick={() => {
                                const textUrl = `${design.whatsappMessage}\nالتصميم: ${design.imageUrl}`;
                                window.open(`https://wa.me/${configApp.whatsappNumber}?text=${encodeURIComponent(textUrl)}`, '_blank');
                              }}
                              className="px-3 py-1.5 bg-[#B89753] hover:opacity-90 text-white text-[10px] font-black rounded-lg cursor-pointer transition-all"
                            >
                              اطلب وخصص باسمك
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Lead form logic: Name not found */
                  <div className="space-y-4 text-center py-2">
                    <div className="p-3 bg-stone-50 border border-stone-200 text-stone-650 text-xs rounded-xl leading-relaxed text-stone-600">
                      الاسم الذي استعلمت عنه "<span className="text-gold font-bold">{searchedName}</span>" فريد من نوعه للغاية، ولأنه لا يوجد قطعة مطابقة للجاهز، سنقوم بتفصيل وتصميم خط مذهب خاص باسمك مخصوص فوراً! تعرّف على طلب التخصيص الاستثنائي:
                    </div>

                    {leadSuccess ? (
                      <div className="p-4 bg-amber-50 border border-gold/20 text-[#A27B2B] text-xs rounded-xl font-bold font-sans space-y-1">
                        <div>تم حجز وتنسيق طلبك الفاخر كطلب خاص!</div>
                        <div className="text-[10px] text-stone-500 font-mono mt-1">جاري توجيهك لواتساب براند الأسياد لبدء الطباعة والتحضير الفوري...</div>
                      </div>
                    ) : (
                      <form onSubmit={handleQuickOrderSubmit} className="space-y-3 text-right">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-stone-500 text-[10px] font-bold mb-1 mr-1">الاسم المرغوب طباعته وحفره بدقة على الصدر</label>
                            <input
                              type="text"
                              required
                              value={leadName}
                              onChange={(e) => setLeadName(e.target.value)}
                              placeholder="مثال: يوسف، سمر..."
                              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 text-xs text-stone-900 rounded-xl focus:outline-none focus:border-gold"
                            />
                          </div>

                          <div>
                            <label className="block text-stone-500 text-[10px] font-bold mb-1 mr-1">رقم الواتساب وبداية كود الدولة</label>
                            <input
                              type="tel"
                              required
                              value={leadPhone}
                              onChange={(e) => setLeadPhone(e.target.value)}
                              placeholder="مثال: 20123456789"
                              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 text-xs text-stone-900 rounded-xl focus:outline-none focus:border-gold"
                              style={{ direction: 'ltr' }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-stone-500 text-[10px] font-bold mb-1 mr-1">الخامة وقصة التيشيرت</label>
                            <select
                              value={leadFabric}
                              onChange={(e) => setLeadFabric(e.target.value as any)}
                              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 text-xs text-stone-900 rounded-xl focus:outline-none focus:border-gold font-bold"
                            >
                              <option value="Premium">قطن مذهب فاخر بالتاج (Premium)</option>
                              <option value="Classic">قطن مصري كلاسيكي (Classic)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-stone-500 text-[10px] font-bold mb-1 mr-1">أي ملاحظات إضافية (ألوان، مقاسات خاصة)</label>
                            <input
                              type="text"
                              value={leadNotes}
                              onChange={(e) => setLeadNotes(e.target.value)}
                              placeholder="أوردر مقاس XL، شريط الظهر كلاسيك..."
                              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 text-xs text-stone-900 rounded-xl focus:outline-none focus:border-gold"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={submittingLead}
                          className="w-full py-2.5 bg-stone-950 hover:bg-stone-900 text-white text-xs font-black rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-md"
                        >
                          {submittingLead ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <span>تفصيل تيشيرت فخم باسمي</span>
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Custom Royal Order Toggle & Form */}
          <div className="pt-4 border-t border-stone-100 flex flex-col items-center gap-3">
            <p className="text-[11px] text-stone-500 text-center">مش لاقي اسمك في كتالوج تصاميم الأسياد؟ لا تقلق!</p>
            <button
              type="button"
              id="toggle-custom-form-btn"
              onClick={() => {
                setShowCustomOrderForm(!showCustomOrderForm);
                if (!customFabric) {
                  const defaultTypes = [
                     { id: 'premium', name: 'تيشيرت التاج المذهب الملكي (Premium)', priceLabel: 'السعر: 880 ج.م', priceValue: 880 },
                     { id: 'classic', name: 'تيشيرت كلاسيك قطن مصري كلاسيكي (Classic)', priceLabel: 'السعر: 499 ج.م', priceValue: 499 },
                     { id: 'duo', name: 'عرض الكابلز الثنائي المذهب (Duo)', priceLabel: 'السعر: 899 ج.م (قطعتين)', priceValue: 899 }
                  ];
                  const available = configApp.types && configApp.types.length > 0 ? configApp.types : defaultTypes;
                  setCustomFabric(available[0].id || available[0].name);
                }
              }}
              className="px-4 py-2 bg-amber-500/10 border border-[#B89753]/30 hover:border-[#B89753] rounded-full text-[11px] font-extrabold tracking-wide text-[#A27B2B] cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-gold gold-glow animate-pulse" />
              <span>{showCustomOrderForm ? 'إغلاق فورم الطلب الخاص ❌' : 'لو عايز تصميم باسمك اضغط هنا 👑'}</span>
            </button>
          </div>

          <AnimatePresence>
            {showCustomOrderForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pt-4 border-t border-stone-100 space-y-4 text-right"
              >
                <div className="p-4 bg-amber-50 border border-gold/15 rounded-2xl text-center space-y-1">
                  <h4 className="text-xs font-black text-[#A27B2B] flex items-center justify-center gap-1">
                    <Crown className="w-3.5 h-3.5 text-gold" />
                    <span>مواصفات واستمارة تفصيل الاسم الملكي المخصوص</span>
                  </h4>
                  <p className="text-[10px] text-stone-500 leading-relaxed">
                    قم بتعبئة الاستمارة التالية، وسيتم إدراج طلبك فوراً في لوحة تحكم المصنع وتوجيهك لتنسيق الشحن والبدء الفوري.
                  </p>
                </div>

                {customOrderSuccess ? (
                  <div className="p-4 bg-amber-50 border border-gold/20 text-stone-900 text-xs rounded-xl font-bold font-sans text-center space-y-2">
                    <div className="font-extrabold text-[#A27B2B]">🏆 لقد تم تسجيل وحجز أوردر تخصيص تيشيرت اسمك بنجاح!</div>
                    <div className="text-[10px] text-stone-500 font-mono">جاري الآن نقلك وتوجيهك لفتح محادثة واتساب مع براند الأسياد لإكمال التصميم الفخم...</div>
                  </div>
                ) : (
                  <form onSubmit={handleCustomOrderSubmit} id="custom-royal-order-form" className="space-y-4">
                    {customOrderError && (
                      <div className="p-2.5 bg-red-50 border border-red-200 text-red-600 text-[10px] rounded-lg text-center font-bold">
                        ⚠️ {customOrderError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-right">
                      <div>
                        <label className="block text-stone-600 text-[10px] font-bold mb-1 mr-1">الاسم باللغة العربية (إجباري) ✍️</label>
                        <input
                          type="text"
                          required
                          value={customNameAr}
                          onChange={(e) => setCustomNameAr(e.target.value)}
                          placeholder="مثلاً: يوسف أو مريم"
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-200 text-xs text-stone-900 rounded-xl focus:outline-none focus:border-gold text-right"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-500 text-[10px] font-semibold mb-1 mr-1">الاسم بالإنجليزية (اختياري) 🔠</label>
                        <input
                          type="text"
                          value={customNameEn}
                          onChange={(e) => setCustomNameEn(e.target.value)}
                          placeholder="مثلاً: Joseph or Mary"
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-200 text-xs text-stone-900 rounded-xl focus:outline-none focus:border-gold text-right"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-right">
                      <div>
                        <label className="block text-stone-600 text-[10px] font-bold mb-1 mr-1">رقم جوال الواتساب للمتابعة 📱</label>
                        <input
                          type="tel"
                          required
                          value={customPhone}
                          onChange={(e) => setCustomPhone(e.target.value)}
                          placeholder="مثال: 201200000000"
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-200 text-xs text-stone-900 rounded-xl focus:outline-none focus:border-gold"
                          style={{ direction: 'ltr' }}
                        />
                      </div>

                      <div>
                        <label className="block text-stone-600 text-[10px] font-bold mb-1 mr-1">اختر نوع تيشيرت وخامة الأسياد 👕</label>
                        <select
                          value={customFabric}
                          onChange={(e) => setCustomFabric(e.target.value)}
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-200 text-xs text-stone-900 rounded-xl focus:outline-none focus:border-gold font-bold text-right"
                        >
                          {(configApp.types && configApp.types.length > 0 ? configApp.types : [
                            { id: 'premium', name: 'تيشيرت التاج المذهب الملكي (Premium)', priceLabel: 'السعر: 880 ج.م', priceValue: 880 },
                            { id: 'classic', name: 'تيشيرت كلاسيك قطن مصري كلاسيكي (Classic)', priceLabel: 'السعر: 499 ج.م', priceValue: 499 },
                            { id: 'duo', name: 'عرض الكابلز الثنائي المذهب (Duo)', priceLabel: 'السعر: 899 ج.م (قطعتين)', priceValue: 899 }
                          ]).map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1 text-right">
                      <label className="block text-stone-500 text-[10px] font-semibold mb-1 mr-1">ملاحظات، مقاسات أو تعديلات مخصصة لشكل القطعة 🎨</label>
                      <textarea
                        rows={2}
                        value={customNotes}
                        onChange={(e) => setCustomNotes(e.target.value)}
                        placeholder="اكتب هنا المقاس المطلوب (مثل XL أو Oversized) وأي ألوان خيوط ترغب في تفضيلها..."
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 text-xs text-stone-900 rounded-xl focus:outline-none focus:border-gold text-right"
                      />
                    </div>

                    {/* DYNAMIC PRICE LABEL BASED ON SELECTION */}
                    {(() => {
                      const defaultTypes = [
                        { id: 'premium', name: 'تيشيرت التاج المذهب الملكي (Premium)', priceLabel: 'السعر: 880 ج.م', priceValue: 880 },
                        { id: 'classic', name: 'تيشيرت كلاسيك قطن مصري كلاسيكي (Classic)', priceLabel: 'السعر: 499 ج.م', priceValue: 499 },
                        { id: 'duo', name: 'عرض الكابلز الثنائي المذهب (Duo)', priceLabel: 'السعر: 899 ج.م (قطعتين)', priceValue: 899 }
                      ];
                      const available = configApp.types && configApp.types.length > 0 ? configApp.types : defaultTypes;
                      const selected = available.find(t => t.id === customFabric || t.name === customFabric) || available[0];
                      return selected ? (
                        <div className="bg-stone-100 border border-stone-200 p-3 rounded-2xl text-center space-y-0.5">
                          <span className="text-[10px] text-stone-500 block">مواصفات وسعر هذه الخامة المحددة:</span>
                          <span className="text-xs font-black text-stone-900 font-sans leading-relaxed">{selected.priceLabel}</span>
                        </div>
                      ) : null;
                    })()}

                    <button
                      type="submit"
                      disabled={submittingCustomOrder}
                      className="w-full py-2.5 bg-stone-950 hover:bg-stone-900 text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
                    >
                      {submittingCustomOrder ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                        <Crown className="w-4 h-4 text-gold" />
                          <span>تأكيد طلب التفصيل الملكي المخصوص</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* HOMEPAGE SPLIT CATALOGUE */}
        <section id="products-catalogue" className="space-y-16">
          {/* SECTION 1: CUSTOM CLOTHING ON-DEMAND */}
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1 bg-amber-500/10 border border-gold/20 px-3 py-1 rounded-full text-[#A27B2B] text-[10px] font-extrabold shadow-sm">
                <Crown className="w-3 h-3 text-gold" />
                <span>طباعة مخصوصة وتطريز مذهب شخصي On-Demand</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black font-serif gold-gradient text-stone-900">الملابس المخصوصة بالاسم 👑</h3>
              <p className="text-xs text-stone-500 leading-relaxed">الباقات الثلاث والقطع المخصوصة والجلابيات المصممة والمنقوشة خصيصاً باسمك بالخطوط الذهبية</p>
            </div>

            {loadingFeatured ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {/* 2 COUPLING DOUBLE PACKAGES */}
                {[
                  {
                    id: 'classic_duo',
                    name: 'عرض الثنائي الكلاسيك بالاسم (Classic Duo)',
                    sub: 'باقة كابلز ثنائية كلاسيك 👥',
                    price: configApp.classicPrice,
                    description: configApp.classicDescription,
                    imageUrl: configApp.classicImageUrl || '',
                    colorClass: 'silver-gradient',
                    isCustom: true,
                    isDuo: true,
                    availableSizes: ['S', 'M', 'L', 'XL', 'XXL']
                  },
                  {
                    id: 'premium_duo',
                    name: 'عرض الثنائي البريميوم بالتاج المذهب (Premium Duo) 👑',
                    sub: 'الباقة الثنائية الملكية بالخامات والتاج 🔥',
                    price: configApp.premiumPrice,
                    description: configApp.premiumDescription,
                    imageUrl: configApp.premiumImageUrl || '',
                    colorClass: 'gold-gradient',
                    isCustom: true,
                    isDuo: true,
                    availableSizes: ['S', 'M', 'L', 'XL', 'XXL', 'XXXL']
                  }
                ].map((pkg) => {
                  const isFocused = configApp.focusedProduct === pkg.id;
                  return (
                    <div 
                      key={pkg.id}
                      className={`bg-white rounded-3xl p-6 hover:shadow-xl transition-all flex flex-col justify-between space-y-4 relative overflow-hidden shadow-md text-right ${
                        isFocused 
                          ? 'border-2 border-gold shadow-gold/5 transform md:-translate-y-2 bg-stone-50/20' 
                          : 'border border-stone-200 hover:border-gold/25'
                      }`}
                    >
                      {isFocused && (
                        <div className="absolute top-0 left-0 bg-gold text-stone-950 text-[8px] font-black px-2.5 py-1 rounded-br-xl uppercase tracking-widest animate-pulse z-10">
                          موصى به 🔥
                        </div>
                      )}
                      
                      <div className="space-y-3">
                        {pkg.imageUrl && (
                          <div className="w-full h-44 overflow-hidden rounded-2xl border border-stone-100 relative bg-stone-50">
                            <img 
                              src={pkg.imageUrl} 
                              alt={pkg.name} 
                              className="w-full h-full object-cover rounded-2xl hover:scale-105 transition-all duration-500"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                        <div className="text-center space-y-1">
                          <span className="text-[9px] font-bold text-stone-500 uppercase tracking-widest">
                            {pkg.sub}
                          </span>
                          <h4 className="text-xs sm:text-sm font-black gold-gradient leading-relaxed">{pkg.name}</h4>
                          <div className="font-mono text-xl font-bold text-gold">
                            {pkg.price} <span className="text-[10px] font-sans text-stone-500">EGP</span>
                          </div>
                        </div>

                        <p className="text-[9px] text-stone-605 text-stone-600 leading-relaxed font-sans whitespace-pre-line bg-stone-50 p-3 rounded-xl border border-stone-100">
                          {pkg.description}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setCheckoutSuccess(false);
                          setCheckoutProduct(pkg);
                          setCheckoutName('');
                          setCheckoutPhone('');
                          setCheckoutAltPhone('');
                          setCheckoutAddress('');
                          setCheckoutSize(pkg.availableSizes[1] || 'L');
                          setCheckoutColor('أسود');
                          setCheckoutNotes('');
                        }}
                        className={`w-full py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                          isFocused 
                            ? 'bg-[#B89753] text-white hover:opacity-95 shadow-md shadow-gold/15' 
                            : 'bg-stone-950 hover:bg-stone-900 text-white'
                        }`}
                      >
                        اطلب هذه الباقة الملكية
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* FIREBASE CUSTOM DESIGNS FOR ON-DEMAND PRESETS */}
            <div className="space-y-4 max-w-7xl mx-auto pt-8">
              <div className="text-right border-r-2 border-gold pr-3 mb-4">
                <h4 className="text-xs font-black text-stone-850 text-stone-800">تصاميم الأسماء المكتوبة الملكية المتاحة بالكتالوج</h4>
                <p className="text-[10px] text-stone-500 leading-relaxed">اختر أحد التصاميم الجاهزة المذهبة للتفصيل الفوري باسم مخصص من اختيارك</p>
              </div>

              {loadingFeatured ? (
                <div className="flex justify-center py-6">
                  <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (() => {
                const customDesigns = featuredDesigns.filter(d => d.isCustom !== false);
                if (customDesigns.length === 0) {
                  return <p className="text-[10px] text-stone-500 text-center py-4">سيتم إدراج المزيد من التصاميم المذهبة المخصصة قريباً بعون الله.</p>;
                }
                const customCategories = ['الجميع', ...Array.from(new Set(customDesigns.map(d => d.category).filter(Boolean)))];
                const filteredCustom = customDesigns.filter(d => selectedCustomCategory === 'الجميع' || d.category === selectedCustomCategory);

                return (
                  <div className="space-y-4">
                    {/* Category filter pills */}
                    {customCategories.length > 1 && (
                      <div className="flex flex-wrap gap-1.5 justify-end mb-4 font-sans" dir="rtl">
                        <span className="text-[10px] text-stone-500 flex items-center ml-2">المجموعة والتصنيف:</span>
                        {customCategories.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCustomCategory(cat)}
                            className={`text-[10.5px] px-3 py-1 rounded-full border transition-all cursor-pointer font-bold ${
                              selectedCustomCategory === cat
                                ? 'bg-[#B89753] text-white border-[#B89753] shadow-sm shadow-gold/10'
                                : 'bg-stone-50 text-stone-600 border-stone-200 hover:text-stone-950 hover:bg-stone-100'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    )}

                    {filteredCustom.length === 0 ? (
                      <p className="text-[10px] text-stone-400 text-center py-6">لا توجد قطع تحت هذا التصنيف حالياً.</p>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {filteredCustom.map((design) => {
                          const fallbackSizes = ['M', 'L', 'XL', 'XXL'];
                          const sizesToUse = design.availableSizes && design.availableSizes.length > 0 ? design.availableSizes : fallbackSizes;
                          return (
                            <div 
                              key={design.id}
                              className="bg-white border border-stone-200 rounded-3xl p-4 flex flex-col justify-between space-y-4 hover:border-gold/30 hover:shadow-xl hover:shadow-gold/5 transition-all text-center group relative overflow-hidden shadow-sm"
                            >
                              <div className="h-40 bg-stone-50/60 p-3 rounded-2xl flex items-center justify-center border border-stone-100 relative overflow-hidden">
                                <img 
                                  src={design.imageUrl} 
                                  alt={design.name} 
                                  className="h-full object-contain group-hover:scale-105 transition-all duration-300 cursor-zoom-in hover:brightness-110" 
                                  onClick={() => setFullscreenImage(design.imageUrl)}
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute top-2 right-2 bg-black/85 px-2 py-0.5 rounded text-[8px] font-bold text-gold border border-gold/25 flex items-center gap-0.5 z-10 animate-none">
                                  <Crown className="w-2.5 h-2.5 text-gold" style={{ display: 'inline-block' }} />
                                  <span>تطريز ذهبي مخصوص</span>
                                </div>
                                {design.category && (
                                  <div className="absolute top-2 left-2 bg-amber-500/10 text-amber-600 text-[8.5px] font-bold px-1.5 py-0.5 rounded border border-amber-500/20 z-10 shadow-sm">
                                    <span>{design.category}</span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="space-y-1.5 text-right font-sans">
                                <h4 className="font-bold text-xs text-stone-900 group-hover:text-gold transition-colors">{design.name}</h4>
                                <p className="text-[10px] text-stone-500 leading-relaxed line-clamp-2">
                                  {design.description || 'تصميم فخم مطرز بأروع الخيوط الذهبية مخصوص باسمك لتفاصيل ملكية.'}
                                </p>
                              </div>

                              {/* Price or Sale pricing section */}
                              <div className="flex items-center justify-between text-[11px] font-sans px-1 text-right">
                                {design.price ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[#A27B2B] font-extrabold">{design.price} EGP</span>
                                    {design.originalPrice && (
                                      <span className="text-stone-400 line-through text-[9px]">{design.originalPrice}</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-stone-400 font-bold text-[9.5px]">السعر عند الطلب</span>
                                )}

                                {design.discountText && (
                                  <span className="bg-red-500/10 text-red-500 text-[9px] px-1.5 py-0.25 rounded font-black">{design.discountText}</span>
                                )}
                              </div>

                              <button
                                onClick={() => {
                                  setCheckoutSuccess(false);
                                  setCheckoutProduct({
                                    ...design,
                                    availableSizes: sizesToUse
                                  });
                                  setCheckoutName('');
                                  setCheckoutPhone('');
                                  setCheckoutAltPhone('');
                                  setCheckoutAddress('');
                                  setCheckoutSize(sizesToUse[1] || 'L');
                                  setCheckoutColor(design.availableColors?.[0] || 'أسود');
                                  setCheckoutNotes('');
                                }}
                                className="w-full py-2 bg-[#B89753] hover:opacity-95 text-white font-black text-[10px] rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1"
                              >
                                <ShoppingBag className="w-3.5 h-3.5 text-white" />
                                <span>اطلب الآن بالمقاس</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* SECTION 2: REGULAR CLOTHING */}
          <div className="space-y-8 pt-12 border-t border-stone-200">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1 bg-zinc-100 border border-zinc-200 px-3 py-1 rounded-full text-zinc-800 text-[10px] font-extrabold shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-zinc-650 text-zinc-600 animate-pulse" />
                <span>تصاميم عصرية واستايل ونقوش جاهزة حلوة ومتميزة</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black font-serif gold-gradient text-stone-900">الملابس العادية والجاهزة 🔥</h3>
              <p className="text-xs text-stone-500 leading-relaxed">نقوش عصرية وخطوط ملونة ستايل ورسومات جاهزة كاجوال بخامات حلوة ممتازة وعملية</p>
            </div>

            {loadingFeatured ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (() => {
              const regularDesigns = featuredDesigns.filter(d => d.isCustom === false);
              if (regularDesigns.length === 0) {
                return (
                  <div className="max-w-md mx-auto bg-stone-50 p-6 rounded-2xl text-center border border-stone-100 space-y-2">
                    <p className="text-[11px] text-stone-500 font-sans">سيتم إضافة تشكيلات الملابس الكلاسيكية الجاهزة والملابس العادية قريباً جداً في هذا المعرض والكتالوج الفاخر!</p>
                  </div>
                );
              }
              const regularCategories = ['الجميع', ...Array.from(new Set(regularDesigns.map(d => d.category).filter(Boolean)))];
              const filteredRegular = regularDesigns.filter(d => selectedRegularCategory === 'الجميع' || d.category === selectedRegularCategory);

              return (
                <div className="space-y-4">
                  {/* Regular Categories Filter Pills */}
                  {regularCategories.length > 1 && (
                    <div className="flex flex-wrap gap-1.5 justify-end mb-4 font-sans" dir="rtl">
                      <span className="text-[10px] text-stone-500 flex items-center ml-2">المجموعة والتصنيف:</span>
                      {regularCategories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedRegularCategory(cat)}
                          className={`text-[10.5px] px-3 py-1 rounded-full border transition-all cursor-pointer font-bold ${
                            selectedRegularCategory === cat
                              ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm'
                              : 'bg-stone-50 text-stone-600 border-stone-200 hover:text-stone-950 hover:bg-stone-100'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}

                  {filteredRegular.length === 0 ? (
                    <p className="text-[10px] text-stone-400 text-center py-6">لا توجد قطع تحت هذا التصنيف حالياً.</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-7xl mx-auto">
                      {filteredRegular.map((design) => {
                        const fallbackSizes = ['M', 'L', 'XL', 'XXL'];
                        const sizesToUse = design.availableSizes && design.availableSizes.length > 0 ? design.availableSizes : fallbackSizes;
                        return (
                          <div 
                            key={design.id}
                            className="bg-white border border-stone-200 rounded-3xl p-4 flex flex-col justify-between space-y-4 hover:border-gold/30 hover:shadow-xl hover:shadow-gold/5 transition-all text-center group relative overflow-hidden shadow-sm"
                          >
                            <div className="h-40 bg-stone-50/60 p-3 rounded-2xl flex items-center justify-center border border-stone-100 relative overflow-hidden">
                              <img 
                                src={design.imageUrl} 
                                alt={design.name} 
                                className="h-full object-contain group-hover:scale-105 transition-all duration-300 cursor-zoom-in hover:brightness-110" 
                                onClick={() => setFullscreenImage(design.imageUrl)}
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute top-2 right-2 bg-stone-900 border border-zinc-800 text-stone-100 px-2 py-0.5 rounded text-[8px] font-bold flex items-center gap-0.5 z-10">
                                <span>قطعة جاهزة كاجوال</span>
                              </div>
                              {design.category && (
                                <div className="absolute top-2 left-2 bg-zinc-900/10 text-stone-850 text-stone-700 text-[8.5px] font-bold px-1.5 py-0.5 rounded border border-stone-200 z-10 shadow-sm">
                                  <span>{design.category}</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="space-y-1.5 text-right font-sans">
                              <h4 className="font-bold text-xs text-stone-900 group-hover:text-gold transition-colors">{design.name}</h4>
                              <p className="text-[10px] text-stone-500 leading-relaxed line-clamp-2">
                                {design.description || 'خامات جودة ممتازة وتصميم فخم، مريح وعصري ومناسب لمظهر يومي فاخر.'}
                              </p>
                            </div>

                            {/* Price and discount overview for standard designs */}
                            <div className="flex items-center justify-between text-[11px] font-sans px-1 text-right">
                              {design.price ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-[#A27B2B] font-extrabold">{design.price} EGP</span>
                                  {design.originalPrice && (
                                    <span className="text-stone-400 line-through text-[9px]">{design.originalPrice}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-stone-400 font-bold text-[9.5px]">السعر عند الطلب</span>
                              )}

                              {design.discountText && (
                                <span className="bg-red-500/10 text-red-500 text-[9px] px-1.5 py-0.25 rounded font-black">{design.discountText}</span>
                              )}
                            </div>

                            <button
                              onClick={() => {
                                setCheckoutSuccess(false);
                                setCheckoutProduct({
                                  ...design,
                                  availableSizes: sizesToUse
                                });
                                setCheckoutName('');
                                setCheckoutPhone('');
                                setCheckoutAltPhone('');
                                setCheckoutAddress('');
                                setCheckoutSize(sizesToUse[1] || 'L');
                                setCheckoutColor(design.availableColors?.[0] || 'أسود');
                                setCheckoutNotes('');
                              }}
                              className="w-full py-2 bg-zinc-950 hover:bg-stone-900 text-white font-bold text-[10px] rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1"
                            >
                              <ShoppingBag className="w-3.5 h-3.5 text-white" />
                              <span>اطلب هذه القطعة الجاهزة</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </section>

        {/* LEADERBOARD SECTION */}
        <section id="leaderboard-section" className="max-w-4xl mx-auto space-y-8 scroll-mt-20">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-gold/20 rounded-full">
              <Sparkles className="w-3 h-3 text-gold animate-pulse" />
              <span className="text-[10px] text-gold font-bold">المنافسة الكبرى للأسياد والملوك</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black font-serif gold-gradient">مجتمع الأسياد المتصدرين 👑</h3>
            <p className="text-xs text-stone-500">ملفاتهم الرقمية مع تيشيرتاتهم النادرة الأكثر تفاعلاً وإعجاباً في البراند</p>
          </div>

          <div className="bg-white border border-stone-200 rounded-3xl p-6 md:p-8 space-y-8 relative overflow-hidden shadow-xl shadow-stone-100 backdrop-blur">
            {/* Ambient glows */}
            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-64 h-64 bg-gold/5 blur-[80px] rounded-full pointer-events-none" />

            {loadingLeaderboard ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center text-stone-500 text-xs py-8">
                كن أوردر تيشيرت مذهب، تفعيل كود VIP لتتصدر لوحة الشرف! 🌟
              </div>
            ) : (
              <div className="space-y-8 bg-transparent">
                {/* Podium top 3 grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                  {/* SECOND PLACE (Silver) */}
                  {leaderboard[1] && (
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="bg-white border border-stone-200 rounded-2xl p-5 text-center flex flex-col items-center justify-between min-h-[225px] relative order-2 md:order-1 shadow-sm"
                    >
                      <div className="absolute -top-4 bg-stone-100 border border-stone-200 rounded-full px-2.5 py-0.5 text-[9px] font-bold text-stone-600 flex items-center gap-1 shadow-sm">
                        <span>الوصيف الثاني 🥈</span>
                      </div>
                      <div className="space-y-3 mt-2 flex flex-col items-center">
                        <img 
                          src={leaderboard[1].photoUrl} 
                          alt={leaderboard[1].displayName} 
                          className="w-16 h-16 rounded-full object-cover border-2 border-stone-250 cursor-zoom-in hover:brightness-110 transition-all shadow-sm"
                          onClick={() => setFullscreenImage(leaderboard[1].photoUrl)}
                        />
                        <div>
                          <h4 className="font-extrabold text-xs text-stone-900">{leaderboard[1].displayName}</h4>
                          <p className="text-[9px] text-stone-500 font-mono">@{leaderboard[1].username}</p>
                        </div>
                        <p className="text-[10px] text-stone-600 italic font-sans max-w-[180px] line-clamp-2">"${leaderboard[1].bio || 'بدون وصف'}"</p>
                      </div>
                      <div className="mt-4 w-full space-y-2">
                        <div className="text-[11px] text-stone-700 font-bold bg-stone-50 border border-stone-200 px-3 py-1 rounded-lg inline-block">
                          ❤️ ${leaderboard[1].likes || 0} إعجاب فخم
                        </div>
                        <button 
                          onClick={() => navigateTo(`/${leaderboard[1].username}`)}
                          className="w-full py-1.5 bg-stone-50 hover:bg-stone-100 text-stone-800 text-[10px] font-bold rounded-lg cursor-pointer border border-stone-200 transition-all text-center"
                        >
                          زيارة ودعم الملف شخصي
                        </button>
                      </div>
                    </motion.div>
                  )}
                  
                  {/* FIRST PLACE (Gold) */}
                  {/* FIRST PLACE (Gold) */}
                  {leaderboard[0] && (
                    <motion.div 
                      whileHover={{ scale: 1.03 }}
                      className="bg-[#FCFAF4] border-2 border-gold rounded-2xl p-6 text-center flex flex-col items-center justify-between min-h-[255px] relative order-1 md:order-2 shadow-lg shadow-gold/5"
                    >
                       <div className="absolute -top-5 bg-stone-950 text-gold border border-gold/25 rounded-full px-3 py-1 text-[10px] font-black tracking-wider flex items-center gap-1 shadow-md">
                        <Crown className="w-3 h-3 text-gold gold-glow" />
                        <span>سيّد الصدارة الملكي 🥇</span>
                      </div>
                      <div className="space-y-3 mt-2 flex flex-col items-center">
                        <img 
                          src={leaderboard[0].photoUrl} 
                          alt={leaderboard[0].displayName} 
                          className="w-20 h-20 rounded-full object-cover border-2 border-gold shadow-md cursor-zoom-in hover:brightness-110 transition-all"
                          onClick={() => setFullscreenImage(leaderboard[0].photoUrl)}
                        />
                        <div>
                          <h4 className="font-black text-sm text-stone-950 font-serif gold-gradient">{leaderboard[0].displayName}</h4>
                          <p className="text-[9px] text-[#A27B2B] font-mono">@{leaderboard[0].username}</p>
                        </div>
                        <p className="text-[10px] text-stone-700 italic font-sans max-w-[200px] line-clamp-2">"{leaderboard[0].bio || 'بدون وصف'}"</p>
                      </div>
                      <div className="mt-4 w-full space-y-2">
                        <div className="text-xs text-black font-black bg-gold px-4 py-1.5 rounded-lg inline-block shadow-sm">
                          ✨ {leaderboard[0].likes || 0} إعجاب مذهب
                        </div>
                        <button 
                          onClick={() => navigateTo(`/${leaderboard[0].username}`)}
                          className="w-full py-2 bg-stone-950 hover:bg-stone-900 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-all text-center"
                        >
                          زيارة ودعم الملف شخصي
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* THIRD PLACE (Bronze) */}
                  {leaderboard[2] && (
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="bg-white border border-stone-200 rounded-2xl p-5 text-center flex flex-col items-center justify-between min-h-[225px] relative order-3 shadow-sm"
                    >
                      <div className="absolute -top-4 bg-stone-100 border border-stone-200 rounded-full px-2.5 py-0.5 text-[9px] font-bold text-amber-700 flex items-center gap-1 shadow-sm">
                        <span>الوصيف الثالث 🥉</span>
                      </div>
                      <div className="space-y-3 mt-2 flex flex-col items-center">
                        <img 
                          src={leaderboard[2].photoUrl} 
                          alt={leaderboard[2].displayName} 
                          className="w-16 h-16 rounded-full object-cover border-2 border-stone-250 cursor-zoom-in hover:brightness-110 transition-all shadow-sm"
                          onClick={() => setFullscreenImage(leaderboard[2].photoUrl)}
                        />
                        <div>
                          <h4 className="font-extrabold text-xs text-stone-900">{leaderboard[2].displayName}</h4>
                          <p className="text-[9px] text-stone-500 font-mono">@{leaderboard[2].username}</p>
                        </div>
                        <p className="text-[10px] text-stone-600 italic font-sans max-w-[180px] line-clamp-2">"{leaderboard[2].bio || 'بدون وصف'}"</p>
                      </div>
                      <div className="mt-4 w-full space-y-2">
                        <div className="text-[11px] text-stone-700 font-bold bg-stone-50 border border-stone-200 px-3 py-1 rounded-lg inline-block">
                          ❤️ {leaderboard[2].likes || 0} إعجاب فخم
                        </div>
                        <button 
                          onClick={() => navigateTo(`/${leaderboard[2].username}`)}
                          className="w-full py-1.5 bg-stone-50 hover:bg-stone-100 text-stone-800 text-[10px] font-bold rounded-lg cursor-pointer border border-stone-200 transition-all text-center"
                        >
                          زيارة ودعم الملف شخصي
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Total joined count stats banner */}
                <div className="pt-6 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right">
                  <div className="space-y-1 text-right">
                    <p className="text-xs text-stone-800">
                      🔥 انضم إلينا حتى الآن <span className="text-gold font-extrabold font-mono text-sm">{totalJoinedCount}</span> من الملوك المتميزين في عائلة <span className="font-serif font-black gold-gradient bg-clip-text">إسمي ذهب</span> الفاخرة!
                    </p>
                    <p className="text-[10px] text-stone-500">
                      شارك مع أصدقائك، واجعلهم يصوتون لملفك المذهب لترتقي درجات الصدارة وتعتلي منصة الملوك الرسمية!
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const target = document.getElementById('search-section');
                      target?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-5 py-2.5 bg-stone-950 hover:bg-stone-900 text-white text-xs font-black rounded-xl transition-all shadow-sm"
                  >
                    شارك لتربح وتكون في الصدارة 🔥
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* VIDEOS AND RANDOM FRIENDS DRAWING SPECIAL CAMPAIGN */}
        <section className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h3 className="text-xl sm:text-2xl font-black font-serif gold-gradient">ملحمة الأصدقاء والأسياد 🎬</h3>
            <p className="text-xs text-stone-500">شاركنا لحظات بريقك بالقطع المذهبة لتنالوا شهرة تليق بقيمتكم الرفيعة!</p>
          </div>

          <div className="flex justify-center max-w-xl mx-auto">
            {/* Friends Video promo Card */}
            <div className="w-full bg-white border border-stone-200 rounded-3xl p-6 flex flex-col justify-between space-y-6 relative overflow-hidden shadow-lg shadow-stone-100/50 backdrop-blur">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 blur-2xl rounded-full" />
              
              <div className="space-y-4 text-right">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-gold/20 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-[#A27B2B]" />
                </div>
                <div>
                  <h4 className="font-black text-md text-stone-900">هل صورت كود الهيبة لك ولأصدقائك؟ 🎥</h4>
                  <p className="text-[10.5px] text-stone-600 leading-relaxed mt-2.5">
                    إذا كان لديك فيديو ممتع لك ولأصدقائك وأنتم ترتدون قطع "إسمي ذهب"، شاركه معنا الآن! سنقوم بنشره مباشرة على قنواتنا الرسمية ولوحة الشرف كأبطال حقيقيين لعلامة ESM الفاخرة لتنالوا شهرة تليق بقيمتكم الرفيعة.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  const messageText = 'أهلاً براند إسمي ذهب! لدي فيديو فخم لي ولأصدقائي نرتدي فيه التيشرت الذّهبي وأود مشاركته معكم لنشره على الصفحة الرئيسية!';
                  window.open(`https://wa.me/${configApp.whatsappNumber}?text=${encodeURIComponent(messageText)}`, '_blank');
                }}
                className="w-full py-2.5 bg-[#B89753]/10 hover:bg-[#B89753]/20 text-[#A27B2B] border border-[#B89753]/30 rounded-xl cursor-pointer text-xs font-black transition-all flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>أرسل لقطتك الملكية عبر الواتساب</span>
              </button>
            </div>
          </div>
        </section>



        {/* BRAND VALUES FEATURES */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-center py-6 max-w-2xl mx-auto">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-3 shadow-sm">
            <Crown className="w-8 h-8 text-gold mx-auto" />
            <h5 className="font-bold text-xs text-stone-900">طباعة وحفر DTF ملكي</h5>
            <p className="text-[10px] text-stone-500 leading-relaxed">طباعة أو حفر DTF عالي الدقة مش بخيوط مقاوم للغسيل المتكرر والحرارة.</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-3 shadow-sm">
            <Users className="w-8 h-8 text-gold mx-auto" />
            <h5 className="font-bold text-xs text-stone-900">بوابة VIP المخصصة</h5>
            <p className="text-[10px] text-stone-500 leading-relaxed">الملف التعريفي الملكي يعبر عن مدى تميزك بمشترياتك الحصرية.</p>
          </div>
        </section>

        {/* NATIVE SEMANTIC SEO FAQ SECTION */}
        <section id="faq-section" className="max-w-4xl mx-auto space-y-8 py-8 border-t border-stone-200">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1 bg-amber-500/10 border border-gold/20 px-3 py-1 rounded-full text-[#A27B2B] text-[10px] font-extrabold">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>دليل تفاصيل الفخامة والمعلومات</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black font-serif gold-gradient">الأسئلة الشائعة لبراند إسمي ذهب 👑</h3>
            <p className="text-xs text-stone-500 leading-relaxed">تفاصيل حصرية عن تيشرتات الأوفرسايز بالاسم، خامات القطن المصري والضمان الفضي</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
            <details className="group bg-white border border-stone-200 hover:border-gold/30 rounded-2xl p-4 transition-all duration-350 cursor-pointer [&_summary::-webkit-details-marker]:hidden shadow-sm">
              <summary className="flex items-center justify-between text-xs font-black text-stone-900 hover:text-gold list-none">
                <span className="flex items-center gap-2">
                  <span className="text-gold text-sm">✦</span>
                  <span>ما هي جودة خامات تيشرتات "إسمي ذهب"؟</span>
                </span>
                <span className="text-gold transition-transform group-open:rotate-180 text-xs font-bold">▼</span>
              </summary>
              <p className="text-[11px] text-stone-600 mt-3 leading-relaxed font-sans border-t border-stone-100 pt-3">
                جميع منتجاتنا تعتمد على <strong>القطن المصري 100%</strong> الطويل التيلة الفاخر وثقيل الوزن بوزن يتعدى الـ 280 جرام ليعطي ذلك المظهر الأوفرسايز (One Size Oversized) الأنيق والقصة الفخمة المريحة والمنسدلة بشكل ملكي وجذاب يناسب كافة الهيئات للشباب والبنات.
              </p>
            </details>

            <details className="group bg-white border border-stone-200 hover:border-gold/30 rounded-2xl p-4 transition-all duration-350 cursor-pointer [&_summary::-webkit-details-marker]:hidden shadow-sm">
              <summary className="flex items-center justify-between text-xs font-black text-stone-900 hover:text-gold list-none">
                <span className="flex items-center gap-2">
                  <span className="text-gold text-sm">✦</span>
                  <span>هل طباعة الاسم وتطريز التاج المذهب مقاومة للغسيل؟</span>
                </span>
                <span className="text-gold transition-transform group-open:rotate-180 text-xs font-bold">▼</span>
              </summary>
              <p className="text-[11px] text-stone-600 mt-3 leading-relaxed font-sans border-t border-stone-100 pt-3">
                نعم بكل فخر! نحن نستخدم أحدث خوارزميات وتقنيات <strong>الحفر الحراري والطباعة DTF الدقيقة ثلاثية الأبعاد</strong> مع خيوط نسيجية لامعة متراكبة مع البج المذهب والتاج الملكي. هذه الخامة مصنوعة بعناية لتقاوم التآكل والحرارة والكي والغسيل بمعدل استدامة مذهل.
              </p>
            </details>

            <details className="group bg-white border border-stone-200 hover:border-gold/30 rounded-2xl p-4 transition-all duration-350 cursor-pointer [&_summary::-webkit-details-marker]:hidden shadow-sm">
              <summary className="flex items-center justify-between text-xs font-black text-stone-900 hover:text-gold list-none">
                <span className="flex items-center gap-2">
                  <span className="text-gold text-sm">✦</span>
                  <span>مش لاقي اسمي.. كيف أصمم خط ذهبي مخصص باسمي؟</span>
                </span>
                <span className="text-gold transition-transform group-open:rotate-180 text-xs font-bold">▼</span>
              </summary>
              <p className="text-[11px] text-stone-600 mt-3 leading-relaxed font-sans border-t border-stone-100 pt-3">
                الأمر غاية في البساطة! إذا لم يكن اسمك مدرجاً في الكتالوج الجاهز، فقط اضغط على زر <strong>"لو عايز تصميم باسمك اضغط هنا"</strong> واملأ استمارة تخصيص الاسم بالدولة الخاصة بك (بالعربية أو الإنجليزية) وسيقوم فريق المصممين والخطاطين الملكي لدينا بتطريز وبرمجة خط مخصص لاسمك فوراً دون أي رسوم تصميم إضافية!
              </p>
            </details>

            <details className="group bg-white border border-stone-200 hover:border-gold/30 rounded-2xl p-4 transition-all duration-350 cursor-pointer [&_summary::-webkit-details-marker]:hidden shadow-sm">
              <summary className="flex items-center justify-between text-xs font-black text-stone-900 hover:text-gold list-none">
                <span className="flex items-center gap-2">
                  <span className="text-gold text-sm">✦</span>
                  <span>كم يستغرق تفصيل وتوصيل التيشيرت المذهب؟</span>
                </span>
                <span className="text-gold transition-transform group-open:rotate-180 text-xs font-bold">▼</span>
              </summary>
              <p className="text-[11px] text-stone-600 mt-3 leading-relaxed font-sans border-t border-stone-100 pt-3">
                لأننا نتعامل مع كل قطعة كجزء فني نادر، تتراوح عملية التفصيل والحياكة الخاصة والطباعة من 24 إلى 48 ساعة، ثم يتم تعبئتها بعناية راقية وتغليف ملكي فاخر، وتوصيلها وشحنها عبر <strong>بوابات الشحن السريع</strong> لكافة محافظات مصر والمجتمعات لتصلك في غضون 3 إلى 5 أيام عمل فقط.
              </p>
            </details>

            <details className="group bg-white border border-stone-200 hover:border-gold/30 rounded-2xl p-4 transition-all duration-350 cursor-pointer [&_summary::-webkit-details-marker]:hidden shadow-sm">
              <summary className="flex items-center justify-between text-xs font-black text-stone-900 hover:text-gold list-none">
                <span className="flex items-center gap-2">
                  <span className="text-gold text-sm">✦</span>
                  <span>ما هي بوابة VIP الملكية ومجتمع الأسياد المتصدرين؟</span>
                </span>
                <span className="text-gold transition-transform group-open:rotate-180 text-xs font-bold">▼</span>
              </summary>
              <p className="text-[11px] text-stone-600 mt-3 leading-relaxed font-sans border-t border-stone-100 pt-3">
                تعد <strong>بوابة VIP المخصصة</strong> مجتمعاً فريداً لعملاء البراند الحقيقيين. مع طلبيتك، ستحصل يدوياً على كود نفاذ تفعيلي ملكي (مثل ESM-VIP) يفتح لك حساباً رقمياً فخماً بالاسم والصورة الشخصية على موقعنا. يمكنك مشاركته وجمع ترشيحات وتصويتات من العائلة لترتقي درجات الصدارة وتثبت ملكيتك لأرقى براند ملابس بالاسم في مصر والعالم العربي!
              </p>
            </details>


          </div>
        </section>

      </main>

      {/* FOOTER & EXCLUSIVITIES */}
      <footer className="border-t border-stone-200 bg-stone-50 py-8 relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-right">
          <div className="space-y-1.5 align-right">
            <div className="flex items-center gap-1.5 justify-center md:justify-start">
              <Crown className="w-5 h-5 text-gold" />
              <span className="font-serif font-black tracking-wider text-sm gold-gradient">ESM • إسمي ذهب</span>
            </div>
            <p className="text-[10px] text-stone-500">العنوان الفني لصناعة الألبسة المذهبة الراقية بالخط العربي والتاج الملكي.</p>
          </div>

          <div className="flex flex-wrap gap-4 justify-center">
            <button 
              onClick={() => setIsPolicyOpen(true)}
              className="text-[11px] font-bold text-stone-650 hover:text-gold transition-colors cursor-pointer"
            >
              سياسة الاسترجاع والضمان الملكي 📖
            </button>
            <button 
              onClick={() => navigateTo('/apps')}
              className="text-[11px] font-bold text-stone-650 hover:text-gold transition-colors cursor-pointer"
            >
              بوابة VIP الملكية 👑
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 text-center text-[10px] text-stone-400 mt-6 pt-4 border-t border-stone-200">
          <p>© جميع الحقوق محفوظة لبراند الأسياد الملكي إسمي ذهب • 2026</p>
        </div>
      </footer>

      {/* RETURN POLICY MODAL POPUP */}
      <ReturnPolicy isOpen={isPolicyOpen} onClose={() => setIsPolicyOpen(false)} />

      {/* UNIFIED CHECKOUT MODAL */}
      <AnimatePresence>
        {checkoutProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[190] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto"
            onClick={() => setCheckoutProduct(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white border border-stone-200 rounded-3xl w-full max-w-lg p-6 md:p-8 space-y-6 relative shadow-2xl text-right overflow-y-auto max-h-[90vh] my-4 scrollbar-thin"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setCheckoutProduct(null)}
                className="absolute top-4 left-4 text-stone-400 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 p-2 rounded-full cursor-pointer transition-all border border-stone-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>

              {checkoutSuccess ? (
                <div className="space-y-6 py-4 text-center">
                  <div className="w-16 h-16 bg-amber-500/10 border border-gold/20 text-gold rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-8 h-8 text-gold" strokeWidth={3} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-black font-serif gold-gradient">لقد بدأت هيبتك بالتأكيد! 👑</h3>
                    <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
                      تم تسجيل أوردر تفصيل وتجهيز منتجك <strong>({checkoutProduct.name})</strong> بنجاح فخم وتمريره لغرفة الإدارة بالتليغرام الخاص بنا!
                    </p>
                    <p className="text-[10.5px] text-amber-700 font-bold bg-amber-500/5 py-1 px-3 rounded-full inline-block mt-2">
                      لا حاجة لتكرار الطلب، فريق الخطاطين يباشر تفصيل القطعة الآن!
                    </p>
                  </div>

                  <div className="pt-4 border-t border-stone-100 space-y-3">
                    <p className="text-[11px] text-stone-500">للاستفسار السريع بخصوص المقاسات أو التعديل، تفضل بزيارتنا فوراً:</p>
                    <button
                      onClick={() => {
                        const messageText = `أهلاً براند إسمي ذهب 👑\n\nلقد قمت للتو بطلب القطعة الملكية عبر الموقع:\n- المنتج/الباقة: ${checkoutProduct.name}\n- الاسم الخاص بي: ${checkoutName}\n- المقاس المختار: ${checkoutSize}\n\nبرجاء موافاتنا بالتأكيد النهائي للبدء ⚡`;
                        window.open(`https://wa.me/${configApp.whatsappNumber}?text=${encodeURIComponent(messageText)}`, '_blank');
                      }}
                      className="w-full py-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <MessageSquare className="w-4 h-4 fill-white text-[#25D366]" />
                      <span>تواصل مباشر واتساب للدعم الملكي</span>
                    </button>
                    
                    <button
                      onClick={() => setCheckoutProduct(null)}
                      className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl cursor-pointer transition-all text-center"
                    >
                      إغلاق والعودة للمعرض
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCheckoutSubmit} className="space-y-5">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1 bg-amber-500/10 px-2.5 py-0.5 rounded-full text-gold text-[9px] font-bold">
                      <Crown className="w-2.5 h-2.5" />
                      <span>بيانات أوردر الشراء الفاخر</span>
                    </div>
                    <h3 className="text-md sm:text-lg font-black text-stone-900 leading-relaxed font-serif">حجز وتفصيل: {checkoutProduct.name}</h3>
                    {checkoutProduct.price ? (
                      <div className="flex items-center gap-1.5 justify-end">
                        {checkoutProduct.discountText && (
                          <span className="bg-red-500/10 text-red-500 text-[9px] px-1.5 py-0.5 rounded font-black">{checkoutProduct.discountText}</span>
                        )}
                        <p className="text-xs text-gold font-bold">المبلغ للامتلاك: {checkoutProduct.price} ج.م</p>
                      </div>
                    ) : (
                      <p className="text-xs text-[#A27B2B] font-bold font-sans">السعر عند الطلب (سيتم التواصل معك للاتفاق قبل البدء)</p>
                    )}
                    
                    {/* PRODUCT PREVIEW WITH COLOR SWITCHED IMAGE */}
                    {(() => {
                      let displayImage = checkoutProduct.imageUrl || '';
                      if (checkoutProduct.images && checkoutProduct.imageColors && checkoutColor) {
                        const colorIndex = checkoutProduct.imageColors.findIndex((c: string) => c === checkoutColor);
                        if (colorIndex !== -1 && checkoutProduct.images[colorIndex]) {
                          displayImage = checkoutProduct.images[colorIndex];
                        }
                      }
                      if (!displayImage) return null;
                      return (
                        <div className="mt-3 flex justify-center bg-stone-50 border border-stone-100 rounded-2xl p-2 max-w-[140px] mx-auto aspect-square overflow-hidden shadow-sm relative">
                          <img src={displayImage} alt={checkoutProduct.name} className="h-full object-contain" referrerPolicy="no-referrer" />
                        </div>
                      );
                    })()}
                  </div>

                  {/* CUSTOMER NAME */}
                  <div className="space-y-1">
                    <label className="block text-stone-700 font-bold text-[10px] mr-1">الاسم الكامل للمستلم 👤</label>
                    <input
                      type="text"
                      required
                      value={checkoutName}
                      onChange={(e) => setCheckoutName(e.target.value)}
                      placeholder="امش معنا باسمك الملكي الكامل..."
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 text-xs text-stone-900 rounded-xl focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold text-right"
                    />
                  </div>

                  {/* DUO CUSTOM DETAILS SECTION */}
                  {checkoutProduct.isDuo && (
                    <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-4">
                      <p className="text-[#A27B2B] font-bold text-[11px] text-right">👨‍❤️‍👨 تفاصيل تطريز الكابلز الثنائي:</p>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-stone-705 text-stone-700 font-bold text-[9px] mr-1">الاسم الأول على القطعة</label>
                          <input
                            type="text"
                            required
                            value={checkoutName1}
                            onChange={(e) => setCheckoutName1(e.target.value)}
                            placeholder="الاسم الأول..."
                            className="w-full px-2.5 py-1.5 bg-white border border-stone-200 text-xs text-stone-900 rounded-xl focus:outline-none focus:border-gold text-right font-medium"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-stone-705 text-stone-700 font-bold text-[9px] mr-1">الاسم الثاني على القطعة</label>
                          <input
                            type="text"
                            required
                            value={checkoutName2}
                            onChange={(e) => setCheckoutName2(e.target.value)}
                            placeholder="الاسم الثاني..."
                            className="w-full px-2.5 py-1.5 bg-white border border-stone-200 text-xs text-stone-900 rounded-xl focus:outline-none focus:border-gold text-right font-medium"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 pt-1 border-t border-stone-200">
                        <label className="block text-stone-700 font-bold text-[10px] mr-1 text-right">
                          اختر مقاس القطعة الثانية للثنائي 📏
                        </label>
                        <div className="flex flex-wrap gap-1.5 justify-start md:justify-end" style={{ direction: 'ltr' }}>
                          {(checkoutProduct.availableSizes && checkoutProduct.availableSizes.length > 0
                            ? checkoutProduct.availableSizes
                            : ['S', 'M', 'L', 'XL', 'XXL', 'XXXL']
                          ).map((sz: string) => (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => setCheckoutSize2(sz)}
                              className={`min-w-8 h-8 px-2 rounded-lg text-[10px] font-black transition-all flex items-center justify-center cursor-pointer border ${
                                checkoutSize2 === sz
                                  ? 'bg-[#B89753] text-white border-gold shadow-sm'
                                  : 'bg-white text-stone-800 border-stone-200 hover:bg-stone-100'
                              }`}
                            >
                              {sz}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* PHONE */}
                    <div className="space-y-1">
                      <label className="block text-stone-700 font-bold text-[10px] mr-1">رقم تواصل واتساب 📱</label>
                      <input
                        type="tel"
                        required
                        value={checkoutPhone}
                        onChange={(e) => setCheckoutPhone(e.target.value)}
                        placeholder="مثال: 01223043867"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 text-xs text-stone-900 rounded-xl focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                        style={{ direction: 'ltr' }}
                      />
                    </div>

                    {/* OPTIONAL CALL PHONE */}
                    <div className="space-y-1">
                      <label className="block text-stone-700 font-bold text-[10px] mr-1 flex items-center justify-between">
                        <span>رقم هاتف إضافي (مكالمات) 📞</span>
                        <span className="text-[8px] text-stone-400 font-normal">اختياري للتوصيل</span>
                      </label>
                      <input
                        type="tel"
                        value={checkoutAltPhone}
                        onChange={(e) => setCheckoutAltPhone(e.target.value)}
                        placeholder="رقم آخر لاستقبال مكالمات المندوب"
                        className="w-full px-3 py-2 bg-stone-50 border border-stone-200 text-xs text-stone-900 rounded-xl focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                        style={{ direction: 'ltr' }}
                      />
                    </div>
                  </div>

                  {/* SHIPPING ADDRESS */}
                  <div className="space-y-1">
                    <label className="block text-stone-700 font-bold text-[10px] mr-1">عنوان الشحن والتوصيل بالتفصيل 📍</label>
                    <textarea
                      required
                      rows={2}
                      value={checkoutAddress}
                      onChange={(e) => setCheckoutAddress(e.target.value)}
                      placeholder="المحافظة، المدينة، اسم الشارع، رقم العمارة والدور..."
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 text-xs text-stone-900 rounded-xl focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold text-right"
                    />
                  </div>

                  {/* SIZES RADIOS ROW */}
                  <div className="space-y-2">
                    <label className="block text-stone-700 font-bold text-[10px] mr-1 text-right">
                      اختر المقاس المتاح للقطعة 📏
                    </label>
                    <div className="flex flex-wrap gap-2 justify-start md:justify-end" style={{ direction: 'ltr' }}>
                      {(checkoutProduct.availableSizes && checkoutProduct.availableSizes.length > 0
                        ? checkoutProduct.availableSizes
                        : ['S', 'M', 'L', 'XL', 'XXL', 'XXXL']
                      ).map((sz: string) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setCheckoutSize(sz)}
                          className={`min-w-10 h-10 px-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center cursor-pointer border ${
                            checkoutSize === sz
                              ? 'bg-[#B89753] text-white border-gold shadow-md'
                              : 'bg-stone-50 text-stone-800 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                    <p className="text-[9px] text-stone-400 text-right mt-1 font-sans">
                      * يرجى العلم بأنك تتحمل المسؤولية الكاملة عن اختيار المقاس، وننصح بطلب مقاسك المعتاد.
                    </p>
                  </div>

                  {/* COLORS RADIOS ROW */}
                  <div className="space-y-2">
                    <label className="block text-stone-700 font-bold text-[10px] mr-1 text-right font-sans">
                      اختر اللون المتاح للموديل 🎨
                    </label>
                    <div className="flex flex-wrap gap-2 justify-start md:justify-end">
                      {(checkoutProduct.availableColors && checkoutProduct.availableColors.length > 0
                        ? checkoutProduct.availableColors
                        : ['أسود', 'أبيض']
                      ).map((col: string) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setCheckoutColor(col)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                            checkoutColor === col
                              ? 'bg-[#B89753] text-white border-gold shadow-md'
                              : 'bg-stone-50 text-stone-800 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full inline-block ${
                            col === 'أسود' ? 'bg-black' :
                            col === 'أبيض' ? 'bg-white border border-stone-300' :
                            col === 'أحمر' ? 'bg-red-500' :
                            col === 'أزرق' ? 'bg-blue-500' :
                            col === 'أخضر' ? 'bg-emerald-600' :
                            col === 'كحلي' ? 'bg-blue-900' :
                            col === 'رمادي' ? 'bg-gray-400' :
                            'bg-[#B89753]'
                          }`} />
                          <span>{col}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ADDITIONAL NOTES */}
                  <div className="space-y-1">
                    <label className="block text-stone-700 font-bold text-[10px] mr-1">ملاحظات، ألوان الكتابة، أو الاسم المطلوب حياكته 🎨</label>
                    <input
                      type="text"
                      value={checkoutNotes}
                      onChange={(e) => setCheckoutNotes(e.target.value)}
                      placeholder="اكتب الاسم المطلوب تطريزه بالخط العربي، أو أي مواصفات للشحن..."
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 text-xs text-stone-900 rounded-xl focus:outline-none focus:border-gold text-right"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={checkoutSubmitting}
                    className="w-full py-2.5 bg-stone-950 hover:bg-stone-900 text-white text-xs font-black rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-neutral-900/10"
                  >
                    {checkoutSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Crown className="w-4 h-4 text-gold" strokeWidth={2.5} />
                        <span>تأكيد وإرسال طلب الحجز الفوري</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FULLSCREEN IMAGE VIEWER MODAL */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFullscreenImage(null)}
            className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4 cursor-zoom-out backdrop-blur-md"
          >
            {/* Close Button top corner */}
            <button
              onClick={() => setFullscreenImage(null)}
              className="absolute top-6 right-6 text-white hover:text-gold bg-zinc-900/85 hover:bg-zinc-800 p-3 rounded-full cursor-pointer transition-all border border-zinc-800 shadow-xl flex items-center justify-center"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Main Fullscreen Image Container */}
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="max-w-4xl max-h-[85vh] relative flex flex-col justify-center items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={fullscreenImage}
                alt="Fullscreen Premium Wearable Design"
                className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl border border-zinc-950 shadow-gold/5"
                referrerPolicy="no-referrer"
              />
              <span className="text-[10px] text-stone-400 mt-2 font-mono text-center">انقر في أي مكان خارج الصورة أو الزر للعودة</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING WHATSAPP BUTTON */}
      <div id="floating-whatsapp-trigger" className="fixed bottom-6 left-6 z-40">
        <a
          href={`https://wa.me/${configApp.whatsappNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          title="تواصل مباشر واتساب"
          className="w-12 h-12 flex items-center justify-center bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-full shadow-2xl shadow-green-500/30 hover:scale-110 transition-all cursor-pointer border border-green-400"
        >
          <MessageSquare className="w-5 h-5 fill-white text-[#25D366]" />
        </a>
      </div>
    </div>
  );
}
