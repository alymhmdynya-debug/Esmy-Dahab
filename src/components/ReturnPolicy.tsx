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
        <div id="policy-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          {/* Backdrop click */}
          <div className="absolute inset-0 cursor-pointer" onClick={onClose}></div>
          
          <motion.div
            id="policy-modal-content"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-zinc-950 border border-amber-500/30 rounded-2xl p-6 sm:p-8 text-right text-white shadow-2xl shadow-amber-500/5 z-10 my-8"
            dir="rtl"
          >
            {/* Close button */}
            <button
              id="close-policy-btn"
              onClick={onClose}
              className="absolute left-4 top-4 p-2 text-zinc-400 hover:text-amber-500 transition-colors rounded-full hover:bg-zinc-900 border border-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Gold Accent Crown Ribbon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/25">
                <ShieldAlert className="w-8 h-8 text-black" />
              </div>
            </div>

            {/* Title */}
            <h2 id="policy-title" className="text-2xl sm:text-3xl font-bold font-sans text-center text-amber-400 mb-2">
              سياسة الاسترجاع والاستبدال الصارمة
            </h2>
            <p className="text-zinc-500 text-sm text-center font-mono mb-8">
              ESMY DAHAB • كل قطعة قصة باسمك
            </p>

            {/* Warning Note */}
            <div className="bg-zinc-900/80 border-r-4 border-amber-500 p-4 rounded-l-xl mb-8 leading-relaxed">
              <p className="text-zinc-200 text-sm sm:text-base font-medium">
                عزيزنا المتميز الفخور، نظراً لأن كل تيشيرت نقوم بصناعته من براند <strong className="text-amber-400">"إسمي ذهب"</strong> يتم تفصيله وطباعته باسمك وخصيصاً لأجلك، يرجى قراءة السياسة القانونية التالية قبل تأكيد طلبك:
              </p>
            </div>

            {/* Core Legal Clauses */}
            <div className="space-y-6 text-zinc-300 text-sm sm:text-base mb-8">
              <div className="flex items-start gap-3">
                <div className="mt-1 p-1 bg-amber-500/10 rounded-lg border border-amber-500/20 text-amber-500">
                  <Shirt className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <h3 className="text-white font-bold mb-1">الطباعة المخصصة بالاسم الشخصي</h3>
                  <p className="leading-relaxed text-zinc-400 text-xs sm:text-sm">
                    التيشيرت يُطبع باسمك الفريد (الذي تكتبه بالعربي أو بالإنجليزية بالإجبار أو الاختيار). بمجرد البدء في طباعة الاسم على القماش المذهّب الفخم، تصبح هذه القطعة خاصة بك وحدك تماماً، ولا يمكن إعادة بيعها لأي عميل آخر تحت أي ظرف. وبناءً عليه لا يوجد أي مجال لإرجاع المنتج أو استرداد قيمته بمجرد إتمام معاملة الشراء.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 p-1 bg-amber-500/10 rounded-lg border border-amber-500/20 text-amber-500">
                  <Ruler className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <h3 className="text-white font-bold mb-1">مقاس واحد أوفرسايز فخم (One Size Oversized)</h3>
                  <p className="leading-relaxed text-zinc-400 text-xs sm:text-sm">
                    كافة منتجاتنا مصممة بقصّة موحدة فخمة وعصرية مريحة جداً <strong className="text-amber-400">(وان سايز أوفرسايز)</strong> تناسب جميع الأحجام والأشكال (من مقاس وبنية Medium وحتى XXL بشكل فخم وواسع). لذا، <strong className="text-amber-500">لا نعتمد الاسترجاع أو الاستبدال نهائياً بسبب المقاس</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 p-1 bg-amber-500/10 rounded-lg border border-amber-500/20 text-amber-500">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <h3 className="text-white font-bold mb-1">جودة الخامات المضمونة والفحص المزدوج</h3>
                  <p className="leading-relaxed text-zinc-400 text-xs sm:text-sm">
                    نحن فخورون بأن خاماتنا دائماً من أفخم أنواع القطن المصري الداعم للهيكل والطباعة وحفر DTF الفخم المقاوم للغسيل. يتم تمرير كل قطعة تيشيرت عبر محطتي فحص صارمة للجودة قبل إرسالها لشركة الشحن لضمان خروجها بحالة مثالية خالية تماماً من العيوب المصنعية.
                  </p>
                </div>
              </div>
            </div>

            {/* Sizing Details Grid */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-8">
              <h4 className="text-amber-400 font-bold mb-3 text-center text-sm flex items-center justify-center gap-2">
                <Ruler className="w-4 h-4 text-amber-400" />
                تفاصيل أبعاد المقاس الموحد (Oversized Fit)
              </h4>
              <div className="grid grid-cols-3 gap-2 text-center text-xs sm:text-sm">
                <div className="p-2 bg-zinc-950 rounded border border-zinc-800">
                  <span className="block text-zinc-500 mb-1">العرض (Chest)</span>
                  <span className="font-mono text-amber-400 font-bold">64 سم</span>
                </div>
                <div className="p-2 bg-zinc-950 rounded border border-zinc-800">
                  <span className="block text-zinc-500 mb-1">الطول (Length)</span>
                  <span className="font-mono text-amber-400 font-bold">78 سم</span>
                </div>
                <div className="p-2 bg-zinc-950 rounded border border-zinc-800">
                  <span className="block text-zinc-500 mb-1">طول الكم من الكتف</span>
                  <span className="font-mono text-amber-400 font-bold">42 سم</span>
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 text-center mt-2">
                * قد تختلف القياسات بمقدار طفيف يتراوح بين 1-2 سم حسب القماش وقص التقطيع اليدوي للتفاصيل المميزة.
              </p>
            </div>

            {/* Confirm CTA */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-zinc-800 pt-6">
              <p className="text-zinc-500 text-xs text-center sm:text-right">
                باستمرارك في الشراء، أنت تؤكد موافقتك التامة على هذه الشروط الاستثنائية للبراند.
              </p>
              <button
                id="policy-accept-btn"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-black font-bold rounded-lg transition-transform active:scale-95 text-center font-sans"
              >
                أفهم وأوافق تماماً
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
