import React from 'react';
import {
  Compass,
  Briefcase,
  CheckCircle2,
  CalendarCheck,
  Building2,
  Image as ImageIcon,
  ShieldCheck,
  Mail,
  Phone,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { DRAFT_HOW_IT_WORKS, DRAFT_HOW_IT_WORKS_PROVIDER_STEPS, HowItWorksContent, HowItWorksStepContent } from '../../types/pageContent';
import { sanitizeHtml } from '../../lib/sanitizeHtml';

type MockupVariant = 'register' | 'draft' | 'review' | 'published' | 'inquiry';

// Kanban fd1a3d2c: konnyu, kod-rajzolt "illusztracios mockup" minden lepeshez
// (nem raszter-kep) -- a reference kep washi-tape/postcard mockupjainak
// velemgyere-brandelt (sotetzold/fekete) megfeleloje, valodi UI-elemek
// (programkartya, urlap, erdeklodes-buborek) stilusaban.
const SkeletonBar: React.FC<{ width: string; className?: string }> = ({ width, className = '' }) => (
  <div className={`h-2.5 rounded-full bg-stone-200 ${width} ${className}`} />
);

const StepMockup: React.FC<{ variant: MockupVariant }> = ({ variant }) => {
  if (variant === 'register') {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 space-y-3 max-w-sm mx-auto md:mx-0">
        <div className="flex items-center gap-2 text-stone-700">
          <Building2 className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Szolgáltatói regisztráció</span>
        </div>
        <div className="space-y-2">
          <SkeletonBar width="w-3/4" />
          <SkeletonBar width="w-full" />
          <SkeletonBar width="w-2/3" />
        </div>
        <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs font-bold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>E-mail megerősítve -- fiók aktív</span>
        </div>
      </div>
    );
  }

  if (variant === 'inquiry') {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 space-y-3 max-w-sm mx-auto md:mx-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-stone-700">
            <Mail className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Új érdeklődés</span>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
            MOST
          </span>
        </div>
        <SkeletonBar width="w-1/2" className="bg-stone-300" />
        <div className="flex items-center gap-1.5 text-stone-500">
          <Phone className="w-3 h-3" />
          <SkeletonBar width="w-1/3" />
        </div>
        <div className="space-y-1.5 pt-1 border-t border-stone-100">
          <SkeletonBar width="w-full" />
          <SkeletonBar width="w-5/6" />
        </div>
      </div>
    );
  }

  // 'draft' | 'review' | 'published' -- mind ugyanaz a programkartya-vazlat,
  // csak a status-badge es a borito szine valt.
  const badge = {
    draft: { text: 'VÁZLAT', cls: 'bg-amber-100 text-amber-900 border-amber-300' },
    review: { text: 'ELLENŐRZÉS ALATT', cls: 'bg-stone-200 text-stone-700 border-stone-300' },
    published: { text: 'ÉLŐ A KATALÓGUSBAN', cls: 'bg-emerald-600 text-white border-emerald-600' },
  }[variant as 'draft' | 'review' | 'published'];

  const coverCls = variant === 'published'
    ? 'bg-gradient-to-br from-emerald-200 to-emerald-50'
    : 'bg-gradient-to-br from-stone-200 to-stone-100';

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden max-w-sm mx-auto md:mx-0">
      <div className={`relative h-28 ${coverCls} flex items-center justify-center`}>
        <ImageIcon className="w-8 h-8 text-white/70" />
        <span className={`absolute top-2.5 right-2.5 text-[10px] font-bold uppercase tracking-wider border px-2 py-1 rounded-lg ${badge.cls}`}>
          {badge.text}
        </span>
      </div>
      <div className="p-4 space-y-2">
        <SkeletonBar width="w-4/5" className="bg-stone-300" />
        <SkeletonBar width="w-1/2" />
        {variant === 'review' && (
          <div className="flex items-center gap-1.5 text-stone-500 text-[11px] font-semibold pt-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin átnézi, mielőtt kikerül</span>
          </div>
        )}
        {variant === 'published' && (
          <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-semibold pt-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Kereshető és böngészhető mindenkinek</span>
          </div>
        )}
      </div>
    </div>
  );
};

const STEP_MOCKUPS: MockupVariant[] = ['register', 'draft', 'review', 'published', 'inquiry'];
const STEP_MARKERS: Array<{ icon?: React.ComponentType<{ className?: string }> }> = [
  {}, {}, { icon: ShieldCheck }, { icon: CalendarCheck }, {},
];

