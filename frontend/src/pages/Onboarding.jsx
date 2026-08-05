import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Heading from '../components/ui/Heading.jsx';
import Parrot from '../components/mascot/Parrot.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import Lesson from './Lesson.jsx';
import { t } from '../i18n/index.js';

const TOTAL_STEPS = 7;

// 8 preset animal avatars that already exist in /frontend/public/avatars.
// Display names live in sq.json under onboarding.avatars.<filename-without-ext>.
const AVATAR_CHOICES = [
  { filename: 'fox.png' },
  { filename: 'owl.png' },
  { filename: 'panda.png' },
  { filename: 'lion.png' },
  { filename: 'bear.png' },
  { filename: 'penguin.png' },
  { filename: 'cat.png' },
  { filename: 'eagle.png' },
];

const avatarName = (filename) => t(`onboarding.avatars.${filename.replace('.png', '')}`);

// Curated flag-list. Codes not in the GDPR-K table fall back to consent age 16
// on the server; that determination is reused, never re-implemented here.
// Country names live in sq.json under onboarding.countries.<code>.
const COUNTRIES = [
  { code: 'AL', flag: '🇦🇱' },
  { code: 'XK', flag: '🇽🇰' },
  { code: 'MK', flag: '🇲🇰' },
  { code: 'ME', flag: '🇲🇪' },
  { code: 'US', flag: '🇺🇸' },
  { code: 'GB', flag: '🇬🇧' },
  { code: 'DE', flag: '🇩🇪' },
  { code: 'IT', flag: '🇮🇹' },
  { code: 'CH', flag: '🇨🇭' },
  { code: 'GR', flag: '🇬🇷' },
  { code: 'FR', flag: '🇫🇷' },
  { code: 'SE', flag: '🇸🇪' },
  { code: 'BE', flag: '🇧🇪' },
  { code: 'NL', flag: '🇳🇱' },
  { code: 'AT', flag: '🇦🇹' },
  { code: 'CA', flag: '🇨🇦' },
];

const PURPOSES = [
  { key: 'self', emoji: '🙂' },
  { key: 'child', emoji: '👨‍👧' },
  { key: 'curious', emoji: '✨' },
];

const MINUTE_GOALS = [5, 10, 15];

const USERNAME_RE = /^[A-Za-z0-9_-]+$/;

// Top progress dots: ●●●○○○○
const Dots = ({ step }) => (
  <div className="flex justify-center gap-2 mb-8" aria-hidden="true">
    {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
      <span
        key={i}
        className={`h-2.5 w-2.5 rounded-full transition-colors ${
          i <= step ? 'bg-brand-green' : 'bg-line'
        }`}
      />
    ))}
  </div>
);

