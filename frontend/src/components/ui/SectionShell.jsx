import { motion, useReducedMotion } from 'framer-motion';

// SectionShell — the single layout primitive every landing section sits on
// (m4-rebrand.md §3.3, §3.6). It owns three things so no section repeats them:
//   • the atmosphere surface (token-backed, dark-mode-correct for free),
//   • the section rhythm (120px desktop / 80px tablet / 64px mobile) inside a
//     max-w-6xl container,
//   • the ONE reusable scroll-reveal (fade + 24px rise, once, reduced-motion safe).

const SURFACES = {
  paper: 'bg-paper',
  cream: 'bg-surface-cream',
  mint: 'bg-surface-mint',
  hero: 'bg-[image:var(--surface-hero)]',
  dark: 'bg-dark-bg',
};

// The single scroll-reveal pattern reused everywhere (m4-rebrand.md §3.8).
const REVEAL = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const SectionShell = ({
  surface = 'paper',
  id,
  className = '',
  containerClassName = '',
  children,
}) => {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id={id}
      className={[SURFACES[surface] ?? SURFACES.paper, className]
        .filter(Boolean)
        .join(' ')}
    >
      <motion.div
        className={[
          'mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-20 lg:py-[120px]',
          containerClassName,
        ]
          .filter(Boolean)
          .join(' ')}
        initial={reduceMotion ? false : 'hidden'}
        whileInView={reduceMotion ? undefined : 'visible'}
        viewport={{ once: true, amount: 0.2 }}
        variants={reduceMotion ? undefined : REVEAL}
      >
        {children}
      </motion.div>
    </section>
  );
};

export default SectionShell;