const ProviderStepsTimeline: React.FC<{ steps: HowItWorksStepContent[] }> = ({ steps }) => (
  <div className="space-y-0">
    {steps.map((step, idx) => {
      const isLast = idx === steps.length - 1;
      const mockupVariant = STEP_MOCKUPS[idx] ?? 'draft';
      const Marker = STEP_MARKERS[idx]?.icon;
      const textFirst = idx % 2 === 0;

      return (
        <div key={idx} className="relative flex gap-4 sm:gap-6 md:gap-8">
          <div className="flex flex-col items-center shrink-0">
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-extrabold font-display flex items-center justify-center text-base shadow-sm shadow-emerald-600/20 z-10">
              {Marker ? <Marker className="w-5 h-5" /> : idx + 1}
            </div>
            {!isLast && <div className="flex-1 w-0.5 border-l-2 border-dashed border-emerald-300 my-1.5 min-h-[2.5rem]" />}
          </div>

          <div className="flex-1 pb-10 md:pb-14">
            <div className="md:grid md:grid-cols-5 md:gap-10 md:items-start">
              <div className={`md:col-span-3 ${textFirst ? 'md:order-1' : 'md:order-2'}`}>
                <h3 className="font-display font-bold text-lg sm:text-xl text-stone-900 mb-2">{step.title}</h3>
                <div
                  className="text-sm sm:text-base text-stone-600 leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(step.body) }}
                />

                {(step.leftText || step.rightText) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    {step.leftText && (
                      <div className="bg-emerald-50/60 border-l-4 border-emerald-600 rounded-r-xl px-4 py-3">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
                          <Briefcase className="w-3 h-3" />
                          <span>{step.leftLabel || 'Szolgáltatóként'}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">{step.leftText}</p>
                      </div>
                    )}
                    {step.rightText && (
                      <div className="bg-stone-100 border-l-4 border-stone-700 rounded-r-xl px-4 py-3">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                          <Compass className="w-3 h-3" />
                          <span>{step.rightLabel || 'A programvadásznak'}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">{step.rightText}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className={`md:col-span-2 mt-5 md:mt-0 ${textFirst ? 'md:order-2' : 'md:order-1'}`}>
                <StepMockup variant={mockupVariant} />
              </div>
            </div>
          </div>
        </div>
      );
    })}
  </div>
);

// Kanban 71915a0a (4a. pont): a kozosajandek.hu "Nektek"/"A vendegeknek"
// ketfele-nezopont mintajara -- itt "programvadasz" (utazo) vs "szolgaltato".
// Kanban fd1a3d2c: a szolgaltato-oldal a rovid teaser (felso ket-oszlopos
// karyta) alatt egy reszletes, lepesenkenti idovonalat is kap.
export const HowItWorksPage: React.FC = () => {
  const { pages } = useApp();
  const page = pages['how-it-works'];
  const content = (page?.content || {}) as HowItWorksContent;
  const title = page?.title?.trim() || 'Hogyan működik?';

  useDocumentMeta(title, 'Hogyan működik a Velem Gyere, programvadászként és szolgáltatóként is.');

  const visitorText = content.visitorText?.trim() || DRAFT_HOW_IT_WORKS.visitorText!;
  const providerText = content.providerText?.trim() || DRAFT_HOW_IT_WORKS.providerText!;
  const providerSteps = content.providerSteps && content.providerSteps.length > 0
    ? content.providerSteps
    : DRAFT_HOW_IT_WORKS_PROVIDER_STEPS;
  const isProviderStepsDraft = !content.providerSteps || content.providerSteps.length === 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <h1 className="text-2xl sm:text-4xl font-extrabold font-display text-stone-900 tracking-tight mb-10 text-center">
        {title}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 space-y-4">
          {content.visitorImageUrl && (
            <img src={content.visitorImageUrl} alt={content.visitorTitle || 'Programvadászoknak'} className="w-full h-48 object-cover rounded-xl" />
          )}
          <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
            <Compass className="w-3.5 h-3.5" />
            <span>PROGRAMVADÁSZOKNAK</span>
          </div>
          <h2 className="font-display font-bold text-xl text-stone-900">
            {content.visitorTitle?.trim() || 'Neked, aki élményt keresel'}
          </h2>
          <div
            className="text-sm sm:text-base text-stone-700 leading-relaxed whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(visitorText) }}
          />
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 space-y-4">
          {content.providerImageUrl && (
            <img src={content.providerImageUrl} alt={content.providerTitle || 'Szolgáltatóknak'} className="w-full h-48 object-cover rounded-xl" />
          )}
          <div className="inline-flex items-center gap-2 text-xs font-bold text-stone-700 bg-stone-100 border border-stone-200 px-3 py-1 rounded-lg">
            <Briefcase className="w-3.5 h-3.5" />
            <span>SZOLGÁLTATÓKÉNT</span>
          </div>
          <h2 className="font-display font-bold text-xl text-stone-900">
            {content.providerTitle?.trim() || 'Neked, aki programot hirdetnél'}
          </h2>
          <div
            className="text-sm sm:text-base text-stone-700 leading-relaxed whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(providerText) }}
          />
        </div>
      </div>

      <div className="mt-16 sm:mt-20">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <h2 className="text-xl sm:text-3xl font-extrabold font-display text-stone-900 mb-3">
            Szolgáltatóként -- lépésről lépésre
          </h2>
          <p className="text-sm sm:text-base text-stone-500">
            Pontosan mi a feladatod minden lépésnél -- és mi történik emiatt a programvadászok oldalán.
          </p>
          {isProviderStepsDraft && (
            <div className="mt-4 inline-block text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
              Ez a tartalom még nincs véglegesítve -- admin tölti majd ki.
            </div>
          )}
        </div>

        <ProviderStepsTimeline steps={providerSteps} />
      </div>
    </div>
  );
};
