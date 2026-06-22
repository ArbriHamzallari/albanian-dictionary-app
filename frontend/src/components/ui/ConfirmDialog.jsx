import { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Button from './Button.jsx';

const SPRING = { type: 'spring', stiffness: 300, damping: 24 };

// Accessible confirm dialog: role=dialog + aria-modal, Esc to close, focus moves
// to the dialog on open. Used for destructive actions (block/report/remove).
const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = 'Konfirmo',
  cancelLabel = 'Anulo',
  variant = 'danger',
  onConfirm,
  onCancel,
  loading = false,
  children,
}) => {
  const reduceMotion = useReducedMotion();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onCancel?.(); };
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4"
          onClick={onCancel}
        >
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={reduceMotion ? { opacity: 0 } : { scale: 0.94, opacity: 0 }}
            animate={reduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { scale: 0.94, opacity: 0 }}
            transition={SPRING}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-line bg-paper p-6 outline-none focus-visible:ring-4 focus-visible:ring-brand-green/30"
          >
            <h2 className="text-xl font-black text-ink">{title}</h2>
            {description && <p className="mt-2 text-sm font-semibold text-ink-soft">{description}</p>}
            {children}
            <div className="mt-6 flex gap-3">
              <Button variant="secondary" size="md" fullWidth onClick={onCancel} disabled={loading}>
                {cancelLabel}
              </Button>
              <Button variant={variant} size="md" fullWidth onClick={onConfirm} loading={loading}>
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmDialog;
