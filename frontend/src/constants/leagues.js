// Tier display metadata. Class strings are literal so Tailwind keeps them.
export const TIER_STYLE = {
  bronxhi: {
    name: 'Bronxhi',
    medal: '🥉',
    text: 'text-accent-coral',
    bg: 'bg-accent-coral/15',
    ring: 'ring-accent-coral',
  },
  argjendi: {
    name: 'Argjendi',
    medal: '🥈',
    text: 'text-ink-soft',
    bg: 'bg-ink-soft/15',
    ring: 'ring-ink-soft',
  },
  ari: {
    name: 'Ari',
    medal: '🥇',
    text: 'text-accent-yellow',
    bg: 'bg-accent-yellow/15',
    ring: 'ring-accent-yellow',
  },
};

export const tierName = (tier) => TIER_STYLE[tier]?.name || tier;
