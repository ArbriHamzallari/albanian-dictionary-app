import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';
import Heading from '../components/ui/Heading.jsx';
import Parrot from '../components/mascot/Parrot.jsx';
import Lesson from './Lesson.jsx';

const TOTAL_STEPS = 7;

// 8 preset animal avatars that already exist in /frontend/public/avatars.
const AVATAR_CHOICES = [
  { filename: 'fox.png', name: 'Dhelpra' },
  { filename: 'owl.png', name: 'Bufi' },
  { filename: 'panda.png', name: 'Panda' },
  { filename: 'lion.png', name: 'Luani' },
  { filename: 'bear.png', name: 'Ariu' },
  { filename: 'penguin.png', name: 'Pinguini' },
  { filename: 'cat.png', name: 'Macja' },
  { filename: 'eagle.png', name: 'Shqiponja' },
];

// Curated flag-list. Codes not in the GDPR-K table fall back to consent age 16
// on the server; that determination is reused, never re-implemented here.
const COUNTRIES = [
  { code: 'AL', flag: '🇦🇱', name: 'Shqipëri' },
  { code: 'XK', flag: '🇽🇰', name: 'Kosovë' },
  { code: 'MK', flag: '🇲🇰', name: 'Maqedonia e Veriut' },
  { code: 'ME', flag: '🇲🇪', name: 'Mali i Zi' },
  { code: 'US', flag: '🇺🇸', name: 'SHBA' },
  { code: 'GB', flag: '🇬🇧', name: 'Mbretëria e Bashkuar' },
  { code: 'DE', flag: '🇩🇪', name: 'Gjermani' },
  { code: 'IT', flag: '🇮🇹', name: 'Itali' },
  { code: 'CH', flag: '🇨🇭', name: 'Zvicër' },
  { code: 'GR', flag: '🇬🇷', name: 'Greqi' },
  { code: 'FR', flag: '🇫🇷', name: 'Francë' },
  { code: 'SE', flag: '🇸🇪', name: 'Suedi' },
  { code: 'BE', flag: '🇧🇪', name: 'Belgjikë' },
  { code: 'NL', flag: '🇳🇱', name: 'Holandë' },
  { code: 'AT', flag: '🇦🇹', name: 'Austri' },
  { code: 'CA', flag: '🇨🇦', name: 'Kanada' },
];

const PURPOSES = [
  { key: 'self', label: 'Për veten', emoji: '🙂' },
  { key: 'child', label: 'Për fëmijën tim', emoji: '👨‍👧' },
  { key: 'curious', label: 'Thjesht kureshtar', emoji: '✨' },
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
  const [parentalConsentGiven, setParentalConsentGiven] = useState(false);
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
    if (!Number.isInteger(numericAge) || numericAge < 1 || numericAge > 120) {
      setAgeError('Shkruaj një moshë të vlefshme.');
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
        setParentalConsentGiven(false);
        next();
      }
    } catch (err) {
      setAgeError(err?.response?.data?.message || 'Diçka shkoi keq. Provo përsëri.');
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
      await register({
        username,
        email,
        password,
        age: Number(age),
        countryCode,
        parentalConsentGiven,
      });

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
        setAccountError('Kërkohet pëlqimi i prindit për këtë moshë.');
      } else {
        setAccountError(err?.response?.data?.message || 'Regjistrimi dështoi. Provo përsëri.');
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
            <Heading level={1}>Fol shqipen e vërtetë, jo Alblish.</Heading>
            <p className="text-ink-soft font-semibold">
              Mëso fjalët tona në vend të atyre të huazuara — pak minuta në ditë.
            </p>
            <Button variant="primary" size="lg" fullWidth onClick={next}>
              Fillo
            </Button>
          </div>
        );

      // 2. First taste — real Spot-the-Alblish, no account
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Heading level={2}>Provo një shembull</Heading>
              <p className="text-ink-soft font-semibold mt-1">
                Trokit mbi fjalën e huazuar. S'të duhet llogari.
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
              <Heading level={2}>Pse je këtu?</Heading>
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
                  <span className="mr-2">{p.emoji}</span> {p.label}
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
              <Heading level={2}>Sa minuta në ditë?</Heading>
              <p className="text-ink-soft font-semibold mt-1">Vendos qëllimin tënd ditor.</p>
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
                  {m} minuta
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
                <Heading level={2}>Kërkohet pëlqimi i prindit</Heading>
                <p className="text-ink-soft font-semibold mt-2">
                  Për shkak të moshës, një prind ose kujdestar duhet të japë pëlqimin për
                  të krijuar këtë llogari. Profili yt do të jetë privat si parazgjedhje.
                </p>
              </div>
              <Card padding="md">
                <label className="flex items-start gap-3 text-sm font-semibold text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={parentalConsentGiven}
                    onChange={(e) => setParentalConsentGiven(e.target.checked)}
                    className="mt-1"
                  />
                  Konfirmoj se kam pëlqimin e prindit/kujdestarit.
                </label>
              </Card>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                disabled={!parentalConsentGiven}
                onClick={next}
              >
                Vazhdo
              </Button>
            </div>
          );
        }
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Heading level={2}>Mosha dhe vendi</Heading>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-soft mb-1">Mosha</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full rounded-2xl border-2 border-line bg-paper px-4 h-14 text-ink font-bold focus:outline-none focus:border-brand-green"
                  placeholder="13"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-soft mb-1">Vendi</label>
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-full rounded-2xl border-2 border-line bg-paper px-4 h-14 text-ink font-bold focus:outline-none focus:border-brand-green"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name}
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
              Vazhdo
            </Button>
          </div>
        );

      // 6. Username + avatar (no real-name field)
      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Heading level={2}>Zgjidh emrin tënd</Heading>
            </div>
            <div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={3}
                maxLength={30}
                className="w-full rounded-2xl border-2 border-line bg-paper px-4 h-14 text-ink font-bold focus:outline-none focus:border-brand-green"
                placeholder="emri_yt"
              />
              <p className="text-xs font-semibold text-ink-soft mt-2">
                Emër publik (jo emri yt i vërtetë). Vetëm shkronja, numra, _ ose -.
              </p>
            </div>

            <div>
              <Heading level={3} className="mb-3">Zgjidh avatarin</Heading>
              <div className="grid grid-cols-4 gap-3">
                {AVATAR_CHOICES.map((a) => (
                  <button
                    key={a.filename}
                    type="button"
                    onClick={() => setAvatar(a.filename)}
                    aria-label={a.name}
                    className={`aspect-square rounded-2xl border-2 p-2 bg-paper transition-colors ${
                      avatar === a.filename ? 'border-brand-green ring-2 ring-brand-green' : 'border-line'
                    }`}
                  >
                    <img src={`/avatars/${a.filename}`} alt={a.name} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={!usernameValid || !avatar}
              onClick={next}
            >
              Vazhdo
            </Button>
          </div>
        );

      // 7. Account
      case 6:
        return (
          <form className="space-y-6" onSubmit={handleCreateAccount}>
            <div className="text-center">
              <Heading level={2}>Krijo llogarinë</Heading>
              <p className="text-ink-soft font-semibold mt-1">Ruaje progresin tënd.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-soft mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-2xl border-2 border-line bg-paper px-4 h-14 text-ink font-bold focus:outline-none focus:border-brand-green"
                  placeholder="email@shembull.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink-soft mb-1">Fjalëkalimi</label>
                <input
                  type="password"
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
              Krijo llogarinë
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
