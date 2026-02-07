import { Route, Routes } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import SearchResults from './pages/SearchResults.jsx';
import WordDetail from './pages/WordDetail.jsx';
import WordOfTheDay from './pages/WordOfTheDay.jsx';
import SuggestWord from './pages/SuggestWord.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

const App = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/kerko" element={<SearchResults />} />
          <Route path="/fjala/:id" element={<WordDetail />} />
          <Route path="/fjala-e-dites" element={<WordOfTheDay />} />
          <Route path="/propozo" element={<SuggestWord />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

export default App;
