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
import { 
  LogOut, Shield, ShieldCheck, ShoppingBag, Image as ImageIcon, 
  TrendingUp, Clock, CheckCircle, Trash2, Plus, 
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
    duoPrice: 899,
    premiumPrice: 880,
    whatsappNumber: '201223043867'
  });
  const [savingPrices, setSavingPrices] = useState<boolean>(false);

  // Designs inputs
  const [designs, setDesigns] = useState<Design[]>([]);
  const [designName, setDesignName] = useState<string>('');
  const [designFile, setDesignFile] = useState<File | null>(null);
  const [designTags, setDesignTags] = useState<string>('');
  const [designWhatsapp, setDesignWhatsapp] = useState<string>('');
  const [uploadingDesign, setUploadingDesign] = useState<boolean>(false);
  const [designPreview, setDesignPreview] = useState<string>('');

  // Access Codes Inputs
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerProduct, setCustomerProduct] = useState<'classic' | 'duo' | 'premium'>('classic');
  const [generatingCode, setGeneratingCode] = useState<boolean>(false);
  const [newlyGeneratedCode, setNewlyGeneratedCode] = useState<string>('');

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
        if (snap.exists()) {
          setPrices(snap.data() as ConfigApp);
        } else {
          // Initialize if absent
          await setDoc(docRef, prices);
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

  // Upload/Create Custom Designs
  const handleCreateDesign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!designFile) {
      alert('يرجى اختيار صورة تصميم أولاً!');
      return;
    }
    setUploadingDesign(true);
    try {
      // 1. Upload to ImgBB
      const url = await uploadToImgBB(designFile);

      // 2. Parse tags
      const tagsList = designTags
        .toLowerCase()
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      // Add name of design to tags automatically to widen search matched matches
      if (!tagsList.includes(designName.toLowerCase())) {
        tagsList.push(designName.toLowerCase());
      }

      // 3. Save design to firestore
      const designId = doc(collection(db, 'designs')).id;
      const newDesign: Design = {
        id: designId,
        name: designName,
        imageUrl: url,
        searchTags: tagsList,
        whatsappMessage: designWhatsapp.trim() || `أهلاً ESM، أريد طلب تيشيرت فريش بتصميم: ${designName}`,
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'designs', designId), newDesign);

      // Reset
      setDesignName('');
      setDesignFile(null);
      setDesignPreview('');
      setDesignTags('');
      setDesignWhatsapp('');
      alert('تم إضافة التصميم المذهب بنجاح لقائمة الكتالوج الفاخر!');
    } catch (err) {
      console.error(err);
      alert('فشل رفع التصميم، تفقد صلاحيات Storage أو حجم الملف.');
    } finally {
      setUploadingDesign(false);
    }
  };

  const handleDeleteDesign = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التصميم؟')) return;
    try {
      await deleteDoc(doc(db, 'designs', id));
    } catch (err) {
      console.error(err);
    }
  };

  // Generating VIP codes
  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone) {
      alert('يرجى تعبئة كافة تفاصيل المشترك!');
      return;
    }
    setGeneratingCode(true);
    try {
      const uniqueSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const code = `ESM-${uniqueSuffix}`;

      await setDoc(doc(db, 'accessCodes', code), {
        code,
        name: customerName,
        phone: customerPhone,
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
                            <span className={`px-2 py-0.5 text-[10px] rounded font-bold ${o.fabric === 'Premium' ? 'bg-amber-950 text-gold border border-gold/20' : 'bg-zinc-900 text-zinc-300'}`}>
                              {o.fabric === 'Premium' ? 'بريميوم مذهب' : 'كلاسيك'}
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
                      <label className="block text-zinc-400 text-[10px] font-semibold mb-2">اسم المشتري</label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="أحمد محمد"
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-lg text-xs focus:outline-none focus:border-gold"
                      />
                    </div>

                    <div>
                      <label className="block text-zinc-400 text-[10px] font-semibold mb-2">رقم جوال تواصل وواتساب</label>
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="201234567890"
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
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Create Design Form */}
                <div className="lg:col-span-1 bg-black/40 border border-zinc-900 p-6 rounded-2xl space-y-4">
                  <h4 className="text-md font-bold text-white flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-gold" />
                    <span>إضافة تصميم مذهب جديد</span>
                  </h4>

                  <form onSubmit={handleCreateDesign} className="space-y-4">
                    <div>
                      <label className="block text-zinc-400 text-[10px] font-semibold mb-2">اسم التصميم المعروض</label>
                      <input
                        type="text"
                        required
                        value={designName}
                        onChange={(e) => setDesignName(e.target.value)}
                        placeholder="علي (الخط الديواني)"
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-lg text-xs focus:outline-none focus:border-gold"
                      />
                    </div>

                    <div>
                      <label className="block text-zinc-400 text-[10px] font-semibold mb-2">صورة التصميم بجودة عالية</label>
                      <div className="border border-dashed border-zinc-800 h-28 rounded-lg flex flex-col items-center justify-center relative cursor-pointer hover:border-gold bg-zinc-900 text-center p-2">
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
                    </div>

                    <div>
                      <label className="block text-zinc-400 text-[10px] font-semibold mb-2">الوسوم والكلمات الدلالية للبحث (مفصولة بفاصلة)</label>
                      <input
                        type="text"
                        required
                        value={designTags}
                        onChange={(e) => setDesignTags(e.target.value)}
                        placeholder="علي, ali, الديواني, تيشيرت علي"
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-lg text-xs focus:outline-none focus:border-gold"
                      />
                      <span className="text-[9px] text-zinc-500 mt-1 block">لتمكين العملاء من تصفية وبحث الأسماء المذهبة بسهولة</span>
                    </div>

                    <div>
                      <label className="block text-zinc-400 text-[10px] font-semibold mb-2">رسالة واتساب الافتراضية</label>
                      <textarea
                        value={designWhatsapp}
                        onChange={(e) => setDesignWhatsapp(e.target.value)}
                        placeholder="أهلاً براند إسمي ذهب، أريد الحصول على نسخة تيشيرت باسم علي الفاخر..."
                        className="w-full h-16 px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-lg text-xs focus:outline-none focus:border-gold resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={uploadingDesign}
                      className="w-full py-2.5 bg-gold text-black hover:bg-gold/90 transition-colors font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {uploadingDesign ? (
                        <>
                          <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          <span>جاري رفع الصورة والبيانات...</span>
                        </>
                      ) : (
                        <span>رفع ونشر في الكتالوج</span>
                      )}
                    </button>
                  </form>
                </div>

                {/* List design grids */}
                <div className="lg:col-span-2">
                  <h4 className="text-md font-bold text-white mb-4">التصاميم والأنماط المعروضة</h4>

                  {designs.length === 0 ? (
                    <div className="text-center py-12 border border-zinc-900 rounded-2xl bg-zinc-900/10">
                      <ImageIcon className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                      <p className="text-xs text-zinc-500 font-medium">لا توجد تصاميم في الكتالوج الآن.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 overflow-y-auto max-h-[550px] p-1">
                      {designs.map(d => (
                        <div key={d.id} className="bg-black/60 border border-zinc-900 rounded-2xl overflow-hidden text-right group relative">
                          <div className="aspect-square bg-zinc-950 p-2 relative flex items-center justify-center">
                            <img src={d.imageUrl} alt={d.name} className="h-full object-contain group-hover:scale-105 transition-transform" />
                            <button
                              onClick={() => handleDeleteDesign(d.id)}
                              className="absolute top-2 left-2 p-1.5 bg-red-950/70 border border-red-950 text-red-400 rounded-lg hover:bg-red-950 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="p-3">
                            <h5 className="font-bold text-xs text-white truncate">{d.name}</h5>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {d.searchTags.slice(0, 3).map((tag, idx) => (
                                <span key={idx} className="bg-zinc-900 text-zinc-500 text-[8px] font-medium px-1 py-0.5 rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
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
                <h3 className="text-md font-bold text-gold">التحكم بأسعار التيشيرت وهاتف واتساب المبيعات</h3>
                <p className="text-xs text-zinc-400 mt-1">تعديل هذه القيم يغير الأسعار فوراً في واجهة الجمهور والعملاء</p>
              </div>

              <form onSubmit={handleSavePrices} className="space-y-4 bg-black/40 border border-zinc-900 p-6 rounded-2xl">
                <div>
                  <label className="block text-zinc-400 text-xs font-semibold mb-2">العرض الكلاسيكي تيشرت فردي (Classic Price)</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      value={prices.classicPrice}
                      onChange={(e) => setPrices({ ...prices, classicPrice: Number(e.target.value) })}
                      className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 text-white text-xs font-bold font-mono rounded-lg focus:outline-none focus:gold-border"
                    />
                    <span className="absolute left-3 top-2.5 text-[10px] text-zinc-500">جنيه مصري</span>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-xs font-semibold mb-2">العرض الفاخر تاج مذهب تيشرت فردي (Premium Price)</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      value={prices.premiumPrice}
                      onChange={(e) => setPrices({ ...prices, premiumPrice: Number(e.target.value) })}
                      className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 text-white text-xs font-bold font-mono rounded-lg focus:outline-none focus:gold-border"
                    />
                    <span className="absolute left-3 top-2.5 text-[10px] text-zinc-500">جنيه مصري</span>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-xs font-semibold mb-2">العرض الثنائي المشترك تفصيل قطعتين (Duo Price)</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      value={prices.duoPrice}
                      onChange={(e) => setPrices({ ...prices, duoPrice: Number(e.target.value) })}
                      className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 text-white text-xs font-bold font-mono rounded-lg focus:outline-none focus:gold-border"
                    />
                    <span className="absolute left-3 top-2.5 text-[10px] text-zinc-500">جنيه مصري</span>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-xs font-semibold mb-2">رقم هاتف الواتساب للمبيعات (بالكود الدولي وبدون +)</label>
                  <input
                    type="text"
                    required
                    value={prices.whatsappNumber}
                    onChange={(e) => setPrices({ ...prices, whatsappNumber: e.target.value })}
                    placeholder="201223043867"
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 text-white text-xs font-bold font-mono rounded-lg focus:outline-none focus:gold-border"
                    style={{ direction: 'ltr' }}
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">الرقم الافتراضي المستخدم لتوجيه المحادثات والطلبات تلقائياً</span>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingPrices}
                    className="w-full py-2 bg-gold hover:bg-gold/90 transition-colors text-black font-bold text-xs rounded-lg cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {savingPrices ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : 'حفظ التحديثات والأسعار'}
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
