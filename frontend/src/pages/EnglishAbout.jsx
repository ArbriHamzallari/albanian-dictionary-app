import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import Seo from '../components/Seo.jsx';

// The ONE sanctioned English page (root CLAUDE.md): a plain-language explainer for
// Paddle reviewers and non-Albanian visitors. English copy is not gated by the
// Albanian sq.json rule. Placeholder marketing copy below — Arbri can replace the
// wording with the final English text; the structure (what it is, price, free vs
// premium, cancel anytime, contact) is what the Paddle domain review needs.

const FREE = [
  'Word of the Day',
  'A few daily searches',
  'One daily quiz',
  'Basic XP and streaks',
  'View-only global leaderboard',
];

const PREMIUM = [
  'Unlimited search and quizzes',
  'The full content library (all categories and difficulty levels)',
  'Full gamification: achievements, leagues and seasons',
  'Friends and friend/worldwide leaderboard participation',
  'Parent progress view and multiple child profiles',
];

const List = ({ items }) => (
  <ul className="space-y-2">
    {items.map((item) => (
      <li key={item} className="flex items-start gap-2 text-body dark:text-dark-muted font-medium">
        <Check className="w-5 h-5 flex-shrink-0 text-fjalingo-green mt-0.5" aria-hidden="true" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const EnglishAbout = () => (
  <div className="max-w-3xl mx-auto px-6 py-12">
    <Seo
      title="Fjalingo — Speak real Albanian"
      description="Fjalingo helps Albanians — at home and in the diaspora — swap borrowed words for authentic Albanian, wrapped in a daily habit. Free tier plus Premium at €25/year or €5/month."
      path="/en"
    />

    <h1 className="text-3xl md:text-4xl font-black text-heading dark:text-dark-text mb-4">
      What is Fjalingo?
    </h1>
    <p className="text-body dark:text-dark-muted font-medium leading-relaxed mb-6">
      Fjalingo is a gamified web app for Albanian speakers — in the homeland and across the
      diaspora — who already speak Albanian but mix in borrowed words (from Turkish, Italian,
      English, Greek and Slavic layers). It takes a borrowed word you already say, teaches the
      authentic Albanian word, and wraps it in a daily habit of short exercises, streaks and
      leaderboards. It is not a course to learn Albanian from scratch; it helps you get your
      Albanian back.
    </p>

    <h2 className="text-2xl font-extrabold text-heading dark:text-dark-text mb-3">Pricing</h2>
    <p className="text-body dark:text-dark-muted font-medium leading-relaxed mb-8">
      Fjalingo is free to start. Premium is one subscription with two plans:{' '}
      <strong className="text-heading dark:text-dark-text">€25 per year</strong> or{' '}
      <strong className="text-heading dark:text-dark-text">€5 per month</strong>, billed through
      Paddle. The annual plan saves about 58%. You can cancel anytime; your Premium access
      continues until the end of the paid period. EU customers have a 14-day right of withdrawal — see the{' '}
      <Link to="/rimbursimi" className="font-bold text-fjalingo-green hover:text-fjalingo-green-dark">
        refund policy
      </Link>
      . See the full{' '}
      <Link to="/premium" className="font-bold text-fjalingo-green hover:text-fjalingo-green-dark">
        pricing page
      </Link>
      .
    </p>

    <div className="grid gap-6 md:grid-cols-2 mb-10">
      <div className="card">
        <h3 className="text-lg font-black text-heading dark:text-dark-text mb-4">Free</h3>
        <List items={FREE} />
      </div>
      <div className="card border-fjalingo-purple/40">
        <h3 className="text-lg font-black text-fjalingo-purple mb-4">Premium — €25/year or €5/month</h3>
        <List items={PREMIUM} />
      </div>
    </div>

    <h2 className="text-2xl font-extrabold text-heading dark:text-dark-text mb-3">Contact</h2>
    <p className="text-body dark:text-dark-muted font-medium leading-relaxed">
      Fjalingo is operated by Arbri Hamzallari (sole proprietor), trading as Fjalingo. Questions?
      Email{' '}
      <a
        href="mailto:fjalingo.al@gmail.com"
        className="font-bold text-fjalingo-green hover:text-fjalingo-green-dark"
      >
        fjalingo.al@gmail.com
      </a>
      . See our{' '}
      <Link to="/kushtet" className="font-bold text-fjalingo-green hover:text-fjalingo-green-dark">
        Terms
      </Link>{' '}
      and{' '}
      <Link to="/privatesia" className="font-bold text-fjalingo-green hover:text-fjalingo-green-dark">
        Privacy Policy
      </Link>
      .
    </p>
  </div>
);

export default EnglishAbout;