const Onboarding = () => {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const { register, loadUser } = useAuth();

  const [step, setStep] = useState(0);

  // Collected answers
  const [purpose, setPurpose] = useState(null);
  const [minutesGoal, setMinutesGoal] = useState(null);
  const [age, setAge] = useState('');
  const [countryCode, setCountryCode] = useState('AL');
  const [parentEmail, setParentEmail] = useState('');
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Age step sub-state for the conditional consent screen
  const [showConsent, setShowConsent] = useState(false);
  const [ageError, setAgeError] = useState('');
  const [checkingConsent, setCheckingConsent] = useState(false);

  // Account step
  const [submitting, setSubmitting] = useState(false);
  const [accountError, setAccountError] = useState('');

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));

  const motionProps = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -12 },
        transition: { duration: 0.2 },
      };

  // ── Step 5: Age + country -> consent check (reuses backend) ──
  const handleAgeContinue = async () => {
    setAgeError('');
    const numericAge = Number(age);
    if (!Number.isInteger(numericAge) || numericAge < 13 || numericAge > 120) {
      setAgeError(t('onboarding.ageInvalid'));
      return;
    }
    setCheckingConsent(true);
    try {
      const res = await api.post('/auth/consent-check', {
        age: numericAge,
        country_code: countryCode,
      });
      if (res.data.parental_consent_required) {
        setShowConsent(true);
      } else {
        setParentEmail('');
        next();
      }
    } catch (err) {
      setAgeError(err?.response?.data?.message || t('onboarding.consentCheckError'));
    } finally {
      setCheckingConsent(false);
    }
  };

  // ── Step 7: create account, set avatar, jump into Lesson 1 ──
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setAccountError('');
    setSubmitting(true);
    try {
      const data = await register({
        username,
        email,
        password,
        age: Number(age),
        countryCode,
        parentEmail: showConsent ? parentEmail : undefined,
      });

      // SAFE-3: a consent-pending guest-upgrade continues into Lesson 1 like any other
      // signup. Lessons carry no cross-user contact, so there is nothing here to gate —
      // only Miqtë/Bisedat wait for the parent, and they say so in place.

      // Persist the chosen avatar (register defaults to default.png).
      if (avatar) {
        try {
          await api.put('/profile/avatar', { filename: avatar });
        } catch {
          // Non-blocking: avatar can be changed later from the profile.
        }
      }
      await loadUser();

      // Prefetch Unit 1 Lesson 1 and route straight into the player.
      const first = await api.get('/lessons/first');
      navigate(`/mesimi/${first.data.lesson_id}`);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 409) {
        setAccountError(err.response.data.message);
      } else if (status === 403 && err.response?.data?.code === 'PARENTAL_CONSENT_REQUIRED') {
        setAccountError(t('onboarding.consentRequiredError'));
      } else {
        setAccountError(err?.response?.data?.message || t('onboarding.registerError'));
      }
      setSubmitting(false);
    }
  };

  const usernameValid = USERNAME_RE.test(username) && username.length >= 3 && username.length <= 30;

  const renderStep = () => {
    switch (step) {
      // 1. Splash
      case 0:
        return (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <Parrot state="wave" size={180} />
            </div>
            <Heading level={1}>{t('onboarding.splash.title')}</Heading>
            <p className="text-ink-soft font-semibold">
              {t('onboarding.splash.subtitle')}
            </p>
            <Button variant="primary" size="lg" fullWidth onClick={next}>
              {t('home.hero.cta')}
            </Button>
          </div>
        );

      // 2. First taste — real Spot-the-Alblish, no account
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Heading level={2}>{t('onboarding.taste.title')}</Heading>
              <p className="text-ink-soft font-semibold mt-1">
                {t('onboarding.taste.subtitle')}
              </p>
            </div>
            <Lesson taste onComplete={next} />
          </div>
        );

      // 3. Why are you here?
      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Heading level={2}>{t('onboarding.purpose.title')}</Heading>
            </div>
            <div className="space-y-3">
              {PURPOSES.map((p) => (
                <Button
                  key={p.key}
                  variant={purpose === p.key ? 'primary' : 'secondary'}
                  size="lg"
                  fullWidth
                  onClick={() => {
                    setPurpose(p.key);
                    next();
                  }}
                >
                  <span className="mr-2">{p.emoji}</span> {t(`onboarding.purpose.${p.key}`)}
                </Button>
              ))}
            </div>
          </div>
        );

      // 4. Quick goal
      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Heading level={2}>{t('onboarding.goal.title')}</Heading>
              <p className="text-ink-soft font-semibold mt-1">{t('onboarding.goal.subtitle')}</p>
            </div>
            <div className="space-y-3">
              {MINUTE_GOALS.map((m) => (
                <Button
                  key={m}
                  variant={minutesGoal === m ? 'primary' : 'secondary'}
                  size="lg"
                  fullWidth
                  onClick={() => {
                    setMinutesGoal(m);
                    next();
                  }}
                >
                  {t('onboarding.goal.minutes', { m })}
                </Button>
              ))}
            </div>
          </div>
        );

      // 5. Age + country (+ conditional consent)
      case 4:
        if (showConsent) {
          return (
            <div className="space-y-6">
              <div className="text-center">
                <Heading level={2}>{t('onboarding.consent.title')}</Heading>
                <p className="text-ink-soft font-semibold mt-2">
                  {t('onboarding.consent.desc')}
                </p>
              </div>
              <Card padding="md">
                <label className="block text-xs font-bold text-ink-soft mb-1">
                  {t('auth.register.parentEmailLabel')}
                </label>
                <input
                  type="email"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  className="input-field"
                  placeholder={t('auth.register.parentEmailPlaceholder')}
                />
                <p className="mt-1 text-xs font-semibold text-ink-soft">
                  {t('auth.register.parentEmailNote')}
                </p>
              </Card>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                disabled={!parentEmail}
                onClick={next}
              >
                {t('common.continue')}
              </Button>
            </div>
          );
        }
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Heading level={2}>{t('onboarding.ageCountry.title')}</Heading>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-soft mb-1">{t('auth.register.ageLabel')}</label>
                <input
                  type="number"
                  min={13}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full rounded-2xl border-2 border-line bg-paper px-4 h-14 text-ink font-bold focus:outline-none focus:border-brand-green"
                  placeholder="13"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-soft mb-1">{t('onboarding.ageCountry.countryLabel')}</label>
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-full rounded-2xl border-2 border-line bg-paper px-4 h-14 text-ink font-bold focus:outline-none focus:border-brand-green"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {t(`onboarding.countries.${c.code}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {ageError && <p className="text-sm font-bold text-accent-coral">{ageError}</p>}
            <Button
              variant="primary"
              size="lg"
              fullWidth
              loading={checkingConsent}
              onClick={handleAgeContinue}
            >
              {t('common.continue')}
            </Button>
          </div>
        );

      // 6. Username + avatar (no real-name field)
      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Heading level={2}>{t('onboarding.username.title')}</Heading>
            </div>
            <div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={3}
                maxLength={30}
                className="w-full rounded-2xl border-2 border-line bg-paper px-4 h-14 text-ink font-bold focus:outline-none focus:border-brand-green"
                placeholder={t('auth.register.usernamePlaceholder')}
              />
              <p className="text-xs font-semibold text-ink-soft mt-2">
                {t('onboarding.username.hint')}
              </p>
            </div>

            <div>
              <Heading level={3} className="mb-3">{t('onboarding.username.chooseAvatar')}</Heading>
              <div className="grid grid-cols-4 gap-3">
                {AVATAR_CHOICES.map((a) => {
                  const name = avatarName(a.filename);
                  return (
                    <button
                      key={a.filename}
                      type="button"
                      onClick={() => setAvatar(a.filename)}
                      aria-label={name}
                      className={`aspect-square rounded-2xl border-2 p-2 bg-paper transition-colors ${
                        avatar === a.filename ? 'border-brand-green ring-2 ring-brand-green' : 'border-line'
                      }`}
                    >
                      <img src={`/avatars/${a.filename}`} alt={name} className="w-full h-full object-contain" />
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={!usernameValid || !avatar}
              onClick={next}
            >
              {t('common.continue')}
            </Button>
          </div>
        );

      // 7. Account
      case 6:
        return (
          <form className="space-y-6" onSubmit={handleCreateAccount}>
            <div className="text-center">
              <Heading level={2}>{t('onboarding.account.title')}</Heading>
              <p className="text-ink-soft font-semibold mt-1">{t('onboarding.account.subtitle')}</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-soft mb-1">{t('common.field.email')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-2xl border-2 border-line bg-paper px-4 h-14 text-ink font-bold focus:outline-none focus:border-brand-green"
                  placeholder={t('common.field.emailPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-soft mb-1">{t('common.field.password')}</label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-2xl border-2 border-line bg-paper px-4 h-14 text-ink font-bold focus:outline-none focus:border-brand-green"
                  placeholder="••••••••"
                />
              </div>
            </div>
            {accountError && <p className="text-sm font-bold text-accent-coral">{accountError}</p>}
            <Button type="submit" variant="primary" size="lg" fullWidth loading={submitting}>
              {t('onboarding.account.title')}
            </Button>
          </form>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-cloud px-6 py-10">
      <div className="max-w-md mx-auto">
        <Dots step={step} />
        <Card padding="lg">
          <AnimatePresence mode="wait">
            <motion.div key={`${step}-${showConsent}`} {...motionProps}>
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
