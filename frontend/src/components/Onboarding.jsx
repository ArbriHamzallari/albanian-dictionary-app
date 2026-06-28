import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Flame, Trophy, Medal } from 'lucide-react';
import Parrot from './mascot/Parrot.jsx';
import Button from './ui/Button.jsx';
import { t } from '../i18n/index.js';

const SPRING = { type: 'spring', stiffness: 300, damping: 24 };
const TOTAL_STEPS = 4;

// First-time tour for guests (UX-2). Introduces the Alblish wedge and the three
// exercise types, then routes to sign-up or guest mode. Shown once per browser;
// App owns the "onboarded" flag and passes onClose to dismiss permanently.
const Onboarding = ({ onClose }) => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);

  const parrotState = ['wave', 'idle', 'streak-fire', 'celebrate-big'][step];

  const next = () => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const createProfile = () => {
    onClose();
    navigate('/regjistrohu');
  };

  const variants = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -24 } };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('onboardingTour.step1.title')}
    >
      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { scale: 0.94, opacity: 0 }}
        animate={reduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
        exit={reduceMotion ? { opacity: 0 } : { scale: 0.94, opacity: 0 }}
        transition={SPRING}
        className="relative w-full max-w-md rounded-3xl border border-line bg-paper p-6 sm:p-8 shadow-xl"
      >
        {/* Skip */}
        <button
          onClick={onClose}
          aria-label={t('onboardingTour.skip')}
          className="absolute right-4 top-4 flex items-center gap-1 rounded-xl px-2 py-1 text-xs font-bold text-ink-soft hover:bg-cloud transition"
        >
          {t('onboardingTour.skip')} <X className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Mascot */}
        <div className="flex justify-center pt-2">
          <Parrot state={parrotState} size={120} />
        </div>

        {/* Progress dots */}
        <div className="mt-4 flex justify-center gap-2" aria-hidden="true">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all ${i === step ? 'w-6 bg-brand-green' : 'w-2 bg-line'}`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="mt-5 min-h-[180px]">
          <AnimatePresence mode="wait">
            <motion.div key={step} {...variants} transition={SPRING}>
              {step === 0 && (
                <div className="text-center">
                  <h2 className="text-xl font-black text-ink">{t('onboardingTour.step1.title')}</h2>
                  <p className="mt-2 text-sm font-semibold text-ink-soft">{t('onboardingTour.step1.body')}</p>
                  <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-line bg-cloud px-4 py-3 text-sm font-bold">
                    <span className="text-accent-coral line-through">{t('onboardingTour.step1.exampleBorrowed')}</span>
                    <span className="text-ink-soft">{t('onboardingTour.step1.exampleArrow')}</span>
                    <span className="text-brand-green">{t('onboardingTour.step1.exampleCorrect')}</span>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div>
                  <h2 className="text-center text-xl font-black text-ink">{t('onboardingTour.step2.title')}</h2>
                  <p className="mt-2 text-center text-sm font-semibold text-ink-soft">{t('onboardingTour.step2.body')}</p>
                  <ul className="mt-4 space-y-2">
                    {['ex1', 'ex2', 'ex3'].map((k, i) => (
                      <li key={k} className="flex items-start gap-3 rounded-2xl border border-line bg-cloud px-4 py-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-green text-xs font-black text-paper">{i + 1}</span>
                        <span className="text-sm font-semibold text-ink">{t(`onboardingTour.step2.${k}`)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h2 className="text-center text-xl font-black text-ink">{t('onboardingTour.step3.title')}</h2>
                  <p className="mt-2 text-center text-sm font-semibold text-ink-soft">{t('onboardingTour.step3.body')}</p>
                  <div className="mt-4 space-y-2">
                    <Row icon={Flame} color="text-accent-coral" label={t('onboardingTour.step3.streak')} />
                    <Row icon={Trophy} color="text-accent-yellow" label={t('onboardingTour.step3.leagues')} />
                    <Row icon={Medal} color="text-accent-purple" label={t('onboardingTour.step3.achievements')} />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="text-center">
                  <h2 className="text-xl font-black text-ink">{t('onboardingTour.step4.title')}</h2>
                  <p className="mt-2 text-sm font-semibold text-ink-soft">{t('onboardingTour.step4.body')}</p>
                  <div className="mt-6 flex flex-col gap-3">
                    <Button variant="primary" size="md" fullWidth onClick={createProfile}>
                      {t('onboardingTour.step4.createProfile')}
                    </Button>
                    <Button variant="secondary" size="md" fullWidth onClick={onClose}>
                      {t('onboardingTour.step4.tryGuest')}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Nav (hidden on the final CTA step) */}
        {step < TOTAL_STEPS - 1 && (
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={back}
              disabled={step === 0}
              className="text-sm font-bold text-ink-soft disabled:opacity-0"
            >
              {t('onboardingTour.back')}
            </button>
            <span className="text-xs font-semibold text-ink-soft">
              {t('onboardingTour.stepOf', { current: step + 1, total: TOTAL_STEPS })}
            </span>
            <Button variant="primary" size="md" onClick={next}>
              {t('onboardingTour.next')}
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

const Row = ({ icon: Icon, color, label }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-line bg-cloud px-4 py-3">
    <Icon className={`h-5 w-5 shrink-0 ${color}`} aria-hidden="true" />
    <span className="text-sm font-bold text-ink">{label}</span>
  </div>
);

export default Onboarding;
