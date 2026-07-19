import { Link } from 'react-router-dom';
import Parrot from './mascot/Parrot.jsx';
import { t } from '../i18n/index.js';

// Calm, warm empty state shared by the daily surfaces (Sfida e Ditës / Fjala e Ditës).
// A missing daily word is an OPS gap — the cron hasn't seeded one yet — never the user's
// fault, so this must read as a gentle "not ready yet" with a way forward (a quiz that
// still converts the visit), NOT a red error. Never render blank on these surfaces.
const DailyEmptyState = ({ message }) => (
  <div className="card flex flex-col items-center text-center py-10">
    <Parrot state="sleep" size={112} />
    <p className="mt-5 max-w-sm text-base font-semibold text-muted dark:text-dark-muted">
      {message}
    </p>
    <Link to="/kuizi" className="btn-primary mt-6">
      {t('dashboard.actions.playQuiz')}
    </Link>
  </div>
);

export default DailyEmptyState;
