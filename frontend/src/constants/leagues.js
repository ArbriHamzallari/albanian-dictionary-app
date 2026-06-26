import { t } from '../i18n/index.js';

// Tier display metadata. Class strings are literal so Tailwind keeps them.
// Tier names live in sq.json under leagueTiers.<key>, resolved via tierName().
export const TIER_STYLE = {
  bronxhi: {
    medal: '🥉',
    text: 'text-accent-coral',
    bg: 'bg-accent-coral/15',
    ring: 'ring-accent-coral',
  },
  argjendi: {
    medal: '🥈',
    text: 'text-ink-soft',
    bg: 'bg-ink-soft/15',
    ring: 'ring-ink-soft',
  },
  ari: {
    medal: '🥇',
    text: 'text-accent-yellow',
    bg: 'bg-accent-yellow/15',
    ring: 'ring-accent-yellow',
  },
};

export const tierName = (tier) => (TIER_STYLE[tier] ? t(`leagueTiers.${tier}`) : tier);
