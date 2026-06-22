import { motion, useReducedMotion } from 'framer-motion';
import { Check, Crown } from 'lucide-react';
import PremiumCheckoutButton from '../components/PremiumCheckoutButton.jsx';
import Card from '../components/ui/Card.jsx';
import Heading from '../components/ui/Heading.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const features = [
  'Kërkime pa kufi',
  'Kuize pa kufi',
  'Pjesëmarrje në renditje dhe liga',
  'Miq dhe veçori sociale',
  'Arritje dhe progres i plotë',
];

const Premium = () => {
  const reduceMotion = useReducedMotion();
  const { user } = useAuth();
  const isPremium = user?.entitlement?.tier === 'premium';

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      >
        <Card padding="lg" className="text-center">
          <Crown className="w-14 h-14 mx-auto mb-4 text-accent-yellow" aria-hidden="true" />
          <p className="text-sm font-black uppercase tracking-wide text-brand-green mb-2">Premium</p>
          <Heading level={2} className="mb-3">Përvoja e plotë Fjalingo</Heading>
          <p className="text-ink-soft font-semibold mb-6">
            25 EUR në vit. Pagesa hapet me Paddle Sandbox dhe aktivizohet nga webhook-u i verifikuar në server.
          </p>

          <div className="grid sm:grid-cols-2 gap-3 text-left mb-8">
            {features.map((feature) => (
              <div key={feature} className="flex items-center gap-2 font-bold text-ink">
                <Check className="w-5 h-5 text-brand-green flex-shrink-0" aria-hidden="true" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          {isPremium ? (
            <span className="inline-flex items-center gap-2 rounded-pill bg-brand-green/15 px-4 py-2 text-sm font-extrabold text-brand-green">
              <Check className="w-4 h-4" aria-hidden="true" /> Premium aktiv
            </span>
          ) : (
            <PremiumCheckoutButton />
          )}
        </Card>
      </motion.div>
    </div>
  );
};

export default Premium;
