import { useEffect, useState, lazy, Suspense } from 'react';
import { Route, Routes, useLocation, Link } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import MobileNav from './components/MobileNav.jsx';
import OnboardingTour from './components/Onboarding.jsx';
import { useAuth, useHasUnlimitedAccess } from './context/AuthContext.jsx';
import { initTheme } from './utils/userService.js';
import { t } from './i18n/index.js';

const ONBOARDED_KEY = 'fjalingo_onboarded';

// Eager: the common entry points (splash, login, post-login dashboard).
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';

// Lazy: everything else is code-split so the initial bundle stays small
// (CLAUDE.md §13 — split the lesson player from the marketing splash).
const SearchResults = lazy(() => import('./pages/SearchResults.jsx'));
const WordDetail = lazy(() => import('./pages/WordDetail.jsx'));
const WordOfTheDay = lazy(() => import('./pages/WordOfTheDay.jsx'));
const SuggestWord = lazy(() => import('./pages/SuggestWord.jsx'));
const AdminLogin = lazy(() => import('./pages/AdminLogin.jsx'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'));
const Quiz = lazy(() => import('./pages/Quiz.jsx'));
const Lesson = lazy(() => import('./pages/Lesson.jsx'));
const Onboarding = lazy(() => import('./pages/Onboarding.jsx'));
const Achievements = lazy(() => import('./pages/Achievements.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const PremiumHome = lazy(() => import('./pages/PremiumHome.jsx'));
const CompleteProfile = lazy(() => import('./pages/CompleteProfile.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Leaderboard = lazy(() => import('./pages/Leaderboard.jsx'));
const LeaguePage = lazy(() => import('./pages/LeaguePage.jsx'));
const FriendsPage = lazy(() => import('./pages/FriendsPage.jsx'));
const ChatPage = lazy(() => import('./pages/ChatPage.jsx'));
const PublicProfile = lazy(() => import('./pages/PublicProfile.jsx'));
const Premium = lazy(() => import('./pages/Premium.jsx'));
// DesignGallery is a dev-only reference page (frontend/CLAUDE.md). It is registered
// only in development, so /design 404s in production and its chunk is tree-shaken
// out of the production build (OPS-2).
const DesignGallery = import.meta.env.DEV
  ? lazy(() => import('./pages/DesignGallery.jsx'))
  : null;
const Origins = lazy(() => import('./pages/Origins.jsx'));
const OriginDetail = lazy(() => import('./pages/OriginDetail.jsx'));
const Terms = lazy(() => import('./pages/Terms.jsx'));
const Privacy = lazy(() => import('./pages/Privacy.jsx'));
const Refund = lazy(() => import('./pages/Refund.jsx'));
const Contact = lazy(() => import('./pages/Contact.jsx'));
const EnglishAbout = lazy(() => import('./pages/EnglishAbout.jsx'));

const RouteFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center text-ink-soft font-semibold">
    Duke ngarkuar…
  </div>
);

const AdminHomeBanner = () => (
  <div className="border-b-2 border-fjalingo-purple/20 bg-fjalingo-purple/10 px-4 py-2 text-center text-sm font-bold text-fjalingo-purple">
    {t('adminHomeBanner.text')}{' '}
    <Link to="/admin/dashboard" className="underline">{t('adminHomeBanner.cta')} →</Link>
  </div>
);

// "/" surface: anyone with unlimited access (premium OR admin) gets the richer
// PremiumHome; admins also get a banner to their panel so the premium surface is
// reachable and testable with zero paywalls (AUTH-4-FIX, intentionally overriding
// UX-4's admin→Home). Free users get the marketing Home. Reads the access hook on
// mount, so a subscription change reflects next mount.
const HomeRoute = () => {
  const { isAdmin } = useAuth();
  const hasUnlimited = useHasUnlimitedAccess();

  if (hasUnlimited) {
    return (
      <>
        {isAdmin && <AdminHomeBanner />}
        <PremiumHome />
      </>
    );
  }
  return <Home />;
};

const App = () => {
  const location = useLocation();
  const { isLoggedIn, loading: authLoading } = useAuth();
  const hasUnlimited = useHasUnlimitedAccess();
  // Anyone with unlimited access (premium or admin) on "/" sees the app-like
  // PremiumHome, which needs the header/nav — so it is NOT the chrome-less splash.
  const isPremiumHome = location.pathname === '/' && hasUnlimited;
  const isSplash = location.pathname === '/' && !isPremiumHome;
  const isDesign = import.meta.env.DEV && location.pathname === '/design';
  const isOnboarding = location.pathname === '/start';
  const isAdminRoute = location.pathname.startsWith('/admin');

  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    initTheme();
  }, []);

  // First-time tour (UX-2): show once per browser to guests only. Wait for auth
  // to resolve so a returning logged-in user never sees a flash of it. Logging
  // in/registering flips isLoggedIn, which marks the tour as seen for good.
  useEffect(() => {
    if (authLoading) return;
    if (isLoggedIn) {
      localStorage.setItem(ONBOARDED_KEY, 'true');
      setShowOnboarding(false);
      return;
    }
    if (localStorage.getItem(ONBOARDED_KEY) !== 'true') {
      setShowOnboarding(true);
    }
  }, [authLoading, isLoggedIn]);

  const dismissOnboarding = () => {
    localStorage.setItem(ONBOARDED_KEY, 'true');
    setShowOnboarding(false);
  };

  const showChrome = !isSplash && !isDesign && !isOnboarding;
  // The footer carries the legal links (LEGAL-1). It must be reachable from the
  // marketing splash too — that is the page Paddle's domain review lands on — so it
  // shows everywhere except the dev gallery and the onboarding takeover.
  const showFooter = !isDesign && !isOnboarding;

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-dark-bg">
      {showChrome && <Header />}
      <main className={`flex-1 ${showChrome ? 'pb-20 md:pb-0' : ''}`}>
        <AnimatePresence mode="wait">
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<HomeRoute />} />
              <Route path="/kerko" element={<SearchResults />} />
              <Route path="/fjala/:id" element={<WordDetail />} />
              <Route path="/fjala-e-dites" element={<WordOfTheDay />} />
              <Route path="/origjina" element={<Origins />} />
              <Route path="/origjina/:code" element={<OriginDetail />} />
              <Route path="/propozo" element={<SuggestWord />} />
              <Route path="/kuizi" element={<Quiz />} />
              <Route path="/start" element={<Onboarding />} />
              <Route path="/mesimi/:lessonId" element={<Lesson />} />
              <Route path="/perserit-gabimet" element={<Lesson />} />
              <Route path="/arritjet" element={<Achievements />} />
              <Route path="/hyr" element={<Login />} />
              <Route path="/regjistrohu" element={<Register />} />
              <Route path="/ploteso-profilin" element={<CompleteProfile />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profili" element={<Profile />} />
              <Route path="/profili/:uuid" element={<PublicProfile />} />
              <Route path="/renditja" element={<Leaderboard />} />
              <Route path="/liga" element={<LeaguePage />} />
              <Route path="/miqte" element={<FriendsPage />} />
              <Route path="/bisedat" element={<ChatPage />} />
              <Route path="/bisedat/:username" element={<ChatPage />} />
              <Route path="/premium" element={<Premium />} />
              <Route path="/kushtet" element={<Terms />} />
              <Route path="/privatesia" element={<Privacy />} />
              <Route path="/rimbursimi" element={<Refund />} />
              <Route path="/kontakt" element={<Contact />} />
              <Route path="/en" element={<EnglishAbout />} />
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              {DesignGallery && <Route path="/design" element={<DesignGallery />} />}
            </Routes>
          </Suspense>
        </AnimatePresence>
      </main>
      {showFooter && (
        // Footer shows on all viewports (LEGAL-1b — legal links must be reachable on
        // mobile). When MobileNav is present it's fixed to the bottom, so clear it with
        // the same pb-20 md:pb-0 pattern <main> uses; the splash has no MobileNav.
        <div className={showChrome ? 'pb-20 md:pb-0' : ''}>
          <Footer />
        </div>
      )}
      {showChrome && <MobileNav />}

      <AnimatePresence>
        {showOnboarding && !isAdminRoute && !isDesign && !isOnboarding && (
          <OnboardingTour onClose={dismissOnboarding} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
