import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  db, auth, handleFirestoreError, OperationType 
} from './lib/firebase';
import { 
  collection, query, where, getDocs, addDoc, doc, getDoc, setDoc, serverTimestamp, updateDoc, orderBy 
} from 'firebase/firestore';
import { signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, User } from 'firebase/auth';
import { uploadToImgBB } from './lib/imgbb';
import { Design, AccessCode, Order, User as UserProfile, ConfigApp } from './types';
import AdminDashboard from './components/AdminDashboard';
import ReturnPolicy from './components/ReturnPolicy';
import { 
  Crown, Search, ShoppingBag, Shield, Sparkles, Check, Gift, Heart, Send, 
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

export default function App() {
  // Navigation & Routing state
  const [currentPath, setCurrentPath] = useState<string>('');
  const [urlParams, setUrlParams] = useState<URLSearchParams>(new URLSearchParams());
  
  // App Config and Prices
  const [configApp, setConfigApp] = useState<ConfigApp>({
    classicPrice: 499,
    classicDescription: "تيشرت وان سايز أوفرسايز قطن مصري فاخر ثقيل\n• قطن مصري 100% ثقيل للغاية\n• تطريز ذهبي بخيوط فاخرة\n• تغليف راقي كهدية فخمة\n• ضمان استرجاع مجاني لمدة 3 أيام",
    duoPrice: 899,
    duoDescription: "عرض التبادل الثنائي (الكابلز) المذهب\n• قطعتين قطن مذهبتين باسمين من اختيارك\n• توفير استثنائي بقيمة 120 جنيه مصري\n• تغليف ملكي خاص بكل قطعة على حدة\n• كود ثنائي لتفعيل بوابة VIP المخصصة",
    premiumPrice: 880,
    premiumDescription: "باقة التاج المذهب - النسخة الملكية الأقوى\n• تطريز مذهب بالاسم مع تصميم التاج الملكي الفاخر\n• قطن مصري ثقيل القوام مريح للغاية مع تفاصيل فخمة\n• يتضمن كارت VIP وباقة ملصقات مذهبة بريميوم\n• دخول مجاني مدى الحياة لبوابة النفاذ VIP والترقيات",
    whatsappNumber: '201223043867',
    focusedProduct: 'premium'
  });

  // Client states - Home
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchedName, setSearchedName] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Design[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [featuredDesigns, setFeaturedDesigns] = useState<Design[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState<boolean>(false);

  // Fetch Featured designs for homepage display
  useEffect(() => {
    async function fetchFeatured() {
      setLoadingFeatured(true);
      try {
        const q = query(
          collection(db, 'designs'),
          where('showOnHome', '==', true)
        );
        const snap = await getDocs(q);
        const list: Design[] = [];
        snap.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Design);
        });
        
        // Fallback to top 4 designs if none marked
        if (list.length === 0) {
          const fallbackSnap = await getDocs(query(collection(db, 'designs')));
          fallbackSnap.forEach(docSnap => {
            if (list.length < 4) {
              list.push({ id: docSnap.id, ...docSnap.data() } as Design);
            }
          });
        }
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
  const [leadFabric, setLeadFabric] = useState<'Classic' | 'Premium'>('Premium');
  const [leadNotes, setLeadNotes] = useState<string>('');
  const [submittingLead, setSubmittingLead] = useState<boolean>(false);
  const [leadSuccess, setLeadSuccess] = useState<boolean>(false);

  // Policy Modal
  const [isPolicyOpen, setIsPolicyOpen] = useState<boolean>(false);

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
  const [setupBio, setSetupBio] = useState<string>('');
  const [setupPhone, setSetupPhone] = useState<string>('');
  const [setupFile, setSetupFile] = useState<File | null>(null);
  const [setupPreview, setSetupPreview] = useState<string>('');
  const [savingSetup, setSavingSetup] = useState<boolean>(false);
  const [setupError, setSetupError] = useState<string>('');

  // VIP Share statistics
  const [referralsCount, setReferralsCount] = useState<number>(0);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Public profile visitor view
  const [publicProfile, setPublicProfile] = useState<UserProfile | null>(null);
  const [loadingPublicProfile, setLoadingPublicProfile] = useState<boolean>(false);

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

  // Fetch prices settings globally and trigger auto-seeding if empty
  useEffect(() => {
    async function initAndSeed() {
      try {
        // 1. Config seeding
        const configDocRef = doc(db, 'config', 'app');
        const configSnap = await getDoc(configDocRef);
        if (!configSnap.exists()) {
          const defaultConfig: ConfigApp = {
            classicPrice: 499,
            classicDescription: "تيشرت وان سايز أوفرسايز قطن مصري فاخر ثقيل\n• قطن مصري 100% ثقيل للغاية\n• تطريز ذهبي بخيوط فاخرة\n• تغليف راقي كهدية فخمة\n• ضمان استرجاع مجاني لمدة 3 أيام",
            duoPrice: 899,
            duoDescription: "عرض التبادل الثنائي (الكابلز) المذهب\n• قطعتين قطن مذهبتين باسمين من اختيارك\n• توفير استثنائي بقيمة 120 جنيه مصري\n• تغليف ملكي خاص بكل قطعة على حدة\n• كود ثنائي لتفعيل بوابة VIP المخصصة",
            premiumPrice: 880,
            premiumDescription: "باقة التاج المذهب - النسخة الملكية الأقوى\n• تطريز مذهب بالاسم مع تصميم التاج الملكي الفاخر\n• قطن مصري ثقيل القوام مريح للغاية مع تفاصيل فخمة\n• يتضمن كارت VIP وباقة ملصقات مذهبة بريميوم\n• دخول مجاني مدى الحياة لبوابة النفاذ VIP والترقيات",
            whatsappNumber: '201223043867',
            focusedProduct: 'premium'
          };
          await setDoc(configDocRef, defaultConfig);
          setConfigApp(defaultConfig);
          console.log('Autoseeded default config App settings successfully.');
        } else {
          // If already exists, ensure fields are safe or merge
          const data = configSnap.data();
          const merged: ConfigApp = {
            classicPrice: data.classicPrice || 499,
            classicDescription: data.classicDescription || "تيشرت وان سايز أوفرسايز قطن مصري فاخر ثقيل\n• قطن مصري 100% ثقيل للغاية\n• تطريز ذهبي بخيوط فاخرة\n• تغليف راقي كهدية فخمة\n• ضمان استرجاع مجاني لمدة 3 أيام",
            duoPrice: data.duoPrice || 899,
            duoDescription: data.duoDescription || "عرض التبادل الثنائي (الكابلز) المذهب\n• قطعتين قطن مذهبتين باسمين من اختيارك\n• توفير استثنائي بقيمة 120 جنيه مصري\n• تغليف ملكي خاص بكل قطعة على حدة\n• كود ثنائي لتفعيل بوابة VIP المخصصة",
            premiumPrice: data.premiumPrice || 880,
            premiumDescription: data.premiumDescription || "باقة التاج المذهب - النسخة الملكية الأقوى\n• تطريز مذهب بالاسم مع تصميم التاج الملكي الفاخر\n• قطن مصري ثقيل القوام مريح للغاية مع تفاصيل فخمة\n• يتضمن كارت VIP وباقة ملصقات مذهبة بريميوم\n• دخول مجاني مدى الحياة لبوابة النفاذ VIP والترقيات",
            whatsappNumber: data.whatsappNumber || '201223043867',
            focusedProduct: data.focusedProduct || 'premium'
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

  // Observe User State for apps tab
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setLoadingProfile(true);
        try {
          const profileDoc = await getDoc(doc(db, 'users', user.uid));
          if (profileDoc.exists()) {
            const data = profileDoc.data() as UserProfile;
            setUserProfile(data);
            
            // Calculate live Referral Count matching username
            const refQuery = query(collection(db, 'referrals'), where('fromUsername', '==', data.username.toLowerCase()));
            const querySnap = await getDocs(refQuery);
            const liveCount = querySnap.size;
            setReferralsCount(liveCount);

            // Level upgrade logic: >= 15 level=2, >= 35 level=3
            let finalLevel: 1 | 2 | 3 = data.level;
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
              setUserProfile({ ...data, level: finalLevel, referralCount: liveCount });
            }
          }
        } catch (err) {
          console.error('Error listening to user profile changes:', err);
        } finally {
          setLoadingProfile(false);
        }
      } else {
        setUserProfile(null);
      }
    });

    return () => unsub();
  }, [currentPath]);

  // Fetch Public Profile details if on specific path
  useEffect(() => {
    const cleanPath = currentPath.substring(1).trim();
    const isReserved = ['admin', 'apps', 'api', 'assets', 'icons', 'public', ''].includes(cleanPath.toLowerCase());

    if (!isReserved) {
      const fetchPublicUserProfile = async () => {
        setLoadingPublicProfile(true);
        try {
          const uQuery = query(collection(db, 'users'), where('username', '==', cleanPath.toLowerCase()));
          const userSnap = await getDocs(uQuery);
          if (!userSnap.empty) {
            setPublicProfile(userSnap.docs[0].data() as UserProfile);
          } else {
            setPublicProfile(null);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingPublicProfile(false);
        }
      };
      fetchPublicUserProfile();
    } else {
      setPublicProfile(null);
    }
  }, [currentPath]);

  // Navigate Helper
  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    setUrlParams(new URLSearchParams());
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
        fabric: leadFabric,
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
      const newUserProfile: UserProfile = {
        username: cleanUsername,
        displayName: setupDisplayName.trim(),
        photoUrl,
        bio: setupBio.trim(),
        phone: setupPhone.trim(),
        accessCode: activeCode,
        level: boughtProductLevel, // Level starts according to what product they bought
        referralCount: 0,
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'users', auth.currentUser!.uid), newUserProfile);
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

  // Update dyn manifest in viewport head dynamically
  useEffect(() => {
    if (isProfileView) {
      const usernameParam = currentPath.substring(1);
      let linkElement = document.querySelector<HTMLLinkElement>("link[rel='manifest']");
      if (!linkElement) {
        linkElement = document.createElement('link');
        linkElement.rel = 'manifest';
        document.head.appendChild(linkElement);
      }
      linkElement.href = `/${usernameParam}/manifest.json`;
    } else {
      let linkElement = document.querySelector<HTMLLinkElement>("link[rel='manifest']");
      if (linkElement) {
        linkElement.removeAttribute('href');
      }
    }
  }, [isProfileView, currentPath]);

  // RENDERING LOGICS

  // Admin routing
  if (isAdminView) {
    return <AdminDashboard />;
  }

  // User VIP Dashboard /apps route
  if (isAppsView) {
    const activeSavedCode = localStorage.getItem('esm_code');
    const isCodeActivated = !!activeSavedCode;

    return (
      <div className="min-h-screen bg-black text-white relative flex flex-col justify-between overflow-hidden">
        <ParticleBackground />

        {/* Global Nav Bar */}
        <header className="border-b border-gold/10 bg-black/80 sticky top-0 z-40 backdrop-blur w-full">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <button onClick={() => navigateTo('/')} className="flex items-center gap-2 cursor-pointer">
              <Crown className="w-6 h-6 text-gold gold-glow" />
              <span className="font-serif font-black tracking-wider text-sm gold-gradient">ESM • إسمي ذهب</span>
            </button>
            <button 
              onClick={() => navigateTo('/')}
              className="text-xs font-bold text-zinc-400 hover:text-gold flex items-center gap-1 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>الرئيسية</span>
            </button>
          </div>
        </header>

        <main className="flex-grow flex items-center justify-center p-4 relative z-10 my-8">
          {/* Gate View: If not logged-in/verified with code */}
          {!currentUser || !isCodeActivated ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md bg-zinc-950/80 border border-gold/20 p-8 rounded-3xl shadow-2xl backdrop-blur-md relative"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-zinc-900 border border-gold/30 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-gold animate-pulse text-gold" />
                </div>
                <h1 className="text-xl font-bold font-serif gold-gradient">بوابة النفاذ الملكي VIP</h1>
                <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                  هذا القسم مخصص حصرياً لمالكي تيشيرت "إسمي ذهب" الفاخر. اكتب كود النفاذ المرفق بقطعكتك لتفعيل رتبتك والحصول على رتبتك الرقمية.
                </p>
              </div>

              <form onSubmit={handleGateVerify} className="space-y-4">
                <div>
                  <label className="block text-zinc-400 text-xs font-bold mb-2">أدخل كود النفاذ المذهب *</label>
                  <input
                    type="text"
                    required
                    value={codeInputValue}
                    onChange={(e) => setCodeInputValue(e.target.value)}
                    placeholder="ESM-XXXX"
                    className="w-full px-4 py-3 rounded-xl bg-black border border-zinc-800 text-white text-md font-black font-mono tracking-wider text-center focus:border-gold focus:outline-none placeholder:text-zinc-650"
                  />
                </div>

                {gateError && (
                  <div className="p-3 bg-red-950/40 border border-red-900/40 text-red-300 text-xs text-center rounded-xl leading-relaxed">
                    {gateError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={checkingCode}
                  className="w-full py-3 bg-gold text-black rounded-xl font-black text-xs hover:bg-gold/85 transition-colors cursor-pointer shadow-lg shadow-gold/20 flex items-center justify-center"
                >
                  {checkingCode ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>التحقق من الكود وتفعيل VIP</span>
                  )}
                </button>
              </form>
            </motion.div>
          ) : (
            /* Activated flow */
            loadingProfile ? (
              <div className="text-center">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full mx-auto"
                />
                <p className="text-xs text-zinc-400 mt-4">جاري تحميل ملفك الفخم...</p>
              </div>
            ) : !userProfile ? (
              /* Setup Profile flow */
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-zinc-950/80 border border-gold/20 p-8 rounded-3xl shadow-2xl backdrop-blur relative"
              >
                <div className="text-center mb-6">
                  <h1 className="text-lg font-black font-serif gold-gradient">إكمال التسجيل للأسياد</h1>
                  <p className="text-[10px] text-zinc-400 mt-1">تجهيز رتبتك وبطاقتك الملكية للبراند</p>
                </div>

                <form onSubmit={handleSetupSubmit} className="space-y-4">
                  <div>
                    <label className="block text-zinc-400 text-[10px] font-bold mb-1.5">اسم الشهرة الظاهر للجميع *</label>
                    <input
                      type="text"
                      required
                      value={setupDisplayName}
                      onChange={(e) => setSetupDisplayName(e.target.value)}
                      placeholder="الأمير أحمد"
                      className="w-full px-3 py-2 bg-black border border-zinc-800 text-white rounded-xl text-xs focus:outline-none focus:border-gold"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 text-[10px] font-bold mb-1.5">اسم المستخدم (بالأحرف الانجليزية والأرقام فقط) *</label>
                    <input
                      type="text"
                      required
                      value={setupUsername}
                      onChange={(e) => setSetupUsername(e.target.value)}
                      placeholder="ahmed_esm"
                      className="w-full px-3 py-2 bg-black border border-zinc-800 text-white rounded-xl text-xs focus:outline-none focus:border-gold"
                      style={{ direction: 'ltr' }}
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 text-[10px] font-bold mb-1.5">الرقم الشخصي لمتابعة الجوائز والطلبات *</label>
                    <input
                      type="tel"
                      required
                      value={setupPhone}
                      onChange={(e) => setSetupPhone(e.target.value)}
                      placeholder="مثال: 012345678"
                      className="w-full px-3 py-2 bg-black border border-zinc-800 text-white rounded-xl text-xs focus:outline-none focus:border-gold"
                      style={{ direction: 'ltr' }}
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 text-[10px] font-bold mb-1.5">شرح ووصف مخصص لملفك (البيو) *</label>
                    <textarea
                      required
                      value={setupBio}
                      onChange={(e) => setSetupBio(e.target.value)}
                      placeholder="شخص فخم يقتني ملابس الملوك الفخمة من ESM"
                      className="w-full h-16 px-3 py-2 bg-black border border-zinc-800 text-white rounded-xl text-xs focus:outline-none focus:border-gold resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 text-[10px] font-bold mb-1.5 font-sans">اختر صورتك المتميزة بالتيشيرت *</label>
                    <div className="border border-dashed border-zinc-800 hover:border-gold/30 transition-colors p-4 rounded-xl flex flex-col justify-center items-center text-center relative cursor-pointer min-h-[110px] bg-black">
                      <input
                        type="file"
                        accept="image/*"
                        required
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setSetupFile(e.target.files[0]);
                            setSetupPreview(URL.createObjectURL(e.target.files[0]));
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      {setupPreview ? (
                        <img src={setupPreview} alt="Wearable" className="h-20 w-20 rounded-xl object-cover" />
                      ) : (
                        <div className="space-y-1">
                          <UploadCloud className="w-6 h-6 text-zinc-600 mx-auto" />
                          <span className="block text-zinc-500 text-[10px] font-bold">ارفع لقطتك الفخمة بالتيشيرت</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {setupError && (
                    <div className="p-3 bg-red-950/40 border border-red-900/35 text-red-400 text-xs rounded-xl">
                      {setupError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={savingSetup}
                    className="w-full py-2.5 bg-gold hover:bg-gold/95 transition-colors text-black text-xs font-black rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow"
                  >
                    {savingSetup ? (
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>تأكيد وإنشاء الملف التعريفي الملكي</span>
                    )}
                  </button>
                </form>
              </motion.div>
            ) : (
              /* DASHBOARD VIEW */
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-xl bg-zinc-950/80 border border-gold/20 p-6 md:p-8 rounded-3xl shadow-2xl backdrop-blur relative space-y-6"
              >
                {/* Profile card header */}
                <div className="flex flex-col md:flex-row items-center gap-6 border-b border-zinc-900 pb-6 text-center md:text-right">
                  <div className="relative">
                    <img 
                      src={userProfile.photoUrl} 
                      alt={userProfile.displayName} 
                      className="w-24 h-24 rounded-full object-cover border-2 border-gold shadow-md"
                    />
                    {userProfile.level === 3 && (
                      <div className="absolute -top-3 -right-3 bg-black border border-gold rounded-full p-1.5 shadow shadow-gold/40">
                        <Crown className="w-5 h-5 text-gold gold-glow" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                      <h2 className="text-xl font-bold text-white font-serif">{userProfile.displayName}</h2>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase inline-block mx-auto md:mx-0 ${
                        userProfile.level === 3 ? 'bg-gold text-black' :
                        userProfile.level === 2 ? 'bg-zinc-200 text-black' :
                        'bg-zinc-800 text-zinc-300'
                      }`}>
                        {userProfile.level === 3 ? 'رتبة التاج الذهبي 👑' :
                         userProfile.level === 2 ? 'الرتبة الفضية الفاخرة🥈' :
                         'الرتبة البرونزية كلاسيك🥉'}
                      </span>
                    </div>
                    <p className="text-xs text-gold/80 font-mono tracking-wider font-semibold">@{userProfile.username}</p>
                    <p className="text-xs text-zinc-400 italic max-w-sm">"{userProfile.bio}"</p>
                  </div>
                </div>

                {/* Level Up Statistics widgets */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/60 border border-zinc-900 rounded-2xl p-4 text-center space-y-1">
                    <Users className="w-6 h-6 text-gold mx-auto" />
                    <div className="text-lg font-black font-mono text-white">{referralsCount}</div>
                    <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">عدد الإحالات النشطة</div>
                  </div>

                  <div className="bg-black/60 border border-zinc-900 rounded-2xl p-4 text-center space-y-1 justify-center flex flex-col">
                    <Award className="w-6 h-6 text-gold mx-auto" />
                    <div className="text-xs font-black text-gold mt-1">
                      {userProfile.level === 3 ? 'أعلى مستوى مذهب الملكي' :
                       userProfile.level === 2 ? `متبقي ${35 - referralsCount} للملكي` :
                       `متبقي ${15 - referralsCount} للرتبة الفضية`}
                    </div>
                    <div className="text-[9px] font-bold text-zinc-550 text-zinc-500">مستوى تذكرة التطعيم</div>
                  </div>
                </div>

                {/* Referrals loop instructions details */}
                <div className="bg-zinc-900/40 border border-zinc-900 p-4 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5 justify-end">
                    <span>خطوات الارتقاء لمراتب الملوك والتاج الفخم</span>
                    <Sparkles className="w-3.5 h-3.5 text-gold" />
                  </h4>
                  <ul className="text-[10px] text-zinc-400 space-y-1 text-right list-disc list-inside">
                    <li>شارك رابطك المخصص والفريد بالأسفل مع أصدقائك ومعارفك.</li>
                    <li>المستوى الأول (برونزي) - تفعيل تلقائي عند تفعيل كود التيشيرت.</li>
                    <li>المستوى الثاني (فضي) - عند إكمال 15 إحالة صديق مهتم بنجاح.</li>
                    <li>المستوى الثالث الملكي (ذهبي وتاج) - عند اكتمال 35 إحالة.</li>
                  </ul>
                </div>

                {/* Copying link */}
                <div className="space-y-2">
                  <label className="block text-zinc-400 text-[10px] font-bold text-right">رابط الترويج ومشاركة الفخامة الخاص بك</label>
                  <div className="flex gap-2 relative">
                    <button
                      onClick={() => copyShareLink(userProfile.username)}
                      className="px-4 py-2.5 bg-gold hover:bg-gold/90 text-black text-xs font-black rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'تم نسخ الرابط!' : 'نسخ رابطي'}</span>
                    </button>
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/${userProfile.username}?ref=${userProfile.username}`}
                      className="flex-grow px-3 py-2 bg-black border border-zinc-800 text-zinc-300 font-mono text-[11px] rounded-lg focus:outline-none text-left"
                      style={{ direction: 'ltr' }}
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: 'براند إسمي ذهب الفاخر',
                          text: `أهلاً، شاهد تيشيرتي المذهب بالتاج الفخم من براند إسمي ذهب!`,
                          url: `${window.location.origin}/${userProfile.username}?ref=${userProfile.username}`
                        });
                      } else {
                        copyShareLink(userProfile.username);
                      }
                    }}
                    className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[10px] font-bold rounded-lg cursor-pointer transition-colors border border-zinc-800 flex items-center justify-center gap-1"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>مشاركة الرابط مع الأصدقاء</span>
                  </button>
                </div>

                <div className="text-center pt-2">
                  <button 
                    onClick={() => {
                      // Logout action and clear states
                      auth.signOut();
                      localStorage.removeItem('esm_code');
                      navigateTo('/apps');
                    }}
                    className="text-red-400/80 hover:text-red-400 font-medium text-[10px] underline cursor-pointer"
                  >
                    تسجيل الخروج من لوحة الـ VIP
                  </button>
                </div>
              </motion.div>
            )
          )}
        </main>

        <footer className="border-t border-zinc-900 bg-black py-4 text-center text-[10px] text-zinc-550 text-zinc-500 relative z-10">
          <p>© جميع الحقوق محفوظة لبراند إسمي ذهب • 2026</p>
        </footer>
      </div>
    );
  }

  // PUBLIC PROFILE VIEW /{username}
  if (isProfileView) {
    const isProfileFound = !!publicProfile;

    return (
      <div className="min-h-screen bg-black text-white relative flex flex-col justify-between overflow-hidden">
        <ParticleBackground />

        {/* Dynamic header */}
        <header className="border-b border-gold/10 bg-black/80 sticky top-0 z-40 backdrop-blur w-full">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <button onClick={() => navigateTo('/')} className="flex items-center gap-2 cursor-pointer">
              <Crown className="w-6 h-6 text-gold gold-glow" />
              <span className="font-serif font-black tracking-wider text-sm gold-gradient">ESM • إسمي ذهب</span>
            </button>
            <button 
              onClick={() => navigateTo('/')}
              className="text-xs font-bold text-zinc-400 hover:text-gold flex items-center gap-1 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>اطلب قطعة لنفسك</span>
            </button>
          </div>
        </header>

        <main className="flex-grow flex items-center justify-center p-4 relative z-10 my-8">
          {loadingPublicProfile ? (
            <div className="text-center">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full mx-auto"
              />
              <p className="text-xs text-zinc-400 mt-4">جاري فتح ملف الأسياد الفخم...</p>
            </div>
          ) : isProfileFound && publicProfile ? (
            /* Premium Profile matched! */
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md bg-zinc-950/80 border border-gold/20 p-8 rounded-3xl shadow-2xl text-center backdrop-blur-md relative space-y-6"
            >
              {/* Profile Image card */}
              <div className="relative inline-block mx-auto">
                <img 
                  src={publicProfile.photoUrl} 
                  alt={publicProfile.displayName} 
                  className="w-28 h-28 rounded-full object-cover border-4 border-gold mx-auto shadow-xl"
                />
                {publicProfile.level === 3 && (
                  <div className="absolute top-0 right-0 bg-black border border-gold rounded-full p-2 shadow-lg shadow-gold/40">
                    <Crown className="w-6 h-6 text-gold gold-glow" />
                  </div>
                )}
              </div>

              {/* Badges and Names */}
              <div className="space-y-1">
                <div className="flex justify-center items-center gap-1.5">
                  <h1 className="text-xl font-black font-serif gold-gradient">{publicProfile.displayName}</h1>
                </div>
                <p className="text-xs text-zinc-400 font-mono font-semibold">@{publicProfile.username}</p>
                <div className="pt-1">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase inline-block mx-auto ${
                    publicProfile.level === 3 ? 'bg-gold text-black shadow shadow-gold/20' :
                    publicProfile.level === 2 ? 'bg-zinc-200 text-black' :
                    'bg-zinc-800 text-zinc-300'
                  }`}>
                    {publicProfile.level === 3 ? 'رتبة التاج الذهبي الملكية 👑' :
                     publicProfile.level === 2 ? 'الرتبة الفضية الفاخرة🥈' :
                     'الرتبة البرونزية كلاسيك🥉'}
                  </span>
                </div>
              </div>

              {/* Bio block representation */}
              <div className="py-4 border-y border-zinc-900">
                <p className="text-xs text-zinc-300 font-medium italic leading-relaxed">
                  "{publicProfile.bio}"
                </p>
              </div>

              {/* Order button redirects back to Homepage */}
              <div className="space-y-3">
                <button
                  onClick={() => navigateTo(`/?ref=${publicProfile.username}`)}
                  className="w-full py-3 bg-gold text-black hover:bg-gold/90 transition-colors text-xs font-black rounded-xl cursor-pointer shadow-lg shadow-gold/30 flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>اطلب قطعتك المذهبة الفخمة الآن</span>
                </button>
                <p className="text-[10px] text-zinc-500 leading-relaxed font-sans mt-1">
                  احصل على تيشيرت وان سايز أوفرسايز قطن مصري 100% ثقيل مطرز باسمك الفخم بلمسات ملكية أنيقة.
                </p>
              </div>
            </motion.div>
          ) : (
            /* User profile not found fallback */
            <div className="text-center space-y-4 max-w-sm">
              <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto">
                <HelpCircle className="w-8 h-8 text-zinc-650" />
              </div>
              <h2 className="text-lg font-bold">الملف الفخم غير مدرج بالبراند</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                عذراً، هذا الحساب ليس مسجلاً أو ربما تم تغيير اسم المعرف الملكي الخاص به. يرجى مراجعة وتفقد الرابط الفخم مجدداً.
              </p>
              <button 
                onClick={() => navigateTo('/')}
                className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs hover:border-gold/50 cursor-pointer"
              >
                العودة للرئيسية
              </button>
            </div>
          )}
        </main>

        <footer className="border-t border-zinc-900 bg-black py-4 text-center text-[10px] text-zinc-550 leading-relaxed text-zinc-500 relative z-10">
          <p>© جميع الحقوق محفوظة لبراند إسمي ذهب • 2026</p>
        </footer>
      </div>
    );
  }

  // HOMEPAGE VIEW (/) DEFAULT VIEW
  return (
    <div className="min-h-screen bg-black text-white relative flex flex-col justify-between overflow-x-hidden">
      <ParticleBackground />

      {/* LUXURY ROYAL HEADER */}
      <header className="border-b border-gold/10 bg-black/80 sticky top-0 z-40 backdrop-blur w-full">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Logo element */}
          <div className="flex items-center gap-2">
            <Crown className="w-7 h-7 text-gold gold-glow animate-bounce" />
            <h1 className="font-serif font-black tracking-wider text-md sm:text-lg gold-gradient">ESM • إسمي ذهب</h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateTo('/apps')}
              className="px-4 py-2 rounded-xl bg-gold text-black text-xs font-black hover:bg-gold/90 transition-colors cursor-pointer flex items-center gap-1 shadow-sm shadow-gold/20"
            >
              <Award className="w-3.5 h-3.5" />
              <span>تسجيل Wearable</span>
            </button>
            <button 
              onClick={() => setIsPolicyOpen(true)}
              className="text-xs font-bold text-zinc-400 hover:text-gold transition-colors hidden sm:inline-block cursor-pointer"
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
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-gold/15 border border-gold/30 rounded-full"
          >
            <Crown className="w-3.5 h-3.5 text-gold gold-glow" />
            <span className="text-[10px] text-gold font-extrabold uppercase tracking-widest leading-relaxed">براند الألبسة الفخمة والأسياد</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-5xl font-black font-serif leading-tight sm:leading-none text-white gold-gradient"
          >
            قطعة فنية فخمة مستوحاة من هيبة اسمك!
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed"
          >
            تيشيرت وان سايز أوفرسايز منسوج بقطن مصري 100% ثقيل للغاية ثقيل القوام، ومطرز يدوياً باسمك الفخم بلمسات وخيوط حريرية مطلية بالذهب وتاج الملوك.
          </motion.p>
        </section>

        {/* TOP SEARCH BAR IN CATOLOGUE */}
        <section id="search-section" className="max-w-2xl mx-auto bg-zinc-950/40 border border-zinc-900 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur">
          <div className="text-center space-y-2">
            <h3 className="text-md sm:text-lg font-bold text-white flex items-center justify-center gap-2">
              <Search className="w-5 h-5 text-gold" />
              <span>ابحث عن نمط اسمك المذهب</span>
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              اكتب اسمك باللغة العربية أو الإنجليزية لتفقد جاهزيته بالخط المذهب الفاخر من مصممينا المعتمدين.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="مثال: علي، أحمد، سارة، مريم..."
              className="flex-grow px-4 py-3 bg-black border border-zinc-800 text-white text-xs rounded-xl focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold transition-all"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="px-5 py-3 bg-gold hover:bg-gold/90 text-black font-black text-xs rounded-xl transition-colors cursor-pointer"
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
                className="space-y-4 pt-4 border-t border-zinc-900"
              >
                {searchResults.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center justify-center p-4 bg-gradient-to-r from-gold/10 via-amber-500/15 to-gold/10 rounded-2xl border border-gold/30 text-center space-y-1">
                      <div className="text-xs sm:text-sm font-black text-gold flex items-center justify-center gap-2 gold-glow">
                        <Sparkles className="w-4 h-4 text-gold animate-bounce" />
                        <span>وجدنا قطعة باسمك!</span>
                        <Crown className="w-4 h-4 text-gold" />
                      </div>
                      <p className="text-[10px] text-zinc-300">لقد حظيت بتصميم مذهب نادر يليق بك تماماً:</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {searchResults.map((design) => (
                        <div 
                          key={design.id} 
                          className="bg-black/60 border border-zinc-800 hover:border-gold/30 rounded-2xl p-4 flex gap-4 items-center transition-all group relative overflow-hidden"
                        >
                          <div className="w-20 h-20 bg-zinc-950 p-1.5 rounded-xl flex items-center justify-center border border-zinc-900">
                            <img src={design.imageUrl} alt={design.name} className="h-full object-contain group-hover:scale-105 transition-transform" />
                          </div>
                          
                          <div className="flex-grow space-y-1 text-right">
                            <h4 className="font-bold text-xs text-white">{design.name}</h4>
                            <p className="text-[10px] text-zinc-500 font-serif leading-relaxed">بتاج الملوك المذهب</p>
                            <button
                              onClick={() => {
                                const textUrl = `${design.whatsappMessage}\nالتصميم: ${design.imageUrl}`;
                                window.open(`https://wa.me/${configApp.whatsappNumber}?text=${encodeURIComponent(textUrl)}`, '_blank');
                              }}
                              className="px-3 py-1.5 bg-gold hover:bg-gold/85 text-black text-[10px] font-black rounded-lg cursor-pointer transition-all"
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
                    <div className="p-3 bg-zinc-900/60 border border-zinc-800 text-zinc-400 text-xs rounded-xl leading-relaxed">
                      الاسم الذي استعلمت عنه "<span className="text-gold font-bold">{searchedName}</span>" فريد من نوعه للغاية، ولأنه لا يوجد قطعة مطابقة للجاهز، سنقوم بتفصيل وتصميم خط مذهب خاص باسمك مخصوص فوراً! تعرّف على طلب التخصيص الاستثنائي:
                    </div>

                    {leadSuccess ? (
                      <div className="p-4 bg-gold/10 border border-gold/30 text-gold text-xs rounded-xl font-bold font-sans space-y-1">
                        <div>تم حجز وتنسيق طلبك الفاخر كطلب خاص!</div>
                        <div className="text-[10px] text-zinc-400 font-mono mt-1">جاري توجيهك لواتساب براند الأسياد لبدء التطريز...</div>
                      </div>
                    ) : (
                      <form onSubmit={handleQuickOrderSubmit} className="space-y-3 text-right">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-zinc-500 text-[10px] font-bold mb-1 mr-1">الاسم المرغوب تطريزه على الصدر</label>
                            <input
                              type="text"
                              required
                              value={leadName}
                              onChange={(e) => setLeadName(e.target.value)}
                              placeholder="مثال: يوسف، سمر..."
                              className="w-full px-3 py-2 bg-black border border-zinc-900 text-xs text-white rounded-xl focus:outline-none focus:border-gold"
                            />
                          </div>

                          <div>
                            <label className="block text-zinc-500 text-[10px] font-bold mb-1 mr-1">رقم الواتساب وبداية كود الدولة</label>
                            <input
                              type="tel"
                              required
                              value={leadPhone}
                              onChange={(e) => setLeadPhone(e.target.value)}
                              placeholder="مثال: 20123456789"
                              className="w-full px-3 py-2 bg-black border border-zinc-900 text-xs text-white rounded-xl focus:outline-none focus:border-gold"
                              style={{ direction: 'ltr' }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-zinc-500 text-[10px] font-bold mb-1 mr-1">الخامة وقصة التيشيرت</label>
                            <select
                              value={leadFabric}
                              onChange={(e) => setLeadFabric(e.target.value as any)}
                              className="w-full px-3 py-2 bg-black border border-zinc-900 text-xs text-white rounded-xl focus:outline-none focus:border-gold font-bold"
                            >
                              <option value="Premium">قطن مذهب فاخر بالتاج (Premium)</option>
                              <option value="Classic">قطن مصري كلاسيكي (Classic)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-zinc-500 text-[10px] font-bold mb-1 mr-1">أي ملاحظات إضافية (ألوان، مقاسات خاصة)</label>
                            <input
                              type="text"
                              value={leadNotes}
                              onChange={(e) => setLeadNotes(e.target.value)}
                              placeholder="أوردر مقاس XL، شريط الظهر كلاسيك..."
                              className="w-full px-3 py-2 bg-black border border-zinc-900 text-xs text-white rounded-xl focus:outline-none focus:border-gold"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={submittingLead}
                          className="w-full py-2.5 bg-gold hover:bg-gold/90 text-black text-xs font-black rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-gold/10"
                        >
                          {submittingLead ? (
                            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
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
        </section>

        {/* HOMEPAGE FEATURED DESIGNS CATALOGUE */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h3 className="text-xl sm:text-2xl font-black font-serif gold-gradient">معرض تصاميم الأسياد المحددة</h3>
            <p className="text-xs text-zinc-400">تصاميم حصرية تم تجهيز خطوطها الفنية لعرض الفخامة الملكية</p>
          </div>

          {loadingFeatured ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {featuredDesigns.map((design) => (
                <div 
                  key={design.id}
                  className="bg-zinc-950/80 border border-zinc-900 rounded-2xl p-4 flex flex-col justify-between space-y-4 hover:border-gold/30 hover:shadow-xl hover:shadow-gold/5 transition-all text-center group relative overflow-hidden"
                >
                  <div className="h-44 bg-black/60 p-3 rounded-xl flex items-center justify-center border border-zinc-900/60 relative overflow-hidden">
                    <img 
                      src={design.imageUrl} 
                      alt={design.name} 
                      referrerPolicy="no-referrer"
                      className="h-full object-contain group-hover:scale-105 transition-all duration-300" 
                    />
                    <div className="absolute top-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[8px] font-bold text-gold border border-gold/20 flex items-center gap-0.5">
                      <Crown className="w-2.5 h-2.5 text-gold" />
                      <span>تطريز مذهب</span>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="font-bold text-xs text-white group-hover:text-gold transition-colors">{design.name}</h4>
                    <p className="text-[10px] text-zinc-500 font-sans">تصميم الكتالوج المميز بـ "إسمي ذهب"</p>
                  </div>

                  <button
                    onClick={() => {
                      const textUrl = `${design.whatsappMessage}\nالتصميم: ${design.imageUrl}`;
                      window.open(`https://wa.me/${configApp.whatsappNumber}?text=${encodeURIComponent(textUrl)}`, '_blank');
                    }}
                    className="w-full py-2 bg-gradient-to-r from-amber-600 to-gold text-black hover:opacity-90 font-black text-[10px] rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>اطلب هذا التصميم الفخم</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* PRICING PLANS SECTION */}
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h3 className="text-xl sm:text-2xl font-black font-serif gold-gradient">باقات الأسياد المتاحة</h3>
            <p className="text-xs text-zinc-400">أسعار الكتالوج لامتلاك أرقى القطع الفنية في خزانة ملابسك</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                id: 'classic',
                name: 'الباقة الكلاسيكية',
                sub: 'العرض الفردي الأساسي',
                price: configApp.classicPrice,
                description: configApp.classicDescription,
                colorClass: 'silver-gradient',
                btnText: 'تصفح واطلب نسختك'
              },
              {
                id: 'premium',
                name: 'باقة التاج المذهب',
                sub: 'هيبة الملوك والأسياد',
                price: configApp.premiumPrice,
                description: configApp.premiumDescription,
                colorClass: 'gold-gradient',
                btnText: 'تصفح واطلب نسختك'
              },
              {
                id: 'duo',
                name: 'عرض الكابلز الثنائي',
                sub: 'عرض ترويجي استثنائي',
                price: configApp.duoPrice,
                description: configApp.duoDescription,
                colorClass: 'silver-gradient',
                btnText: 'اطلب العرض الثنائي'
              }
            ].map((pkg) => {
              const isFocused = configApp.focusedProduct === pkg.id;
              return (
                <div 
                  key={pkg.id}
                  className={`bg-zinc-950 rounded-3xl p-6 text-center hover:shadow-2xl transition-all flex flex-col justify-between space-y-6 relative overflow-hidden ${
                    isFocused 
                      ? 'border-2 border-gold shadow-md shadow-gold/5 transform md:-translate-y-2' 
                      : 'border border-zinc-900 hover:border-gold/20'
                  }`}
                >
                  {isFocused && (
                    <div className="absolute top-0 right-0 bg-gold text-black text-[9px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-widest animate-pulse">
                      أحسن صفقة 🔥
                    </div>
                  )}
                  
                  <div className="space-y-3 pt-2">
                    <span className={`text-[9px] font-bold px-2 py-1 rounded uppercase tracking-widest ${
                      isFocused ? 'bg-gold/15 text-gold border border-gold/30 font-bold' : 'bg-zinc-900 text-zinc-400'
                    }`}>
                      {pkg.sub}
                    </span>
                    <h4 className={`text-sm sm:text-md font-bold font-serif ${isFocused ? 'gold-gradient font-black' : pkg.colorClass}`}>{pkg.name}</h4>
                    <div className={`font-mono text-2xl font-black ${isFocused ? 'text-gold gold-glow' : 'text-white'}`}>
                      {pkg.price} <span className="text-xs">EGP</span>
                    </div>
                    <p className="text-[10px] text-zinc-350 leading-relaxed font-sans whitespace-pre-line text-right mr-1 bg-black/40 p-4 rounded-2xl border border-zinc-900/50">
                      {pkg.description}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      const target = document.getElementById('search-section');
                      target?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`w-full py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer text-center ${
                      isFocused 
                        ? 'bg-gold text-black hover:bg-gold/90 shadow-lg shadow-gold/15' 
                        : 'bg-zinc-900 hover:bg-zinc-805 hover:bg-zinc-800 text-white border border-zinc-800'
                    }`}
                  >
                    {pkg.btnText}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* BRAND VALUES FEATURES */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center py-6">
          <div className="bg-zinc-950/40 p-6 rounded-2xl border border-zinc-900 space-y-3">
            <Crown className="w-8 h-8 text-gold mx-auto" />
            <h5 className="font-bold text-xs">تطريز ملكي فاخر</h5>
            <p className="text-[10px] text-zinc-550 text-zinc-450 text-zinc-400 leading-relaxed">تطريز عالي الدقة بخيوط براقة مقاومة للحسحسة والغسيل المتكرر.</p>
          </div>

          <div className="bg-zinc-950/40 p-6 rounded-2xl border border-zinc-900 space-y-3">
            <Gift className="w-8 h-8 text-gold mx-auto" />
            <h5 className="font-bold text-xs">تغليف فخم وهدايا</h5>
            <p className="text-[10px] text-zinc-550 text-zinc-450 text-zinc-405 text-zinc-400 leading-relaxed">كل قطعة تصلك في علبة نفاذة ببطاقات شكر معطّرة وملصقات البراند.</p>
          </div>

          <div className="bg-zinc-950/40 p-6 rounded-2xl border border-zinc-900 space-y-3">
            <Shield className="w-8 h-8 text-gold mx-auto" />
            <h5 className="font-bold text-xs">ضمان ذهبي 3 أيام</h5>
            <p className="text-[10px] text-zinc-550 text-zinc-450 text-zinc-405 text-zinc-400 leading-relaxed">إمكانية استرجاع أو استبدال مجاني في حال وجود أي عيب مصنعي.</p>
          </div>

          <div className="bg-zinc-950/40 p-6 rounded-2xl border border-zinc-900 space-y-3">
            <Users className="w-8 h-8 text-gold mx-auto" />
            <h5 className="font-bold text-xs">بوابة VIP المخصصة</h5>
            <p className="text-[10px] text-zinc-550 text-zinc-450 text-zinc-405 text-zinc-400 leading-relaxed">الملف التعريفي الملكي يعبر عن مدى تميزك بمشترياتك الحصرية.</p>
          </div>
        </section>

      </main>

      {/* FOOTER & EXCLUSIVITIES */}
      <footer className="border-t border-zinc-900 bg-zinc-950/80 py-8 relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-right">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 justify-center md:justify-start">
              <Crown className="w-5 h-5 text-gold" />
              <span className="font-serif font-black tracking-wider text-sm gold-gradient">ESM • إسمي ذهب</span>
            </div>
            <p className="text-[10px] text-zinc-500">العنوان الفني لصناعة الألبسة المذهبة الراقية بالخط العربي والتاج.</p>
          </div>

          <div className="flex flex-wrap gap-4 justify-center">
            <button 
              onClick={() => setIsPolicyOpen(true)}
              className="text-[11px] font-bold text-zinc-400 hover:text-gold transition-colors cursor-pointer"
            >
              سياسة الاسترجاع والضمان الملكي 📖
            </button>
            <button 
              onClick={() => navigateTo('/apps')}
              className="text-[11px] font-bold text-zinc-400 hover:text-gold transition-colors cursor-pointer"
            >
              بوابة VIP الملكية 👑
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 text-center text-[10px] text-zinc-600 mt-6 pt-4 border-t border-zinc-900/50">
          <p>© جميع الحقوق محفوظة لبراند الأسياد الملكي إسمي ذهب • 2026</p>
        </div>
      </footer>

      {/* RETURN POLICY MODAL POPUP */}
      <ReturnPolicy isOpen={isPolicyOpen} onClose={() => setIsPolicyOpen(false)} />
    </div>
  );
}
