import { Ban, Heart, Lock, Trophy, MessageSquare, ShieldCheck } from 'lucide-react';
import SectionShell from '../ui/SectionShell.jsx';
import Eyebrow from '../ui/Eyebrow.jsx';
import SectionTitle from '../ui/SectionTitle.jsx';
import Card from '../ui/Card.jsx';
import { t } from '../../i18n/index.js';

// Section 9 — Privacy & safety (m4-rebrand.md §5.9). Warm parental cards, not legal
// text. EVERY claim is traceable to code that ships today (see the RB-9 PR notes):
//   private-by-default minors ...... authController: profilePrivate = isMinor
//   pseudonymous/opt-out leaderboards rankSql: leaderboard_opt_out + segment partition
//   accepted-friends preset chat .... chatController: no free text for minors
//   profanity + PII screening ....... childSafety.validateUserText
//   no ads / no hearts .............. product-wide (no such code exists)
// id="siguria" is the scroll target for the RB-8 Parents & teachers link.

const CHIP = {
  green: 'bg-brand-green/10 text-brand-green',
  coral: 'bg-accent-coral/10 text-accent-coral',
  purple: 'bg-accent-purple/10 text-accent-purple',
};

// title/desc are i18n keys — approved (home.trust.*) where the copy is verified
// accurate, precise new TODO_SQ_ keys for the split/added safety facts.
const CARDS = [
  { key: 'ads', icon: Ban, accent: 'coral', title: 'home.trust.ads.title', desc: 'home.trust.ads.desc' },
  { key: 'hearts', icon: Heart, accent: 'green', title: 'home.trust.hearts.title', desc: 'home.trust.hearts.desc' },
  { key: 'private', icon: Lock, accent: 'purple', title: 'TODO_SQ_landing_safety_private_title', desc: 'TODO_SQ_landing_safety_private_desc' },
  { key: 'leaderboard', icon: Trophy, accent: 'green', title: 'TODO_SQ_landing_safety_leaderboard_title', desc: 'TODO_SQ_landing_safety_leaderboard_desc' },
  { key: 'messages', icon: MessageSquare, accent: 'coral', title: 'home.trust.messages.title', desc: 'home.trust.messages.desc' },
  { key: 'filter', icon: ShieldCheck, accent: 'purple', title: 'TODO_SQ_landing_safety_filter_title', desc: 'TODO_SQ_landing_safety_filter_desc' },
];

const TrustCard = ({ icon: Icon, accent, title, desc }) => (
  <Card className="flex items-start gap-4 shadow-card transition-transform duration-200 hover:-translate-y-1 hover:shadow-card-hover">
    <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${CHIP[accent]}`}>
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
    <div>
      <h3 className="font-black text-ink">{t(title)}</h3>
      <p className="mt-1 text-sm font-semibold text-ink-soft">{t(desc)}</p>
    </div>
  </Card>
);

const TrustCards = () => (
  <SectionShell surface="cream" id="siguria" className="scroll-mt-20">
    <div className="flex flex-col items-center text-center">
      <Eyebrow>{t('home.trust.eyebrow')}</Eyebrow>
      <SectionTitle
        className="mt-4"
        align="center"
        title={t('home.trust.heading')}
        accentWord="sigurt"
        accent="green"
        subline={t('home.trust.lead')}
      />
    </div>

    <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {CARDS.map(({ key, icon, accent, title, desc }) => (
        <TrustCard key={key} icon={icon} accent={accent} title={title} desc={desc} />
      ))}
    </div>
  </SectionShell>
);

export default TrustCards;
