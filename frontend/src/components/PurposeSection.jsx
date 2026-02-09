import { motion } from 'framer-motion';
import { Search, Lightbulb, Gamepad2, Trophy } from 'lucide-react';

const steps = [
  { icon: Search, text: 'Kërko fjalën e huazuar', color: 'text-fjalingo-blue' },
  { icon: Lightbulb, text: 'Zbulon versionin e saktë shqip', color: 'text-fjalingo-yellow' },
  { icon: Gamepad2, text: 'Mëso duke luajtur kuize argëtuese', color: 'text-fjalingo-green' },
  { icon: Trophy, text: 'Ruaj progres dhe fitoje arritje', color: 'text-fjalingo-purple' },
];

const PurposeSection = () => {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-fjalingo-green/5 via-transparent to-fjalingo-blue/5 dark:from-fjalingo-green/3 dark:to-fjalingo-blue/3 pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-black text-heading dark:text-dark-text mb-4">
            Pse Fjalingo? 🇦🇱
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-10 items-center">
          {/* Problem */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="card"
          >
            <h3 className="text-lg font-bold text-fjalingo-red mb-3">Problemi</h3>
            <p className="text-body dark:text-dark-muted leading-relaxed">
              Gjuha shqipe po humbet të vërtetën e saj. Çdo ditë, më shumë fjalë të huazuara
              po zëvendësojnë fjalët tona autentike. <strong>"Marketing"</strong> në vend të <strong>"tregtim"</strong>,
              <strong> "manager"</strong> në vend të <strong>"drejtues"</strong>,
              <strong> "weekend"</strong> në vend të <strong>"fundjavë"</strong>.
            </p>
          </motion.div>

          {/* Mission */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="card border-fjalingo-green/30"
          >
            <h3 className="text-lg font-bold text-fjalingo-green mb-3">Misioni Ynë</h3>
            <p className="text-body dark:text-dark-muted leading-relaxed">
              Fjalingo është krijuar për të ndihmuar shqiptarët të zbulojnë dhe përdorin
              fjalët e sakta shqipe. Ne besojmë që gjuha jonë është pasuri dhe duhet ruajtur
              për brezat e ardhshëm.
            </p>
          </motion.div>
        </div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12"
        >
          <h3 className="text-center text-lg font-bold text-heading dark:text-dark-text mb-8">
            Si funksionon?
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.4 + i * 0.1 }}
                className="card text-center py-6"
              >
                <step.icon className={`w-8 h-8 mx-auto mb-3 ${step.color}`} />
                <p className="text-sm font-bold text-heading dark:text-dark-text">{step.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center mt-10 text-lg font-bold text-heading dark:text-dark-text"
        >
          Bashkohu mijëra shqiptarëve që po ruajnë gjuhën tonë! 🦅
        </motion.p>
      </div>
    </section>
  );
};

export default PurposeSection;
