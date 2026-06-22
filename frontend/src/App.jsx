import { useEffect, lazy, Suspense } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import MobileNav from './components/MobileNav.jsx';
import { initTheme } from './utils/userService.js';

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
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Leaderboard = lazy(() => import('./pages/Leaderboard.jsx'));
const LeaguePage = lazy(() => import('./pages/LeaguePage.jsx'));
const FriendsPage = lazy(() => import('./pages/FriendsPage.jsx'));
const ChatPage = lazy(() => import('./pages/ChatPage.jsx'));
const PublicProfile = lazy(() => import('./pages/PublicProfile.jsx'));
const Premium = lazy(() => import('./pages/Premium.jsx'));
const DesignGallery = lazy(() => import('./pages/DesignGallery.jsx'));

const RouteFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center text-ink-soft font-semibold">
    Duke ngarkuar…
  </div>
);

const App = () => {
  const location = useLocation();
  const isSplash = location.pathname === '/';
  const isDesign = location.pathname === '/design';
  const isOnboarding = location.pathname === '/start';

  useEffect(() => {
    initTheme();
  }, []);

  const showChrome = !isSplash && !isDesign && !isOnboarding;

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-dark-bg">
      {showChrome && <Header />}
      <main className={`flex-1 ${showChrome ? 'pb-20 md:pb-0' : ''}`}>
        <AnimatePresence mode="wait">
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/kerko" element={<SearchResults />} />
              <Route path="/fjala/:id" element={<WordDetail />} />
              <Route path="/fjala-e-dites" element={<WordOfTheDay />} />
              <Route path="/propozo" element={<SuggestWord />} />
              <Route path="/kuizi" element={<Quiz />} />
              <Route path="/start" element={<Onboarding />} />
              <Route path="/mesimi/:lessonId" element={<Lesson />} />
              <Route path="/perserit-gabimet" element={<Lesson />} />
              <Route path="/arritjet" element={<Achievements />} />
              <Route path="/hyr" element={<Login />} />
              <Route path="/regjistrohu" element={<Register />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profili" element={<Profile />} />
              <Route path="/profili/:uuid" element={<PublicProfile />} />
              <Route path="/renditja" element={<Leaderboard />} />
              <Route path="/liga" element={<LeaguePage />} />
              <Route path="/miqte" element={<FriendsPage />} />
              <Route path="/bisedat" element={<ChatPage />} />
              <Route path="/bisedat/:username" element={<ChatPage />} />
              <Route path="/premium" element={<Premium />} />
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/design" element={<DesignGallery />} />
            </Routes>
          </Suspense>
        </AnimatePresence>
      </main>
      {showChrome && (
        <div className="hidden md:block">
          <Footer />
        </div>
      )}
      {showChrome && <MobileNav />}
    </div>
  );
};

export default App;
