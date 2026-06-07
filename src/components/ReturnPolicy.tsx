import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldAlert, CheckCircle2, Ruler, Shirt } from 'lucide-react';

interface ReturnPolicyProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReturnPolicy({ isOpen, onClose }: ReturnPolicyProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div id="policy-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          {/* Backdrop click */}
          <div className="absolute inset-0 cursor-pointer" onClick={onClose}></div>
          
          <motion.div
            id="policy-modal-content"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white border border-amber-600/30 rounded-2xl p-6 sm:p-8 text-right text-stone-800 shadow-2xl z-10 my-8"
            dir="rtl"
          >
            {/* Close button */}
            <button
              id="close-policy-btn"
              onClick={onClose}
              className="absolute left-4 top-4 p-2 text-stone-550 hover:text-amber-600 transition-colors rounded-full hover:bg-stone-100 border border-stone-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Gold Accent Crown Ribbon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-700 rounded-full flex items-center justify-center shadow-lg shadow-amber-600/25">
                <ShieldAlert className="w-8 h-8 text-white" />
              </div>
            </div>

            {/* Title */}
            <h2 id="policy-title" className="text-2xl sm:text-3xl font-bold font-sans text-center text-amber-750 mb-2">
              سياسة الاسترجاع والاستبدال الملكية
            </h2>
            <p className="text-stone-500 text-sm text-center font-mono mb-8">
              ESMY DAHAB • كل قطعة قصة باسمك
            </p>

            {/* Warning Note */}
            <div className="bg-stone-50 border-r-4 border-amber-500 p-4 rounded-l-xl mb-8 leading-relaxed">
              <p className="text-stone-700 text-sm sm:text-base font-medium">
                عزيزنا المتميز الفخور، نظراً لأن كل قطعة نقوم بصناعتها وتطريزها من براند <strong className="text-amber-600">"إسمي ذهب"</strong> يتم تجهيزها باسمك وخصيصاً وبناءً على اختيارك الشخصي، يرجى قراءة السياسة القانونية العامة التالية للطلب:
              </p>
            </div>

            {/* Core Legal Clauses */}
            <div className="space-y-6 text-stone-650 text-sm sm:text-base mb-8">
              <div className="flex items-start gap-3">
                <div className="mt-1 p-1 bg-amber-500/10 rounded-lg border border-amber-500/20 text-amber-600">
                  <Shirt className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <h3 className="text-stone-900 font-bold mb-1">الطباعة والتطريز المخصوص بالاسم</h3>
                  <p className="leading-relaxed text-stone-605 text-xs sm:text-sm">
                    القطع المخصوصة تُطبع أو تُطرز باسمك الفريد (الذي تكتبه في الطلب). بمجرد البدء في حفر النمط وتطريز الاسم المذهب الفخم، تصبح هذه القطعة خاصة بهويتك وحدك تماماً، ولا يمكن إعادة بيعها أو استخدامها لأي عميل آخر تحت أي ظرف. وبناءً عليه لا يوجد أي مجال لإعادة القطعة المذّهبة المخصصة أو استرداد قيمتها بعد البدء بالعمل أو إتمام معاملة الشراء.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 p-1 bg-amber-500/10 rounded-lg border border-amber-500/20 text-amber-600">
                  <Ruler className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <h3 className="text-stone-900 font-bold mb-1">مسؤولية اختيار مقاس ملائم للهيئة</h3>
                  <p className="leading-relaxed text-stone-605 text-xs sm:text-sm bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                    <strong className="text-amber-700">تنويه هام جداً:</strong> نحن كبراند غير مسؤولين نهائياً إذا قام العميل باختيار مقاس غير مناسب له ومقاساته الشخصية. نأمل منك بشدة مراجعة المقاس الصحيح والمناسب بهيبتك واختياره بشكل دقيق وسليم تماماً من الخيارات المتاحة عند تقديم الطلب؛ وبناءً عليه لا نقبل المرتجعات أو الاستبدال بسبب سوء اختيار المقاس الذي حدده العميل بنفسه من البداية.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 p-1 bg-amber-500/10 rounded-lg border border-amber-500/20 text-amber-600">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <h3 className="text-stone-900 font-bold mb-1">جودة الخامات وفحص التفاصيل</h3>
                  <p className="leading-relaxed text-stone-605 text-xs sm:text-sm">
                    نحن فخورون بأن تفاصيلنا وأقمشتنا دائماً ذات جودة حلوة وممتازة للغاية وتصميمات عصرية جذابة وتطريز مذهب ممتاز ومقاوم للغسيل. يتم تمرير كل قطعة تيشيرت وطلب عبر فحص دقيق للجودة والنقش والتاج المذهب قبل تسليمها لخدمة الشحن لضمان خروج الكتالوج من مشغلنا بأعلى جودة تليق بك.
                  </p>
                </div>
              </div>
            </div>

            {/* Note text instead of CTA confirm */}
            <div className="border-t border-stone-200 pt-6 text-center text-xs text-stone-400">
              شروط وقواعد الشراء والطلب المتبادل لبراند إسمي ذهب • كافة الحقوق الملكية محفوظة ومحمية 2026
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
