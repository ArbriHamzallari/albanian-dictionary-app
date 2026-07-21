import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Languages, Puzzle, PencilLine, ScanSearch, Shuffle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import Heading from '../components/ui/Heading.jsx';
import GameOptionsSheet from '../components/GameOptionsSheet.jsx';
import Seo from '../components/Seo.jsx';
import { t } from '../i18n/index.js';

// Luaj hub (UI-4): the game chooser. One collectible card per backend QUESTION_TYPE
// plus the full-mix quiz as the hero. `type` is the code sent to /quiz/start via the
// hub → /kuizi?loja=<type>. Names/descriptions reuse the approved "si funksionon"
// strings; only the match name + hub chrome are new TODO_SQ_ keys.
const GAMES = [
  { type: 'translate', icon: Languages, nameKey: 'home.how.translate.title', descKey: 'home.how.translate.desc' },
  { type: 'match', icon: Puzzle, nameKey: 'TODO_SQ_hub_match_name', descKey: 'quiz.match.instruction' },
  { type: 'fill_blank', icon: PencilLine, nameKey: 'home.how.fill.title', descKey: 'home.how.fill.desc' },
  { type: 'spot_loanword', icon: ScanSearch, nameKey: 'home.how.spot.title', descKey: 'home.how.spot.desc' },
];

const GameHub = () => {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [sheet, setSheet] = useState({ open: false, type: null });

  // Logged-in users get the personalization sheet (world selection). Guests play the
  // taster quiz directly — origin/type selection are server-side, logged-in features.
  const launch = (type) => {
    if (isLoggedIn) { setSheet({ open: true, type }); return; }
    navigate(type ? `/kuizi?loja=${type}` : '/kuizi');
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Seo title="Luaj — Fjalingo" description={t('TODO_SQ_hub_subtitle')} path="/luaj" />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
        <Heading level={2}>{t('TODO_SQ_hub_title')}</Heading>
        <p className="mt-1 font-semibold text-muted dark:text-dark-muted">{t('TODO_SQ_hub_subtitle')}</p>
      </motion.div>

      {/* Hero: the full-mix quiz (default option) */}
      <button
        onClick={() => launch(null)}
        className="card card-hover mb-6 flex w-full items-center gap-4 border-brand-green/40 bg-brand-green/5 text-left"
      >
        <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-green/15">
          <Shuffle className="h-7 w-7 text-brand-green" aria-hidden="true" />
        </span>
        <div className="flex-1">
          <p className="text-lg font-black text-heading dark:text-dark-text">{t('TODO_SQ_hub_mix_name')}</p>
          <p className="text-sm font-semibold text-muted dark:text-dark-muted">{t('TODO_SQ_hub_mix_desc')}</p>
        </div>
        <ArrowRight className="h-5 w-5 flex-shrink-0 text-brand-green" aria-hidden="true" />
      </button>

      {/* One collectible card per game type */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {GAMES.map(({ type, icon: Icon, nameKey, descKey }) => (
          <button
            key={type}
            onClick={() => launch(type)}
            className="card card-hover flex items-start gap-3 py-4 text-left"
          >
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-green/10">
              <Icon className="h-5 w-5 text-brand-green" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-heading dark:text-dark-text">{t(nameKey)}</span>
              <span className="mt-0.5 block text-xs font-semibold text-muted dark:text-dark-muted">{t(descKey)}</span>
            </span>
          </button>
        ))}
      </div>

      <GameOptionsSheet
        open={sheet.open}
        gameType={sheet.type}
        onClose={() => setSheet({ open: false, type: null })}
      />
    </div>
  );
};

export default GameHub;
