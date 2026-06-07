import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  db, auth, OperationType, handleFirestoreError 
} from '../lib/firebase';
import { 
  signInWithEmailAndPassword, signOut, onAuthStateChanged, User 
} from 'firebase/auth';
import { 
  collection, query, orderBy, onSnapshot, doc, 
  updateDoc, deleteDoc, addDoc, serverTimestamp,
  getDoc, setDoc, getDocs
} from 'firebase/firestore';
import { uploadToImgBB } from '../lib/imgbb';
import { Design, AccessCode, Order, User as UserProfile, ConfigApp } from '../types';
import { DEFAULT_VIP_APP_URL, DEFAULT_WEARABLE_APP_URL } from '../config';
import { 
  LogOut, Shield, ShieldCheck, ShoppingBag, Image as ImageIcon, 
  TrendingUp, Clock, CheckCircle, Trash2, Plus, Crown,
  MessageCircle, Sparkles, Upload, Copy, Check, Info, Settings, Users, Percent, HelpCircle
} from 'lucide-react';

const APPROVED_ADMINS = ['cslcrsh@gmail.com', 'alemhomd123@gmail.com'];

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'prices' | 'designs' | 'codes' | 'orders' | 'users'>('orders');

  // Login forms
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [emailLoginError, setEmailLoginError] = useState<string>('');
  const [signingIn, setSigningIn] = useState<boolean>(false);

  // App Pricing inputs
  const [prices, setPrices] = useState<ConfigApp>({
    classicPrice: 499,
    classicDescription: '',
    duoPrice: 899,
    duoDescription: '',
    premiumPrice: 880,
    premiumDescription: '',
    whatsappNumber: '201223043867',
    focusedProduct: 'premium',
    types: [],
    wearableAppUrl: DEFAULT_WEARABLE_APP_URL,
    vipAppUrl: DEFAULT_VIP_APP_URL,
    stage1IconUrl: '/icons/stage1.png',
    stage2IconUrl: '/icons/stage2.png',
    stage3IconUrl: '/icons/stage3.png',
    telegramBotToken: '',
    telegramChatId: '',
    telegramGasUrl: ''
  });
  const [savingPrices, setSavingPrices] = useState<boolean>(false);
  const [uploadingStage1, setUploadingStage1] = useState<boolean>(false);
  const [uploadingStage2, setUploadingStage2] = useState<boolean>(false);
  const [uploadingStage3, setUploadingStage3] = useState<boolean>(false);

  // Dynamic Custom Types inputs for the brand (الأنواع والخامات المتاحة)
  const [newTypeName, setNewTypeName] = useState<string>('');
  const [newTypePriceLabel, setNewTypePriceLabel] = useState<string>('');
  const [newTypePriceValue, setNewTypePriceValue] = useState<number>(0);

  // Designs inputs and Editing configuration structures
  const [designs, setDesigns] = useState<Design[]>([]);
  const [designName, setDesignName] = useState<string>('');
  const [designFile, setDesignFile] = useState<File | null>(null);
  const [designTags, setDesignTags] = useState<string>('');
  const [designWhatsapp, setDesignWhatsapp] = useState<string>('');
  const [uploadingDesign, setUploadingDesign] = useState<boolean>(false);
  const [designPreview, setDesignPreview] = useState<string>('');
  const [designShowOnHome, setDesignShowOnHome] = useState<boolean>(true);
  const [editingDesignId, setEditingDesignId] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string>('');
  
  // New customized design fields
  const [designIsCustom, setDesignIsCustom] = useState<boolean>(true);
  const [designAvailableSizes, setDesignAvailableSizes] = useState<string[]>(['L', 'XL']);
  const [designAvailableColors, setDesignAvailableColors] = useState<string[]>(['أسود', 'أبيض']);
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [additionalImageColors, setAdditionalImageColors] = useState<string[]>([]);
  const [mainImageColor, setMainImageColor] = useState<string>('أسود');
  const [uploadingAdditionalFile, setUploadingAdditionalFile] = useState<boolean>(false);

  // Access Codes Inputs
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerProduct, setCustomerProduct] = useState<'classic' | 'duo' | 'premium'>('classic');
  const [generatingCode, setGeneratingCode] = useState<boolean>(false);
  const [newlyGeneratedCode, setNewlyGeneratedCode] = useState<string>('');

  // Bulk Access Codes States
  const [bulkCount, setBulkCount] = useState<number>(10);
  const [bulkGeneratedCodes, setBulkGeneratedCodes] = useState<string[]>([]);
  const [generatingBulk, setGeneratingBulk] = useState<boolean>(false);
  const [bulkCopied, setBulkCopied] = useState<boolean>(false);

  // Orders list
  const [orders, setOrders] = useState<Order[]>([]);

  // Users list
  const [usersProfiles, setUsersProfiles] = useState<UserProfile[]>([]);

  // copied state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Track Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && currentUser.email && APPROVED_ADMINS.includes(currentUser.email.toLowerCase())) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch prices settings on render
  useEffect(() => {
    if (!isAdmin) return;
    async function fetchAppConfig() {
      try {
        const docRef = doc(db, 'config', 'app');
        const snap = await getDoc(docRef);
        const defaultTypes = [
          { id: 'premium', name: 'تيشرت بريميوم مذهب فخم (Premium)', priceLabel: 'السعر: 880 ج.م', priceValue: 880 },
          { id: 'classic', name: 'تيشرت كلاسيك بالاسم (Classic)', priceLabel: 'السعر: 499 ج.م', priceValue: 499 },
          { id: 'duo', name: 'عرض الكابلز الثنائي المذهب (Duo)', priceLabel: 'السعر: 899 ج.م (قطعتين)', priceValue: 899 }
        ];

        if (snap.exists()) {
          const data = snap.data();
          setPrices({
            classicPrice: data.classicPrice ?? 499,
            classicDescription: data.classicDescription ?? '',
            duoPrice: data.duoPrice ?? 899,
            duoDescription: data.duoDescription ?? '',
            premiumPrice: data.premiumPrice ?? 880,
            premiumDescription: data.premiumDescription ?? '',
            whatsappNumber: data.whatsappNumber ?? '201223043867',
            focusedProduct: data.focusedProduct ?? 'premium',
            types: data.types ?? defaultTypes,
            wearableAppUrl: data.wearableAppUrl ?? DEFAULT_WEARABLE_APP_URL,
            vipAppUrl: data.vipAppUrl ?? DEFAULT_VIP_APP_URL,
            stage1IconUrl: data.stage1IconUrl ?? '/icons/stage1.png',
            stage2IconUrl: data.stage2IconUrl ?? '/icons/stage2.png',
            stage3IconUrl: data.stage3IconUrl ?? '/icons/stage3.png',
            telegramBotToken: data.telegramBotToken ?? '',
            telegramChatId: data.telegramChatId ?? '',
            telegramGasUrl: data.telegramGasUrl ?? ''
          });
        } else {
          // Initialize if absent
          const iniPrices = { ...prices, types: defaultTypes };
          await setDoc(docRef, iniPrices);
          setPrices(iniPrices);
        }
      } catch (err) {
        console.error('Error loading config/app:', err);
      }
    }
    fetchAppConfig();
  }, [isAdmin]);

  // Bulk Firestore Observers
  useEffect(() => {
    if (!isAdmin) return;

    // Observe designs
    const designsQuery = query(collection(db, 'designs'), orderBy('createdAt', 'desc'));
    const unsubDesigns = onSnapshot(designsQuery, (snapshot) => {
      const fetched: Design[] = [];
      snapshot.forEach(d => {
        fetched.push({ id: d.id, ...d.data() } as Design);
      });
      setDesigns(fetched);
    });

    // Observe accessCodes
    const codesQuery = query(collection(db, 'accessCodes'), orderBy('createdAt', 'desc'));
    const unsubCodes = onSnapshot(codesQuery, (snapshot) => {
      const fetched: AccessCode[] = [];
      snapshot.forEach(c => {
        fetched.push({ ...c.data() } as AccessCode);
      });
      setCodes(fetched);
    });

    // Observe orders
    const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
      const fetched: Order[] = [];
      snapshot.forEach(o => {
        fetched.push({ id: o.id, ...o.data() } as Order);
      });
      setOrders(fetched);
    });

    // Observe users profiles
    const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      const fetched: UserProfile[] = [];
      snapshot.forEach(u => {
        fetched.push({ uid: u.id, ...u.data() } as UserProfile);
      });
      setUsersProfiles(fetched);
    });

    return () => {
      unsubDesigns();
      unsubCodes();
      unsubOrders();
      unsubUsers();
    };
  }, [isAdmin]);

  // Auth Functions
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigningIn(true);
    setEmailLoginError('');
    try {
      const formattedEmail = emailInput.trim().toLowerCase();
      if (!APPROVED_ADMINS.includes(formattedEmail)) {
        throw new Error('البريد الإلكتروني هذا ليس ضمن قائمة المدراء المعتمدين لتطبيق ESM.');
      }
      await signInWithEmailAndPassword(auth, formattedEmail, passwordInput);
    } catch (err: any) {
      setEmailLoginError(err.message || 'خطأ في كلمات السر أو البريد المدخل.');
    } finally {
      setSigningIn(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // Prices actions
  const handleSavePrices = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrices(true);
    try {
      await setDoc(doc(db, 'config', 'app'), prices);
      alert('تم تحديث إعدادات الأسعار وواتساب بنجاح!');
    } catch (err) {
      console.error('Error saving pricing:', err);
      alert('حدث خطأ أثناء رصد الأسعار، يرجى مراجعة لوحة تحكم فايربيز.');
    } finally {
      setSavingPrices(false);
    }
  };

  // Upload/Create or Update Custom Designs
  const handleCreateOrUpdateDesign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDesignId && !designFile) {
      alert('يرجى اختيار صورة تصميم أولاً!');
      return;
    }
    setUploadingDesign(true);
    try {
      let finalUrl = existingImageUrl;
      if (designFile) {
        finalUrl = await uploadToImgBB(designFile);
      }

      const tagsList = designTags
        .toLowerCase()
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      if (!tagsList.includes(designName.toLowerCase())) {
        tagsList.push(designName.toLowerCase());
      }

      // Create a unique clean array of all images
      const allProductImages = [finalUrl, ...additionalImages].filter((value, index, self) => self.indexOf(value) === index && value !== '');

      // Create parallel imageColors array
      const allProductImageColors = allProductImages.map((img) => {
        if (img === finalUrl) return mainImageColor;
        const addIdx = additionalImages.indexOf(img);
        if (addIdx !== -1) {
          return additionalImageColors[addIdx] || '';
        }
        return '';
      });

      const designPayload = {
        name: designName,
        imageUrl: finalUrl,
        images: allProductImages,
        imageColors: allProductImageColors,
        isCustom: designIsCustom,
        availableSizes: designAvailableSizes,
        availableColors: designAvailableColors,
        searchTags: tagsList,
        whatsappMessage: designWhatsapp.trim() || `أهلاً ESM، أريد طلب تيشيرت بتصميم: ${designName}`,
        showOnHome: designShowOnHome
      };

      if (editingDesignId) {
        await updateDoc(doc(db, 'designs', editingDesignId), designPayload);
        alert('تم تعديل وحفظ التصميم بنجاح واعتمدنا التغييرات الفاخرة!');
      } else {
        const designId = doc(collection(db, 'designs')).id;
        const newDesign: Design = {
          id: designId,
          ...designPayload,
          createdAt: serverTimestamp()
        };
        await setDoc(doc(db, 'designs', designId), newDesign);
        alert('تم إضافة التصميم المذهب بنجاح لقائمة الكتالوج الفاخر!');
      }

      // Reset
      setDesignName('');
      setDesignFile(null);
      setDesignPreview('');
      setDesignTags('');
      setDesignWhatsapp('');
      setDesignShowOnHome(true);
      setDesignIsCustom(true);
      setDesignAvailableSizes(['L', 'XL']);
      setDesignAvailableColors(['أسود', 'أبيض']);
      setAdditionalImages([]);
      setAdditionalImageColors([]);
      setMainImageColor('أسود');
      setEditingDesignId(null);
      setExistingImageUrl('');
    } catch (err) {
      console.error(err);
      alert('فشل حفظ التصميم، تفقد صلاحيات قاعدة البيانات أو حجم الملف.');
    } finally {
      setUploadingDesign(false);
    }
  };

  const startEditDesign = (design: Design) => {
    setEditingDesignId(design.id);
    setDesignName(design.name);
    setDesignTags(design.searchTags.join(', '));
    setDesignWhatsapp(design.whatsappMessage);
    setDesignShowOnHome(design.showOnHome !== false);
    setExistingImageUrl(design.imageUrl);
    setDesignPreview(design.imageUrl);
    
    // Set custom design states
    setDesignIsCustom(design.isCustom !== false);
    setDesignAvailableSizes(design.availableSizes || ['L', 'XL']);
    setDesignAvailableColors(design.availableColors || ['أسود', 'أبيض']);
    
    // Parse images and imageColors
    const imgs = design.images || [];
    const colors = design.imageColors || [];
    const mainIdx = imgs.indexOf(design.imageUrl);
    let mainColor = 'أسود';
    if (mainIdx !== -1) {
      mainColor = colors[mainIdx] || 'أسود';
    }
    setMainImageColor(mainColor);

    // Filter additional images & colors
    const filteredImages: string[] = [];
    const filteredColors: string[] = [];
    imgs.forEach((img, idx) => {
      if (img !== design.imageUrl && img !== '') {
        filteredImages.push(img);
        filteredColors.push(colors[idx] || '');
      }
    });
    setAdditionalImages(filteredImages);
    setAdditionalImageColors(filteredColors);
    
    const target = document.getElementById('design-form-top');
    target?.scrollIntoView({ behavior: 'smooth' });
  };

  const cancelEditDesign = () => {
    setDesignName('');
    setDesignFile(null);
    setDesignPreview('');
    setDesignTags('');
    setDesignWhatsapp('');
    setDesignShowOnHome(true);
    setDesignIsCustom(true);
    setDesignAvailableSizes(['L', 'XL']);
    setDesignAvailableColors(['أسود', 'أبيض']);
    setAdditionalImages([]);
    setAdditionalImageColors([]);
    setMainImageColor('أسود');
    setEditingDesignId(null);
    setExistingImageUrl('');
  };

  const handleDeleteDesign = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التصميم؟')) return;
    try {
      await deleteDoc(doc(db, 'designs', id));
      if (editingDesignId === id) {
        cancelEditDesign();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Generating VIP codes
  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingCode(true);
    try {
      const uniqueSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const code = `ESM-${uniqueSuffix}`;

      await setDoc(doc(db, 'accessCodes', code), {
        code,
        name: customerName || "عميل مذهب",
        phone: customerPhone || "",
        product: customerProduct,
        used: false,
        createdAt: serverTimestamp()
      });

      setNewlyGeneratedCode(code);
      setCustomerName('');
      setCustomerPhone('');
      alert(`تم بنجاح توليد كود الدخول الخاص بالعميل: ${code}`);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء رفع كود الدخول.');
    } finally {
      setGeneratingCode(false);
    }
  };

  // Generating Bulk VIP Codes
  const handleGenerateBulkCodes = async () => {
    if (bulkCount < 1 || bulkCount > 100) {
      alert('يرجى اختيار عدد أكواد ما بين 1 و 100!');
      return;
    }
    setGeneratingBulk(true);
    setBulkCopied(false);
    try {
      const generated: string[] = [];
      for (let i = 0; i < bulkCount; i++) {
        const uniqueSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const code = `ESM-${uniqueSuffix}`;
        
        await setDoc(doc(db, 'accessCodes', code), {
          code,
          name: "عميل مذهب (توليد مكثف)",
          phone: "",
          product: customerProduct,
          used: false,
          createdAt: serverTimestamp()
        });
        generated.push(code);
      }
      setBulkGeneratedCodes(generated);
      alert(`تم توليد ${generated.length} كود مذهب جديد دفعة واحدة! يمكنك نسخهم الآن.`);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء توليد الأكواد المكثفة.');
    } finally {
      setGeneratingBulk(false);
    }
  };

  const handleCopyBulk = () => {
    if (bulkGeneratedCodes.length === 0) return;
    const textToCopy = bulkGeneratedCodes.join('\n');
    navigator.clipboard.writeText(textToCopy);
    setBulkCopied(true);
    setTimeout(() => setBulkCopied(false), 2000);
  };

  // Order status progression
  const handleUpdateOrderStatus = async (id: string, newStatus: 'pending' | 'contacted' | 'completed') => {
    try {
      await updateDoc(doc(db, 'orders', id), { status: newStatus });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!confirm('هل تريد حذف سجل هذا الطلب نهائياً؟')) return;
    try {
      await deleteDoc(doc(db, 'orders', id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedKey(code);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white p-4 relative overflow-hidden">
        {/* Particle back */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900/30 via-black to-black z-0 pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-zinc-950/80 border border-gold/20 p-8 rounded-3xl backdrop-blur-md relative z-10 shadow-2xl"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-gold/30 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-gold/10">
              <Shield className="w-8 h-8 text-gold" />
            </div>
            <h1 className="text-2xl font-black font-serif gold-gradient">بوابة المدراء المعتمدين</h1>
            <p className="text-xs text-zinc-400 mt-2">تسجيل الدخول لوحدة إدارة براند إسمي ذهب</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-zinc-400 text-xs font-semibold mb-2">البريد الإلكتروني المعتمد</label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="admin@esmydahab.com"
                className="w-full px-4 py-3 rounded-xl bg-black border border-zinc-800 text-white text-xs focus:border-gold focus:outline-none transition-colors"
                style={{ direction: 'ltr' }}
              />
            </div>

            <div>
              <label className="block text-zinc-400 text-xs font-semibold mb-2">كلمة السر</label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-3 rounded-xl bg-black border border-zinc-800 text-white text-xs focus:border-gold focus:outline-none transition-colors"
                style={{ direction: 'ltr' }}
              />
            </div>

            {emailLoginError && (
              <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-xl text-red-400 text-xs text-right leading-relaxed">
                {emailLoginError}
              </div>
            )}

            <button
              type="submit"
              disabled={signingIn}
              className="w-full py-3 bg-gold text-black rounded-xl text-xs font-extrabold hover:bg-gold/80 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-gold/20"
            >
              {signingIn ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>دخول لوحة التحكم</span>
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Upper Navigation Bar */}
      <header className="border-b border-zinc-900 bg-zinc-950-80 sticky top-0 z-40 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl border border-gold/30 bg-zinc-900 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-gold" />
            </div>
            <div>
              <h1 className="text-md font-bold text-white font-serif">لوحة الإداريين والمدراء</h1>
              <p className="text-[10px] text-zinc-500">حسابك: {user?.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-lg bg-red-950/20 hover:bg-red-950/50 border border-red-900/30 text-red-400 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل خروج</span>
          </button>
        </div>
      </header>

      {/* Main layout */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Navigation tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-zinc-900 pb-4">
          {[
            { id: 'orders', label: 'الطلبات المباشرة', count: orders.length, icon: ShoppingBag },
            { id: 'codes', label: 'أكواد VIP والعملاء', count: codes.length, icon: Percent },
            { id: 'designs', label: 'إدارة كتالوج التصاميم', count: designs.length, icon: ImageIcon },
            { id: 'prices', label: 'الأسعار والاتصال', icon: Settings },
            { id: 'users', label: 'المستخدمين / الشركاء', count: usersProfiles.length, icon: Users }
          ].map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all cursor-pointer ${
                  isSel 
                    ? 'bg-gold text-black border-gold shadow-md shadow-gold/5' 
                    : 'bg-zinc-950 border-zinc-900 hover:border-gold/30 text-zinc-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-lg ${isSel ? 'bg-black text-gold' : 'bg-zinc-900 text-zinc-400'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 md:p-8">
          {/* ORDERS TAB */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">الطلبات المباشرة الواردة من الكوتشنج</h3>
                  <p className="text-xs text-zinc-400 mt-1">تعبأ تلقائياً في حال فشل البحث عن اسم معين ويتم مراجعتها هنا</p>
                </div>
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-zinc-900 rounded-2xl bg-zinc-900/10">
                  <ShoppingBag className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500 font-medium">لا توجد طلبات جديدة حالياً.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-zinc-900 text-zinc-500 font-bold">
                        <th className="pb-3 text-right">الاسم ورقم الجوال</th>
                        <th className="pb-3 text-right">نوع الخامة والطلب</th>
                        <th className="pb-3 text-right">ملاحظات العميل</th>
                        <th className="pb-3 text-right">تاريخ الطلب</th>
                        <th className="pb-3 text-right">حالة التواصل</th>
                        <th className="pb-3 text-center">أكشن</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {orders.map((o) => (
                        <tr key={o.id} className="hover:bg-zinc-900/25 transition-colors">
                          <td className="py-4">
                            <div className="font-bold text-white">{o.name}</div>
                            <div className="text-[10px] text-zinc-500 mt-0.5 font-mono" style={{ direction: 'ltr', textAlign: 'right' }}>
                              {o.phone}
                            </div>
                          </td>
                          <td className="py-4">
                            <span className="px-2 py-0.5 text-[10px] rounded font-bold bg-amber-950 text-gold border border-gold/25">
                              {o.fabric || 'بريميوم مذهب'}
                            </span>
                            {o.designId && (
                              <div className="text-[10px] text-zinc-500 mt-1">اسم الكود: {o.designId}</div>
                            )}
                          </td>
                          <td className="py-4 max-w-xs truncate text-[11px] text-zinc-400">
                            {o.notes || 'لا يوجد ملاحظات'}
                          </td>
                          <td className="py-4 text-zinc-500 font-mono text-[10px]">
                            {o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString('ar-EG') : 'الآن'}
                          </td>
                          <td className="py-4">
                            <select
                              value={o.status}
                              onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value as any)}
                              className="bg-black text-[11px] font-bold border border-zinc-800 rounded px-2 py-1 text-white focus:outline-none focus:border-gold"
                            >
                              <option value="pending">انتظار ⏳</option>
                              <option value="contacted">تم التواصل 💬</option>
                              <option value="completed">مكتمل ✅</option>
                            </select>
                          </td>
                          <td className="py-4 text-center">
                            <div className="flex justify-center items-center gap-2">
                              {/* Open whats app */}
                              <a
                                href={`https://wa.me/${o.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 rounded hover:bg-emerald-900/40"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                              <button
                                onClick={() => handleDeleteOrder(o.id)}
                                className="p-1.5 bg-red-950/20 border border-red-900/30 text-red-400 rounded hover:bg-red-900/40 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ACCESS CODES TAB */}
          {activeTab === 'codes' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Gen Code Form */}
                <div className="lg:col-span-1 bg-black/40 border border-zinc-900 p-6 rounded-2xl">
                  <h4 className="text-md font-bold text-white mb-4 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-gold" />
                    <span>توليد كود عميل جديد</span>
                  </h4>

                  <form onSubmit={handleGenerateCode} className="space-y-4">
                    <div>
                      <label className="block text-zinc-400 text-[10px] font-semibold mb-2">اسم المشتري <span className="text-zinc-550 text-[9px] font-normal">(اختياري)</span></label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="مثال: أحمد محمد (يمكن تركه فارغاً)"
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-lg text-xs focus:outline-none focus:border-gold"
                      />
                    </div>

                    <div>
                      <label className="block text-zinc-400 text-[10px] font-semibold mb-2">رقم جوال تواصل وواتساب <span className="text-zinc-550 text-[9px] font-normal">(اختياري)</span></label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="مثال: 0122000000 (يمكن تركه فارغاً)"
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-lg text-xs focus:outline-none focus:border-gold"
                        style={{ direction: 'ltr' }}
                      />
                    </div>

                    <div>
                      <label className="block text-zinc-400 text-[10px] font-semibold mb-2">المنتج المُشترى</label>
                      <select
                        value={customerProduct}
                        onChange={(e) => setCustomerProduct(e.target.value as any)}
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-lg text-xs focus:outline-none focus:border-gold font-bold"
                      >
                        <option value="classic">كلاسيك تيشيرت الفردي (Classic)</option>
                        <option value="duo">التبادل الثنائي (Duo)</option>
                        <option value="premium">بريميوم تيشيرت بالتاج (Premium)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={generatingCode}
                      className="w-full py-2 bg-gold text-black hover:bg-gold/90 transition-colors font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-gold/10"
                    >
                      {generatingCode ? (
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span>تأكيد المبيعات وتوليد كود الدخول</span>
                      )}
                    </button>
                  </form>

                  {newlyGeneratedCode && (
                    <div className="mt-4 p-4 bg-gold/10 border border-gold/30 rounded-xl text-center">
                      <div className="text-[10px] text-zinc-400">كود الدخول المولد للعميل</div>
                      <div className="text-lg font-black font-mono tracking-wider text-gold my-1">{newlyGeneratedCode}</div>
                      <button
                        onClick={() => handleCopyCode(newlyGeneratedCode)}
                        className="text-[10px] px-2 py-1 bg-gold text-black rounded font-bold cursor-pointer hover:bg-gold/80"
                      >
                        {copiedKey === newlyGeneratedCode ? 'نسخ بنجاح!' : 'نسخ الكود ومشاركته'}
                      </button>
                    </div>
                  )}

                  {/* Bulk Code Gen Form */}
                  <div className="border-t border-zinc-900 mt-6 pt-6 space-y-4">
                    <h5 className="text-xs font-bold text-amber-500 uppercase flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                      <span>توليد مكثف ومجمع للأكواد (Bulk)</span>
                    </h5>
                    
                    <div>
                      <label className="block text-zinc-400 text-[10px] font-semibold mb-2">عدد الأكواد المطلوبة لتوليدها دفعة واحدة</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={bulkCount}
                        onChange={(e) => setBulkCount(parseInt(e.target.value) || 10)}
                        placeholder="10"
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-lg text-xs focus:outline-none focus:border-gold"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={generatingBulk}
                      onClick={handleGenerateBulkCodes}
                      className="w-full py-2 bg-zinc-800 text-white hover:bg-zinc-700 hover:text-gold transition-colors font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer border border-zinc-700"
                    >
                      {generatingBulk ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span>توليد دفعة {bulkCount} أكواد دفعة واحدة</span>
                      )}
                    </button>

                    {bulkGeneratedCodes.length > 0 && (
                      <div className="p-3 bg-zinc-950/80 border border-zinc-900 rounded-xl space-y-3">
                        <span className="text-[10px] text-zinc-400 font-bold block text-right">الأكواد التي تم توليدها الآن:</span>
                        <textarea
                          readOnly
                          value={bulkGeneratedCodes.join('\n')}
                          className="w-full h-32 p-2 bg-black border border-zinc-900 text-gold text-xs font-mono font-black rounded-lg resize-none focus:outline-none"
                          style={{ direction: 'ltr' }}
                        />
                        <button
                          type="button"
                          onClick={handleCopyBulk}
                          className="w-full py-2 bg-gold text-black rounded text-[11px] font-black cursor-pointer hover:bg-gold/90 transition-colors flex items-center justify-center gap-1"
                        >
                          {bulkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{bulkCopied ? 'تم نسخ جميع الأكواد بنجاح!' : 'نسخ جميع الأكواد المذكورة'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Code Table */}
                <div className="lg:col-span-2">
                  <h4 className="text-md font-bold text-white mb-4">قائمة أكواد النفاذ والتذاكر النشطة</h4>
                  
                  {codes.length === 0 ? (
                    <div className="text-center py-12 border border-zinc-900 rounded-2xl bg-zinc-900/10">
                      <Percent className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                      <p className="text-xs text-zinc-500">لا توجد أكواد مولدة بعد.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto md:max-h-[500px]">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="border-b border-zinc-900 text-zinc-500 font-bold">
                            <th className="pb-2 text-right">كود الدخول</th>
                            <th className="pb-2 text-right">العميل والجوال</th>
                            <th className="pb-2 text-right">نوع الباقة</th>
                            <th className="pb-2 text-center">الحالة</th>
                            <th className="pb-2 text-center">أكشن</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900">
                          {codes.map((c) => (
                            <tr key={c.code} className="hover:bg-zinc-900/25 transition-colors">
                              <td className="py-3 font-semibold font-mono tracking-wider text-gold">{c.code}</td>
                              <td className="py-3">
                                <div className="font-bold text-white">{c.name}</div>
                                <div className="text-[10px] text-zinc-500 font-mono" style={{ direction: 'ltr', textAlign: 'right' }}>
                                  {c.phone}
                                </div>
                              </td>
                              <td className="py-3 font-bold text-zinc-300">
                                {c.product === 'duo' ? 'ثنائي' : c.product === 'premium' ? 'تاج بريميوم' : 'كلاسيك'}
                              </td>
                              <td className="py-3 text-center">
                                <span className={`px-2 py-0.5 text-[9px] rounded-full font-bold ${c.used ? 'bg-red-950/40 border border-red-900/20 text-red-400' : 'bg-emerald-950/40 border border-emerald-900/20 text-emerald-400'}`}>
                                  {c.used ? `مستخدم من ${c.activatedBy?.substring(0, 5)}` : 'صالح غير مستخدم'}
                                </span>
                              </td>
                              <td className="py-3">
                                <div className="flex justify-center items-center gap-1">
                                  <button
                                    onClick={() => handleCopyCode(c.code)}
                                    className="p-1 px-2 bg-zinc-900 hover:bg-zinc-800 text-[10px] font-semibold rounded flex items-center gap-1 border border-zinc-800 transition-colors cursor-pointer text-zinc-300"
                                  >
                                    {copiedKey === c.code ? <Check className="w-3 h-3 text-gold" /> : <Copy className="w-3 h-3" />}
                                    <span>{copiedKey === c.code ? 'تم' : 'نسخ'}</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* DESIGNS CATALOG TAB */}
          {activeTab === 'designs' && (
            <div className="space-y-8" id="design-form-top">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Create or Edit Design Form */}
                <div className={`lg:col-span-1 border p-6 rounded-2xl space-y-4 transition-all ${
                  editingDesignId 
                    ? 'bg-amber-950/20 border-gold shadow-md shadow-gold/5' 
                    : 'bg-black/40 border-zinc-900'
                }`}>
                  <h4 className="text-md font-bold text-white flex items-center gap-1.5 text-right">
                    <Plus className="w-4 h-4 text-gold" />
                    <span>{editingDesignId ? 'تعديل التصميم المذهب الحالي' : 'إضافة تصميم مذهب جديد'}</span>
                  </h4>

                  <form onSubmit={handleCreateOrUpdateDesign} className="space-y-4 text-right">
                    <div>
                      <label className="block text-zinc-400 text-[10px] font-semibold mb-2">اسم التصميم المعروض</label>
                      <input
                        type="text"
                        required
                        value={designName}
                        onChange={(e) => setDesignName(e.target.value)}
                        placeholder="علي (الخط الديواني)"
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-lg text-xs focus:outline-none focus:border-gold text-right"
                      />
                    </div>

                    <div>
                      <label className="block text-zinc-400 text-[10px] font-semibold mb-2">صورة التصميم بجودة عالية</label>
                      <div className="border border-dashed border-zinc-805 border-zinc-800 h-28 rounded-lg flex flex-col items-center justify-center relative cursor-pointer hover:border-gold bg-zinc-900 text-center p-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              setDesignFile(e.target.files[0]);
                              setDesignPreview(URL.createObjectURL(e.target.files[0]));
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        {designPreview ? (
                          <img src={designPreview} alt="Preview" className="h-full object-contain max-w-[200px]" />
                        ) : (
                          <div className="text-zinc-500 space-y-1">
                            <Upload className="w-5 h-5 mx-auto text-zinc-600" />
                            <span className="text-[10px] block">اختر صورة تيشيرت مسحوبة</span>
                          </div>
                        )}
                      </div>
                      {editingDesignId && !designFile && (
                        <p className="text-[9px] text-zinc-500 mt-1">اتركه فارغاً للاحتفاظ بالصورة الحالية من ImgBB</p>
                      )}
                    </div>

                    {/* CATEGORY SELECT */}
                    <div>
                      <label className="block text-zinc-400 text-[10px] font-semibold mb-2 font-sans text-right">تصنيف قطعة الملابس</label>
                      <select
                        value={designIsCustom ? 'custom' : 'regular'}
                        onChange={(e) => setDesignIsCustom(e.target.value === 'custom')}
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-lg text-xs focus:outline-none focus:border-gold font-bold text-right"
                      >
                        <option value="custom">الملابس المخصوصة (طباعة On Demand بالاسم الذهب)</option>
                        <option value="regular">الملابس العادية (تصاميم ونقوش جاهزة)</option>
                      </select>
                    </div>

                    {/* MAIN IMAGE COLOR */}
                    <div>
                      <label className="block text-zinc-400 text-[10px] font-semibold mb-1">لون الصورة الأساسية الرئسية 🎨</label>
                      <input
                        type="text"
                        required
                        value={mainImageColor}
                        onChange={(e) => setMainImageColor(e.target.value)}
                        placeholder="مثال: أسود"
                        className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-white rounded-lg text-xs font-bold focus:outline-none focus:border-gold text-right"
                      />
                    </div>

                    {/* SIZES CHECKBOXES */}
                    <div>
                      <label className="block text-zinc-400 text-[10px] font-semibold mb-2 font-sans text-right">المقاسات المتاحة لهذا المنتج</label>
                      <div className="grid grid-cols-3 gap-2 bg-zinc-950/40 p-3 rounded-lg border border-zinc-900">
                        {['S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map((size) => {
                          const isChecked = designAvailableSizes.includes(size);
                          return (
                            <label key={size} className="flex items-center gap-1.5 justify-end text-xs text-zinc-300 font-bold select-none cursor-pointer">
                              <span>{size}</span>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setDesignAvailableSizes(designAvailableSizes.filter(s => s !== size));
                                  } else {
                                    setDesignAvailableSizes([...designAvailableSizes, size]);
                                  }
                                }}
                                className="w-4 h-4 accent-gold cursor-pointer"
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* COLORS CONFIGURATION TEXT INPUT */}
                    <div>
                      <label className="block text-zinc-400 text-[10px] font-semibold mb-2 font-sans text-right">الألوان المتاحة لهذا المنتج 🎨</label>
                      <div className="space-y-2 bg-zinc-950/40 p-3 rounded-lg border border-zinc-900">
                        <input
                          type="text"
                          required
                          value={designAvailableColors.join('، ')}
                          onChange={(e) => {
                            const colors = e.target.value.split(/[،,]/).map(c => c.trim()).filter(c => c.length > 0);
                            setDesignAvailableColors(colors);
                          }}
                          placeholder="مثال: أسود، أبيض، كحلي، أخضر (افصل بفاصلة أو فاصلة عربية)"
                          className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-805 text-white rounded text-xs text-right font-sans focus:outline-none focus:border-gold"
                        />
                        <div className="flex flex-wrap gap-1 justify-end">
                          {designAvailableColors.map((col, i) => (
                            <span key={i} className="text-[10px] bg-zinc-800 text-gold px-2 py-0.5 rounded-full font-bold">
                              {col}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* ADD MULTIPLE IMAGES */}
                    <div>
                      <label className="block text-zinc-400 text-[10px] font-semibold mb-2 font-sans text-right">صور إضافية للمنتج (اربط كل صورة بلون محدد)</label>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <div className="relative flex-grow">
                            <input
                              type="file"
                              accept="image/*"
                              disabled={uploadingAdditionalFile}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setUploadingAdditionalFile(true);
                                  try {
                                    const url = await uploadToImgBB(file);
                                    setAdditionalImages([...additionalImages, url]);
                                    setAdditionalImageColors([...additionalImageColors, designAvailableColors[0] || '']);
                                    alert('تم رفع الصورة الإضافية بنجاح لمجموعة المعرض!');
                                  } catch (err) {
                                    console.error(err);
                                    alert('فشل رفع الصورة الإضافية، تأكد من اتصالك بنظام ImgBB.');
                                  } finally {
                                    setUploadingAdditionalFile(false);
                                  }
                                }
                              }}
                              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                            <button
                              type="button"
                              disabled={uploadingAdditionalFile}
                              className="w-full py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-lg hover:border-gold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              {uploadingAdditionalFile ? (
                                <div className="w-4 h-4 border-2 border-zinc-300 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <>
                                  <Plus className="w-4 h-4 text-gold" />
                                  <span>رفع صورة إضافية جديدة</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {additionalImages.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-[10px] text-zinc-400 block text-right font-bold font-sans">اربط كل صورة إضافية بلونها المتاح:</span>
                            <div className="grid grid-cols-2 gap-3 bg-zinc-950/20 p-2 rounded-lg border border-zinc-900/60 font-sans">
                              {additionalImages.map((imgUrl, idx) => {
                                const imgColor = additionalImageColors[idx] || '';
                                return (
                                  <div key={idx} className="relative border border-zinc-850 border-zinc-800 rounded-lg p-2 bg-zinc-950 flex flex-col items-center gap-2">
                                    <div className="w-full h-24 overflow-hidden rounded bg-black flex items-center justify-center relative">
                                      <img src={imgUrl} alt={`Additional ${idx}`} className="h-full object-contain" referrerPolicy="no-referrer" />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setAdditionalImages(additionalImages.filter((_, i) => i !== idx));
                                          setAdditionalImageColors(additionalImageColors.filter((_, i) => i !== idx));
                                        }}
                                        className="absolute top-1 left-1 bg-red-600 hover:bg-red-700 text-white text-[11px] p-1 rounded-full cursor-pointer shadow flex items-center justify-center w-5 h-5 font-bold"
                                        title="إزالة هذه الصورة"
                                      >
                                        ×
                                      </button>
                                    </div>
                                    <div className="w-full space-y-1">
                                      <span className="text-[9px] text-zinc-400 block text-right">اللون المرتبط:</span>
                                      <select
                                        value={imgColor}
                                        onChange={(e) => {
                                          const updatedColors = [...additionalImageColors];
                                          updatedColors[idx] = e.target.value;
                                          setAdditionalImageColors(updatedColors);
                                        }}
                                        className="w-full bg-zinc-900 border border-zinc-800 text-white text-[10px] rounded p-1 focus:outline-none focus:border-gold text-right"
                                      >
                                        <option value="">-- اختر لوناً --</option>
                                        {designAvailableColors.map((col) => (
                                          <option key={col} value={col}>{col}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-zinc-400 text-[10px] font-semibold mb-2">الوسوم والكلمات الدلالية للبحث (مفصولة بفاصلة)</label>
                      <input
                        type="text"
                        required
                        value={designTags}
                        onChange={(e) => setDesignTags(e.target.value)}
                        placeholder="علي, ali, الديواني, تيشيرت علي"
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-lg text-xs focus:outline-none focus:border-gold text-right"
                      />
                      <span className="text-[9px] text-zinc-500 mt-1 block">لتمكين العملاء من تصفية وبحث الأسماء المذهبة بسهولة</span>
                    </div>

                    <div>
                      <label className="block text-zinc-400 text-[10px] font-semibold mb-2">رسالة واتساب الافتراضية</label>
                      <textarea
                        value={designWhatsapp}
                        onChange={(e) => setDesignWhatsapp(e.target.value)}
                        placeholder="أهلاً براند إسمي ذهب، أريد الحصول على تيشيرت مذهب فخم..."
                        className="w-full h-16 px-3 py-2 bg-zinc-900 border border-zinc-805 border-zinc-800 text-white rounded-lg text-xs focus:outline-none focus:border-gold resize-none text-right"
                      />
                    </div>

                    {/* SHOW ON HOME TOGGLE */}
                    <div className="flex items-center justify-end gap-2 bg-zinc-950/40 p-3 rounded-lg border border-zinc-900">
                      <label htmlFor="showOnHomeCheckbox" className="text-[10px] text-zinc-300 font-bold select-none cursor-pointer">
                        تثبيت وعرض التصميم في الكتالوج الرئيسي بالصفحة الرئيسية
                      </label>
                      <input
                        id="showOnHomeCheckbox"
                        type="checkbox"
                        checked={designShowOnHome}
                        onChange={(e) => setDesignShowOnHome(e.target.checked)}
                        className="w-4 h-4 accent-gold cursor-pointer"
                      />
                    </div>

                    <div className="flex gap-2">
                      {editingDesignId && (
                        <button
                          type="button"
                          onClick={cancelEditDesign}
                          className="flex-1 py-2 bg-zinc-900 hover:bg-zinc-800 text-white transition-colors text-xs font-bold rounded-lg cursor-pointer"
                        >
                          إلغاء التعديل
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={uploadingDesign}
                        className={`flex-grow py-2.5 transition-colors font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer ${
                          editingDesignId ? 'bg-gold text-black hover:bg-gold/90' : 'bg-gold/90 hover:bg-gold text-black'
                        }`}
                      >
                        {uploadingDesign ? (
                          <>
                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            <span>جاري معالجة وحفظ التصميم...</span>
                          </>
                        ) : (
                          <span>{editingDesignId ? 'حفظ التعديلات الفخمة' : 'رفع ونشر في الكتالوج'}</span>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                {/* List design grids */}
                <div className="lg:col-span-2 text-right">
                  <h4 className="text-md font-bold text-white mb-4">التصاميم والأنماط المعروضة بالكتالوج ({designs.length})</h4>

                  {designs.length === 0 ? (
                    <div className="text-center py-12 border border-zinc-900 rounded-2xl bg-zinc-900/10">
                      <ImageIcon className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                      <p className="text-xs text-zinc-500 font-medium">لا توجد تصاميم في الكتالوج الآن.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 overflow-y-auto max-h-[550px] p-1">
                      {designs.map(d => {
                        const isMainHome = d.showOnHome !== false;
                        return (
                          <div key={d.id} className="bg-black/60 border border-zinc-900 rounded-2xl overflow-hidden text-right group relative flex flex-col justify-between">
                            <div className="aspect-square bg-zinc-950 p-2 relative flex items-center justify-center border-b border-zinc-900/40">
                              <img src={d.imageUrl} alt={d.name} referrerPolicy="no-referrer" className="h-full object-contain group-hover:scale-105 transition-transform" />
                              
                              <div className="absolute top-2 left-2 flex gap-1 z-10">
                                <button
                                  onClick={() => startEditDesign(d)}
                                  className="p-1.5 bg-zinc-900/90 border border-gold/40 text-gold rounded-lg hover:bg-zinc-800 cursor-pointer"
                                  title="تعديل هذا التصميم"
                                >
                                  <Settings className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteDesign(d.id)}
                                  className="p-1.5 bg-red-950/70 border border-red-950 text-red-400 rounded-lg hover:bg-red-950 cursor-pointer"
                                  title="حذف هذا التصميم"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {isMainHome && (
                                <div className="absolute bottom-2 right-2 bg-gold/15 text-gold border border-gold/30 text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <Crown className="w-2 h-2 text-gold" style={{ display: 'inline-block' }} />
                                  <span>عرض بالرئيسية</span>
                                </div>
                              )}
                            </div>
                            <div className="p-3 space-y-1">
                              <h5 className="font-bold text-xs text-white truncate">{d.name}</h5>
                              <div className="flex flex-wrap gap-1">
                                {d.searchTags.slice(0, 3).map((tag, idx) => (
                                  <span key={idx} className="bg-zinc-900 text-zinc-500 text-[8px] font-medium px-1.5 py-0.5 rounded">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS PRICES TAB */}
          {activeTab === 'prices' && (
            <div className="max-w-xl mx-auto space-y-6">
              <div>
                <h3 className="text-md font-bold text-gold text-right">التحكم بأسعار وباقات الأسياد المتاحة</h3>
                <p className="text-xs text-zinc-400 mt-1 text-right">تعديل هذه القيم يغير الأسعار والتفاصيل فوراً في واجهة الجمهور والعملاء</p>
              </div>

              <form onSubmit={handleSavePrices} className="space-y-4 bg-black/40 border border-zinc-900 p-6 rounded-2xl text-right">
                
                {/* CHOICE OF BEST DEAL */}
                <div className="bg-gold/5 border border-gold/20 p-4 rounded-xl space-y-2 mb-4">
                  <label className="block text-gold text-xs font-bold mb-2 text-right">💎 حدد الباقة المُميّزة (أحسن صفقة / الأكثر طلباً)</label>
                  <select
                    value={prices.focusedProduct || 'premium'}
                    onChange={(e) => setPrices({ ...prices, focusedProduct: e.target.value as any })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-gold/30 text-gold text-xs font-bold rounded-lg focus:outline-none"
                  >
                    <option value="classic">الباقة الكلاسيكية الأساسية (Classic)</option>
                    <option value="premium">باقة التاج المذهب (Premium)</option>
                    <option value="duo">عرض الكابلز الثنائي (Duo)</option>
                  </select>
                  <p className="text-[10px] text-zinc-400 leading-relaxed text-right mt-1">الباقة التي تحددها هنا ستبرز بلون ذهبي متألق وشريط "أحسن صفقة 🔥" مع تظليل نيون لشد انتباه الزوار.</p>
                </div>

                {/* CLASSIC PACK CONFIGURATION */}
                <div className="border border-zinc-900 p-4 rounded-xl space-y-4 bg-zinc-950/40">
                  <h4 className="text-xs font-extrabold text-white border-b border-zinc-900 pb-2 text-right">1. إعدادات الباقة الكلاسيكية</h4>
                  <div>
                    <label className="block text-zinc-400 text-[11px] font-semibold mb-1 text-right">السعر (Classic Price)</label>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        value={prices.classicPrice}
                        onChange={(e) => setPrices({ ...prices, classicPrice: Number(e.target.value) })}
                        className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 text-white text-xs font-bold font-mono rounded-lg focus:outline-none"
                      />
                      <span className="absolute left-3 top-2.5 text-[10px] text-zinc-500">جنيه مصري</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] font-semibold mb-1 text-right">تفاصيل ومميزات الباقة (كل ميزة في سطر منفصل)</label>
                    <textarea
                      required
                      rows={4}
                      value={prices.classicDescription}
                      onChange={(e) => setPrices({ ...prices, classicDescription: e.target.value })}
                      placeholder="اكتب هنا مواصفات الباقة..."
                      className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 text-white text-xs rounded-lg focus:outline-none text-right"
                    />
                  </div>
                </div>

                {/* PREMIUM PACK CONFIGURATION */}
                <div className="border border-zinc-900 p-4 rounded-xl space-y-4 bg-zinc-950/40">
                  <h4 className="text-xs font-extrabold text-white border-b border-zinc-900 pb-2 text-right">2. إعدادات باقة التاج المذهب</h4>
                  <div>
                    <label className="block text-zinc-400 text-[11px] font-semibold mb-1 text-right">السعر (Premium Price)</label>
                    <div className="relative">
                      <input
                        type="number"
                        required
                        value={prices.premiumPrice}
                        onChange={(e) => setPrices({ ...prices, premiumPrice: Number(e.target.value) })}
                        className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 text-white text-xs font-bold font-mono rounded-lg focus:outline-none"
                      />
                      <span className="absolute left-3 top-2.5 text-[10px] text-zinc-500">جنيه مصري</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] font-semibold mb-1 text-right">تفاصيل ومميزات الباقة (كل ميزة في سطر منفصل)</label>
                    <textarea
                      required
                      rows={4}
                      value={prices.premiumDescription}
                      onChange={(e) => setPrices({ ...prices, premiumDescription: e.target.value })}
                      placeholder="اكتب هنا مواصفات الباقة..."
                      className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 text-white text-xs rounded-lg focus:outline-none text-right"
                    />
                  </div>
                </div>

                {/* DUO PACK CONFIGURATION */}
                <div className="border border-zinc-900 p-4 rounded-xl space-y-4 bg-zinc-950/40">
                  <h4 className="text-xs font-extrabold text-white border-b border-zinc-900 pb-2 text-right">3. عرض الكابلز الثنائي</h4>
                  <div>
                    <label className="block text-zinc-400 text-[11px] font-semibold mb-1 text-right">السعر (Duo Price)</label>
                    <div className="relative font-mono">
                      <input
                        type="number"
                        required
                        value={prices.duoPrice}
                        onChange={(e) => setPrices({ ...prices, duoPrice: Number(e.target.value) })}
                        className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 text-white text-xs font-bold font-mono rounded-lg focus:outline-none"
                      />
                      <span className="absolute left-3 top-2.5 text-[10px] text-zinc-500">جنيه مصري</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] font-semibold mb-1 text-right">تفاصيل ومميزات الباقة (كل ميزة في سطر منفصل)</label>
                    <textarea
                      required
                      rows={4}
                      value={prices.duoDescription}
                      onChange={(e) => setPrices({ ...prices, duoDescription: e.target.value })}
                      placeholder="اكتب هنا مواصفات الباقة..."
                      className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 text-white text-xs rounded-lg focus:outline-none text-right"
                    />
                  </div>
                </div>

                {/* WHATSAPP NUMBER */}
                <div className="border border-zinc-900 p-4 rounded-xl bg-zinc-950/40 space-y-2">
                  <label className="block text-zinc-400 text-xs font-semibold mb-1 text-right">رقم هاتف الواتساب للمبيعات (بالكود الدولي وبدون +)</label>
                  <input
                    type="text"
                    required
                    value={prices.whatsappNumber}
                    onChange={(e) => setPrices({ ...prices, whatsappNumber: e.target.value })}
                    placeholder="201223043867"
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 text-white text-xs font-bold font-mono rounded-lg focus:outline-none"
                    style={{ direction: 'ltr' }}
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block text-right">الرقم المعتمد لتلقي وإرسال الكتالوج المذهب والتواصل مع العملاء</span>
                </div>

                {/* VIP PORTAL APP LINK */}
                <div className="border border-zinc-900 p-4 rounded-xl bg-zinc-950/40 space-y-2">
                  <label className="block text-zinc-400 text-xs font-semibold mb-1 text-right">رابط التطبيق الثاني (بوابة VIP وتعديل الحسابات للأسياد)</label>
                  <input
                    type="url"
                    required
                    value={prices.vipAppUrl || ''}
                    onChange={(e) => setPrices({ ...prices, vipAppUrl: e.target.value })}
                    placeholder="https://esmy-dahab-vip.pages.dev"
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 text-white text-xs font-bold font-mono rounded-lg focus:outline-none"
                    style={{ direction: 'ltr' }}
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block text-right">
                    الرابط المعتمد لبوبة VIP المخصصة لتسجيل والتحكم بحسابات الأعضاء. اسم الحقل في Firestore: <strong className="text-gold font-mono">vipAppUrl</strong>
                  </span>
                </div>

                {/* TELEGRAM BOT INTEGRATION */}
                <div className="border border-gold/20 p-4 rounded-xl bg-zinc-950/40 space-y-4 text-right">
                  <h4 className="text-xs font-bold text-gold flex items-center justify-between">
                    <span className="text-[9px] text-amber-500 font-bold">تطوير فوري وآمن 🤖</span>
                    <span>🔔 إعدادات بوت التليجرام لإرسال الطلبات فورا</span>
                  </h4>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    عندما يقوم أي عميل بطلب تيشيرت (سواء اسم محدد أو كاستم)، سيقوم السيرفر/البرنامج تلقائياً بإخطار البوت وإرسال تفاصيل الزبون الكاملة إلى التليجرام الخاص بك حتى تتمكن من التواصل معه بسهولة مطلقة!
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-zinc-400 text-[11px] font-semibold mb-1">توكن البوت (Telegram Bot Token)</label>
                      <input
                        type="text"
                        value={prices.telegramBotToken || ''}
                        onChange={(e) => setPrices({ ...prices, telegramBotToken: e.target.value })}
                        placeholder="مثال: 123456789:AAFGfakeTokenStringHere"
                        className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 text-white text-xs font-mono rounded-lg focus:outline-none"
                        style={{ direction: 'ltr' }}
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 text-[11px] font-semibold mb-1">الرقم التعريفي للمحادثة (Telegram Chat ID / User ID)</label>
                      <input
                        type="text"
                        value={prices.telegramChatId || ''}
                        onChange={(e) => setPrices({ ...prices, telegramChatId: e.target.value })}
                        placeholder="مثال: 987654321"
                        className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 text-white text-xs font-mono rounded-lg focus:outline-none"
                        style={{ direction: 'ltr' }}
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 text-[11px] font-semibold mb-1 font-sans text-right">رابط Google Apps Script Webhook لطلب الإشعارات (بديل بوت التيليغرام)</label>
                      <input
                        type="text"
                        value={prices.telegramGasUrl || ''}
                        onChange={(e) => setPrices({ ...prices, telegramGasUrl: e.target.value })}
                        placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                        className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 text-white text-xs font-mono rounded-lg focus:outline-none"
                        style={{ direction: 'ltr' }}
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-xl space-y-1">
                    <div className="text-[10px] text-red-400 font-black">⚠️ تحذير أمني هام (Security Advisory):</div>
                    <p className="text-[9px] text-zinc-400 leading-relaxed">
                      هذا الاتصال بالتيليجرام يتم من واجهة المستخدم مباشرة بناءً على طلبكم تسهيلاً للتجرية الفورية. يرجى الملاحظة أن وضع توكن البوت الحقيقي سيجعله محملاً في المتصفح في حال قام أحد بفحص الكود، مما قد يعرض توكن البوت للكشف. نوصي بعدم منح البوت أي صلاحيات حساسة في قنوات أخرى واقتصاره فقط على إرسال الإشعارات الصادرة لك.
                    </p>
                  </div>
                </div>

                {/* STAGE ICONS CONFIGURATION */}
                <div className="border border-zinc-900 p-4 rounded-xl bg-zinc-950/40 space-y-4 text-right">
                  <h4 className="text-xs border-b border-zinc-950 pb-2 text-gold font-extrabold flex items-center justify-between">
                    <span className="text-[9px] text-zinc-500 font-normal">تتحمل على ImgBB تلقائيًا</span>
                    <span>👑 تخصيص أيقونات الرتب والمستويات</span>
                  </h4>

                  {/* Stage 1 Icon */}
                  <div className="space-y-2">
                    <label className="block text-zinc-400 text-xs font-semibold">أيقونة المستوى الأول: الرتبة البرونزية (Stage 1)</label>
                    <div className="flex gap-2 items-center">
                      <img src={prices.stage1IconUrl || '/icons/stage1.png'} alt="Stage 1" className="w-8 h-8 rounded border border-zinc-805 object-cover bg-black" />
                      <input
                        type="text"
                        value={prices.stage1IconUrl || ''}
                        onChange={(e) => setPrices({ ...prices, stage1IconUrl: e.target.value })}
                        placeholder="/icons/stage1.png"
                        className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-white text-xs font-mono rounded-lg focus:outline-none"
                        style={{ direction: 'ltr' }}
                      />
                      <label className="px-3 py-1.5 bg-gold/15 hover:bg-gold/25 border border-gold/30 text-gold text-xs font-bold rounded-lg cursor-pointer transition-all">
                        {uploadingStage1 ? 'جاري الرفع...' : 'رفع صورة 📤'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            if (e.target.files && e.target.files[0]) {
                              setUploadingStage1(true);
                              try {
                                const url = await uploadToImgBB(e.target.files[0]);
                                setPrices(prev => ({ ...prev, stage1IconUrl: url }));
                                alert('تم رفع أيقومة المستوى الأول بنجاح!');
                              } catch (err) {
                                console.error(err);
                                alert('فشل رفع الأيقونة.');
                              } finally {
                                setUploadingStage1(false);
                              }
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Stage 2 Icon */}
                  <div className="space-y-2">
                    <label className="block text-zinc-400 text-xs font-semibold">أيقونة المستوى الثاني: الرتبة الفضية (Stage 2)</label>
                    <div className="flex gap-2 items-center">
                      <img src={prices.stage2IconUrl || '/icons/stage2.png'} alt="Stage 2" className="w-8 h-8 rounded border border-zinc-805 object-cover bg-black" />
                      <input
                        type="text"
                        value={prices.stage2IconUrl || ''}
                        onChange={(e) => setPrices({ ...prices, stage2IconUrl: e.target.value })}
                        placeholder="/icons/stage2.png"
                        className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-white text-xs font-mono rounded-lg focus:outline-none"
                        style={{ direction: 'ltr' }}
                      />
                      <label className="px-3 py-1.5 bg-gold/15 hover:bg-gold/25 border border-gold/30 text-gold text-xs font-bold rounded-lg cursor-pointer transition-all">
                        {uploadingStage2 ? 'جاري الرفع...' : 'رفع صورة 📤'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            if (e.target.files && e.target.files[0]) {
                              setUploadingStage2(true);
                              try {
                                const url = await uploadToImgBB(e.target.files[0]);
                                setPrices(prev => ({ ...prev, stage2IconUrl: url }));
                                alert('تم رفع أيقونة المستوى الثاني بنجاح!');
                              } catch (err) {
                                console.error(err);
                                alert('فشل رفع الأيقونة.');
                              } finally {
                                setUploadingStage2(false);
                              }
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Stage 3 Icon */}
                  <div className="space-y-2">
                    <label className="block text-zinc-400 text-xs font-semibold">أيقونة المستوى الثالث: التاج الذهبي الملكي (Stage 3)</label>
                    <div className="flex gap-2 items-center">
                      <img src={prices.stage3IconUrl || '/icons/stage3.png'} alt="Stage 3" className="w-8 h-8 rounded border border-zinc-805 object-cover bg-black" />
                      <input
                        type="text"
                        value={prices.stage3IconUrl || ''}
                        onChange={(e) => setPrices({ ...prices, stage3IconUrl: e.target.value })}
                        placeholder="/icons/stage3.png"
                        className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-white text-xs font-mono rounded-lg focus:outline-none"
                        style={{ direction: 'ltr' }}
                      />
                      <label className="px-3 py-1.5 bg-gold/15 hover:bg-gold/25 border border-gold/30 text-gold text-xs font-bold rounded-lg cursor-pointer transition-all">
                        {uploadingStage3 ? 'جاري الرفع...' : 'رفع صورة 📤'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            if (e.target.files && e.target.files[0]) {
                              setUploadingStage3(true);
                              try {
                                const url = await uploadToImgBB(e.target.files[0]);
                                setPrices(prev => ({ ...prev, stage3IconUrl: url }));
                                alert('تم رفع أيقونة المستوى الثالث بنجاح!');
                              } catch (err) {
                                console.error(err);
                                alert('فشل رفع الأيقونة.');
                              } finally {
                                setUploadingStage3(false);
                              }
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* DYNAMIC TYPES / Kinds SECTION */}
                <div className="border border-zinc-900 p-4 rounded-xl space-y-4 bg-zinc-950/40 text-right">
                  <h4 className="text-xs font-extrabold text-gold border-b border-zinc-900 pb-2 text-right">🏷️ الأنواع والخامات المخصصة بالكتالوج المفتوح</h4>
                  <p className="text-[10px] text-zinc-400 leading-relaxed text-right">
                    هنا يمكنك تحديد الخامات المتاحة للاختيار (مثل: قطن مصري، بريميوم، ثقيل...) وسعرها أو الوصف المالي الملحق بها. وسيظهر للعملاء في فورم الطلب المخصص.
                  </p>

                  {/* List Current Types */}
                  <div className="space-y-2">
                    {(prices.types || []).map((t, idx) => (
                      <div key={t.id || idx} className="flex justify-between items-center bg-black/40 border border-zinc-900 p-3 rounded-lg text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            const updatedTypes = (prices.types || []).filter((_, i) => i !== idx);
                            setPrices({ ...prices, types: updatedTypes });
                          }}
                          className="text-red-400 hover:text-red-300 font-bold px-2 py-1 bg-red-955 bg-red-950/10 border border-red-900/30 rounded cursor-pointer transition-colors"
                        >
                          حذف 🗑️
                        </button>
                        <div className="text-right space-y-0.5">
                          <div className="font-extrabold text-white">{t.name}</div>
                          <div className="text-[10px] text-zinc-400">
                            الوصف السعري: <span className="text-gold font-bold">{t.priceLabel}</span> | القيمة المحسوبة: <span className="font-mono text-zinc-300">{t.priceValue} ج.م</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(prices.types || []).length === 0 && (
                      <div className="text-center py-4 bg-black/20 text-[11px] text-zinc-500 rounded border border-dashed border-zinc-900">
                        لا توجد خامات مخصصة، سيتم الرجوع إلى الخامات التلقائية.
                      </div>
                    )}
                  </div>

                  {/* Add New Type Module */}
                  <div className="bg-black/50 border border-zinc-900 p-3 rounded-lg space-y-3">
                    <h5 className="text-[11px] font-bold text-zinc-300 text-right">✨ إضافة خامة أو خيار جديد لموديلات التيشرتات:</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-zinc-500 text-[9px] mb-1 text-right">قيمة السعر الفعلي (تحديد رقمي اختياري)</label>
                        <input
                          type="number"
                          value={newTypePriceValue}
                          onChange={(e) => setNewTypePriceValue(Number(e.target.value))}
                          placeholder="مثلاً: 880"
                          className="w-full px-2 py-1.5 bg-zinc-905 bg-zinc-900 border border-zinc-800 text-white rounded text-xs leading-relaxed"
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-400 text-[9px] mb-1 text-right">نص السعر المكتوب (مثلاً: "السعر مفاجئة" أو "السعر: 880 جنيه")</label>
                        <input
                          type="text"
                          value={newTypePriceLabel}
                          onChange={(e) => setNewTypePriceLabel(e.target.value)}
                          placeholder='مثلاً: السعر: 880 ج.م'
                          className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 text-white rounded text-xs text-right leading-relaxed"
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-400 text-[9px] mb-1 text-right">اسم الخامة المنسدلة / نوع التيشرت</label>
                        <input
                          type="text"
                          value={newTypeName}
                          onChange={(e) => setNewTypeName(e.target.value)}
                          placeholder="مثلاً: تيشيرت التاج المذهب الملكي"
                          className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 text-white rounded text-xs text-right leading-relaxed"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newTypeName || !newTypePriceLabel) {
                          alert('يرجى كتابة الاسم ووصف السعر!');
                          return;
                        }
                        const newTypeItem = {
                          id: 'type_' + Date.now().toString(36),
                          name: newTypeName.trim(),
                          priceLabel: newTypePriceLabel.trim(),
                          priceValue: Number(newTypePriceValue) || 0
                        };
                        const updated = [...(prices.types || []), newTypeItem];
                        setPrices({ ...prices, types: updated });
                        setNewTypeName('');
                        setNewTypePriceLabel('');
                        setNewTypePriceValue(0);
                      }}
                      className="w-full py-1.5 bg-gold/15 hover:bg-gold/25 text-gold border border-gold/30 rounded text-xs font-bold transition-all cursor-pointer text-center"
                    >
                      إضافة لخامات ومقاسات الموديلات ➕
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingPrices}
                    className="w-full py-2.5 bg-gold hover:bg-gold/90 transition-colors text-black font-black text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-gold/25"
                  >
                    {savingPrices ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : 'حفظ التحديثات الفخمة والأسعار'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* USERS / COLLABORATORS TAB */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">المستخدمين المعتمدين والمشتركين</h3>
                <p className="text-xs text-zinc-400 mt-1 font-sans">الأعضاء الذين قاموا بتسجيل حساباتهم بواسطة أكواد الـ VIP والـ Wearables</p>
              </div>

              {usersProfiles.length === 0 ? (
                <div className="text-center py-12 border border-zinc-900 rounded-2xl bg-zinc-900/10">
                  <Users className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                  <p className="text-xs text-zinc-500">لا يوجد مستخدمون شركاء نشطون إلى الآن.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-zinc-900 text-zinc-500 font-bold">
                        <th className="pb-3 text-right">المشترك</th>
                        <th className="pb-3 text-right font-sans">اسم المستخدم ورابطه</th>
                        <th className="pb-3 text-right">كود الدخول المربوط</th>
                        <th className="pb-3 text-center">المستوى</th>
                        <th className="pb-3 text-center">عدد الإحالات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {usersProfiles.map((up) => (
                        <tr key={up.uid} className="hover:bg-zinc-900/25 transition-colors">
                          <td className="py-3 flex items-center gap-3">
                            <img src={up.photoUrl || '/icons/stage1.png'} alt={up.displayName} className="w-8 h-8 rounded-full bg-zinc-900 object-cover border border-zinc-800" />
                            <div>
                              <div className="font-bold text-white">{up.displayName}</div>
                              <div className="text-[10px] text-zinc-500 mt-0.5">{up.phone}</div>
                            </div>
                          </td>
                          <td className="py-3 font-mono text-[11px] text-amber-400">
                            @{up.username}
                          </td>
                          <td className="py-3 font-mono font-medium text-zinc-400">
                            {up.accessCode}
                          </td>
                          <td className="py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                              up.level === 3 ? 'bg-gold/10 border border-gold/20 text-gold shadow-sm shadow-gold/20' :
                              up.level === 2 ? 'bg-silver/10 border border-silver/20 text-silver' :
                              'bg-zinc-900 text-zinc-400'
                            }`}>
                              رتبة {up.level === 3 ? 'تاج دهبي 👑' : up.level === 2 ? 'فضي فاخر 🥈' : 'برونزي كلاسيك 🥉'}
                            </span>
                          </td>
                          <td className="py-3 text-center font-bold text-zinc-200">
                            {up.referralCount} زائر
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
