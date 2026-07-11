import { Flame, TrendingUp, Trophy, Medal, Layers, Sparkles } from 'lucide-react';
import SectionShell from '../ui/SectionShell.jsx';
import Eyebrow from '../ui/Eyebrow.jsx';
import SectionTitle from '../ui/SectionTitle.jsx';
import Card from '../ui/Card.jsx';
import StatChip from '../ui/StatChip.jsx';
import { t } from '../../i18n/index.js';

// Section 7 — Features + live proof, merged (m4-rebrand.md §5.7). A slim live stat band
// (StatChip, honest numbers, no fake data) sits above collectible feature cards. The
// live word count comes in as the `words` prop — the /public/stats fetch stays in
// Home.jsx (one fetch; ProofStrip is retired in RB-11). Surface: --surface-mint.

const numberFormat = new Intl.NumberFormat('sq-AL');

// Icon-chip accents, existing tokens only (§3.4). Premium uses accent-purple (§5.7).
const CHIP = {
  green: 'bg-brand-green/10 text-brand-green',
  yellow: 'bg-accent-yellow/15 text-accent-yellow',
  coral: 'bg-accent-coral/10 text-accent-coral',
  purple: 'bg-accent-purple/10 text-accent-purple',
};

const FEATURES = [
  { key: 'streaks', icon: Flame, accent: 'yellow', title: 'home.features.streaks.title', desc: 'home.features.streaks.desc' },
  { key: 'levels', icon: TrendingUp, accent: 'green', title: 'TODO_SQ_landing_feat_levels_title', desc: 'TODO_SQ_landing_feat_levels_desc' },
  { key: 'achievements', icon: Trophy, accent: 'coral', title: 'home.features.achievements.title', desc: 'home.features.achievements.desc' },
  { key: 'leagues', icon: Medal, accent: 'green', title: 'TODO_SQ_landing_feat_leagues_title', desc: 'TODO_SQ_landing_feat_leagues_desc' },
  { key: 'collections', icon: Layers, accent: 'coral', title: 'TODO_SQ_landing_feat_collections_title', desc: 'TODO_SQ_landing_feat_collections_desc' },
  { key: 'premium', icon: Sparkles, accent: 'purple', title: 'TODO_SQ_landing_feat_premium_title', desc: 'TODO_SQ_landing_feat_premium_desc' },
];

const FeatureCard = ({ icon: Icon, accent, title, desc }) => (
  <Card className="text-center shadow-card transition-transform duration-200 hover:-translate-y-1 hover:shadow-card-hover">
    <span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${CHIP[accent]}`}>
      <Icon className="h-6 w-6" aria-hidden="true" />
    </span>
    <h3 className="mt-4 text-base font-black text-ink">{t(title)}</h3>
    <p className="mt-2 text-sm font-semibold text-ink-soft">{t(desc)}</p>
  </Card>
);

const FeatureProof = ({ words = null, id }) => {
  const stats = [
    { key: 'words', value: words === null ? null : numberFormat.format(words), label: t('home.proof.wordsLabel'), accent: 'green' },
    { key: 'worlds', value: 5, label: t('home.proof.worldsLabel'), accent: 'coral' },
    { key: 'ads', value: 0, label: t('home.proof.adsLabel'), accent: 'ink' },
    { key: 'hearts', value: 0, label: t('TODO_SQ_proof_hearts'), accent: 'ink' },
  ];

  return (
    <SectionShell surface="mint" id={id}>
      <div className="flex flex-col items-center text-center">
        <Eyebrow>{t('TODO_SQ_landing_feat_eyebrow')}</Eyebrow>
        <SectionTitle
          className="mt-4"
          align="center"
          title={t('TODO_SQ_landing_feat_title')}
          accentWord={t('TODO_SQ_landing_feat_title_accent')}
          accent="green"
          subline={t('TODO_SQ_landing_feat_subline')}
        />
      </div>

      <div className="mt-10 flex flex-wrap items-stretch justify-center gap-3 sm:gap-4">
        {stats.map(({ key, value, label, accent }) => (
          <StatChip key={key} value={value} label={label} accent={accent} loading={value === null} />
        ))}
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ key, icon, accent, title, desc }) => (
          <FeatureCard key={key} icon={icon} accent={accent} title={title} desc={desc} />
        ))}
      </div>
    </SectionShell>
  );
};

export default FeatureProof;
