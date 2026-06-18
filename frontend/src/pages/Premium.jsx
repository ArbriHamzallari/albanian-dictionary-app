import { motion } from 'framer-motion';
import { Check, Crown } from 'lucide-react';
import PremiumCheckoutButton from '../components/PremiumCheckoutButton.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const features = [
  'Kërkime pa kufi',
  'Kuize pa kufi',
  'Pjesëmarrje në renditje dhe liga',
  'Miq dhe veçori sociale',
  'Arritje dhe progres i plotë',
];

const Premium = () => {
  const { user } = useAuth();
  const isPremium = user?.entitlement?.tier === 'premium';

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card text-center"
      >
        <Crown className="w-14 h-14 mx-auto mb-4 text-fjalingo-yellow fill-fjalingo-yellow" />
        <p className="text-sm font-black uppercase tracking-wide text-fjalingo-green mb-2">
          Premium
        </p>
        <h2 className="text-3xl sm:text-4xl font-black text-heading dark:text-dark-text mb-3">
          Përvoja e plotë Fjalingo
        </h2>
        <p className="text-muted dark:text-dark-muted font-semibold mb-6">
          25 EUR në vit. Pagesa hapet me Paddle Sandbox dhe aktivizohet nga webhook-u i verifikuar në server.
        </p>

        <div className="grid sm:grid-cols-2 gap-3 text-left mb-8">
          {features.map((feature) => (
            <div key={feature} className="flex items-center gap-2 font-bold text-heading dark:text-dark-text">
              <Check className="w-5 h-5 text-fjalingo-green" />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        {isPremium ? (
          <span className="badge badge-green">Premium aktiv</span>
        ) : (
          <PremiumCheckoutButton className="btn-primary inline-flex justify-center" />
        )}
      </motion.div>
    </div>
  );
};

export default Premium;
