import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import DailyChallengeCard from '../components/DailyChallengeCard.jsx';
import Seo from '../components/Seo.jsx';
import { t } from '../i18n/index.js';

// Thin wrapper page so the Home "Sfida e Ditës" card has a real destination (BUG-6).
// Reuses DailyChallengeCard — which carries its own "🎯 Sfida e Ditës" heading and
// all the challenge logic — so there is nothing to duplicate here.
const DailyChallenge = () => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <Seo
        title="Sfida e Ditës — Fjalingo"
        description="Provo sfidën e ditës: zëvendëso fjalën e huazuar me shqipen e saktë dhe ruaj serinë tënde."
        path="/sfida-e-dites"
      />
      <Link to="/" className="inline-flex items-center gap-1 text-fjalingo-green text-sm font-bold hover:gap-2 transition-all mb-6">
        <ArrowLeft className="w-4 h-4" /> {t('common.back')}
      </Link>

      <DailyChallengeCard />
    </div>
  );
};

export default DailyChallenge;
