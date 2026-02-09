import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import MobileNav from './components/MobileNav.jsx';
import Home from './pages/Home.jsx';
import SearchResults from './pages/SearchResults.jsx';
import WordDetail from './pages/WordDetail.jsx';
import WordOfTheDay from './pages/WordOfTheDay.jsx';
import SuggestWord from './pages/SuggestWord.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import Quiz from './pages/Quiz.jsx';
import Achievements from './pages/Achievements.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import PublicProfile from './pages/PublicProfile.jsx';
import { initTheme } from './utils/userService.js';

const App = () => {
  useEffect(() => {
    initTheme();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-dark-bg">
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/kerko" element={<SearchResults />} />
            <Route path="/fjala/:id" element={<WordDetail />} />
            <Route path="/fjala-e-dites" element={<WordOfTheDay />} />
            <Route path="/propozo" element={<SuggestWord />} />
            <Route path="/kuizi" element={<Quiz />} />
            <Route path="/arritjet" element={<Achievements />} />
            <Route path="/hyr" element={<Login />} />
            <Route path="/regjistrohu" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profili" element={<Profile />} />
            <Route path="/profili/:uuid" element={<PublicProfile />} />
            <Route path="/renditja" element={<Leaderboard />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Routes>
        </AnimatePresence>
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>
      <MobileNav />
    </div>
  );
};

export default App;
