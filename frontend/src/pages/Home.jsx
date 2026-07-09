import { useEffect, useState } from 'react';
import Seo from '../components/Seo.jsx';
import LandingHero from '../components/landing/LandingHero.jsx';
import ProofStrip from '../components/landing/ProofStrip.jsx';
import OriginPath from '../components/landing/OriginPath.jsx';
import FeatureCards from '../components/landing/FeatureCards.jsx';
import GameShowcase from '../components/landing/GameShowcase.jsx';
import DemoQuestion from '../components/landing/DemoQuestion.jsx';
import TrustCards from '../components/landing/TrustCards.jsx';
import PricingBanner from '../components/landing/PricingBanner.jsx';
import api from '../utils/api.js';

// Guest homepage (M4 UI-1). UI-0 routes logged-in users to their own home, so this page
// is purely for guests and crawlers: explain the mission in 5 seconds and show the path.
// It renders meaningfully without JS — sections that need fetched numbers show skeletons
// (never a layout jump). The interactive demo section fetches its own question.
const Home = () => {
  const [words, setWords] = useState(null); // live word count for the proof strip
  const [origins, setOrigins] = useState([]);
  const [originsLoading, setOriginsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const [statsRes, originsRes] = await Promise.allSettled([
        api.get('/public/stats'),
        api.get('/public/origins'),
      ]);
      if (!active) return;
      if (statsRes.status === 'fulfilled') {
        setWords(statsRes.value.data.words);
      }
      if (originsRes.status === 'fulfilled') {
        setOrigins(originsRes.value.data.origins || []);
      }
      setOriginsLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg">
      <Seo
        title="Fjalingo — Fol shqipen e vërtetë, jo fjalë të huazuara"
        description="Fjalingo të ndihmon t'i kthesh fjalët e huazuara (email, meeting, business) në shqipen e vërtetë — me lojë, jo me mësim."
        path="/"
      />
      <LandingHero />
      <ProofStrip words={words} />
      <OriginPath origins={origins} loading={originsLoading} />
      <FeatureCards />
      <GameShowcase />
      <DemoQuestion />
      <TrustCards />
      <PricingBanner />
    </div>
  );
};

export default Home;
