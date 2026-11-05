import { AnimatePresence, motion, useDragControls } from 'motion/react';
import { X } from 'lucide-react';
import { useEffect, useId, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useUi } from '@/store/ui';

type BtnVariant = 'primary' | 'dark' | 'warm' | 'secondary' | 'ghost' | 'danger';

export function Button({
  variant = 'primary',
  size,
  block,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm'; block?: boolean }) {
  return (
    <button
      type="button"
      className={`btn btn--${variant} ${size ? 'btn--sm' : ''} ${block ? 'btn--block' : ''} ${className}`}
      {...rest}
    />
  );
}

export function IconButton({
  label,
  size,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; size?: 'sm' }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`icon-btn ${size ? 'icon-btn--sm' : ''} ${className}`}
      {...rest}
    />
  );
}

export function Label({ children, muted, plain }: { children: ReactNode; muted?: boolean; plain?: boolean }) {
  return <span className={`label ${muted ? 'label--muted' : ''} ${plain ? 'label--plain' : ''}`}>{children}</span>;
}

export function SimBadge({ children = 'Simülasyon' }: { children?: ReactNode }) {
  return <span className="sim-badge">{children}</span>;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  block,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  block?: boolean;
  ariaLabel?: string;
}) {
  const id = useId();
  return (
    <div className={`seg ${block ? 'seg--block' : ''}`} role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="seg__btn"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {value === o.value && (
            <motion.span layoutId={`seg-${id}`} className="seg__pill" transition={{ type: 'spring', stiffness: 480, damping: 38 }} />
          )}
          <span className="seg__text">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      className="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    />
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}

export function Progress({ value, tone, thin, label }: { value: number; tone?: 'warm'; thin?: boolean; label?: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div
      className={`bar ${tone === 'warm' ? 'bar--warm' : ''} ${thin ? 'bar--thin' : ''}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="bar__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty__title">{title}</div>
      {children && <div>{children}</div>}
      {action}
    </div>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const controls = useDragControls();
  const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 720px)').matches;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={`sheet ${wide ? 'sheet--wide' : ''}`}
            initial={isDesktop ? { opacity: 0, scale: 0.97, x: '-50%', y: '-48%' } : { y: '100%' }}
            animate={isDesktop ? { opacity: 1, scale: 1, x: '-50%', y: '-50%' } : { y: 0 }}
            exit={isDesktop ? { opacity: 0, scale: 0.97, x: '-50%', y: '-48%' } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            drag={isDesktop ? false : 'y'}
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onClose();
            }}
          >
            <div className="sheet__grab" onPointerDown={(e) => controls.start(e)}>
              <span />
            </div>
            <div className="sheet__head">
              <div>
                <div className="sheet__title">{title}</div>
                {subtitle && <div className="sheet__subtitle">{subtitle}</div>}
              </div>
              <IconButton label="Kapat" onClick={onClose}>
                <X size={20} />
              </IconButton>
            </div>
            <div className="sheet__body">{children}</div>
            {footer && <div className="sheet__foot">{footer}</div>}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function Toasts() {
  const toasts = useUi((s) => s.toasts);
  const dismiss = useUi((s) => s.dismissToast);
  const hasBanner = useUi((s) => !!s.banner);
  return (
    <div className={`toasts ${hasBanner ? 'toasts--low' : ''}`} aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            className={`toast toast--${t.tone}`}
            initial={{ opacity: 0, y: -14, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 520, damping: 34 }}
          >
            {t.tone === 'xp' && (
              <svg width="12" height="11" viewBox="0 0 12 11" aria-hidden="true">
                <path d="M6 0.5 11.5 10.5H0.5z" fill="currentColor" />
              </svg>
            )}
            <span>{t.text}</span>
            {t.actionLabel && (
              <button
                type="button"
                className="toast__action"
                onClick={() => {
                  t.onAction?.();
                  dismiss(t.id);
                }}
              >
                {t.actionLabel}
              </button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Marka üçgeni: logodaki amber üçgen */
export function Triangle({ size = 10, color = 'var(--amber)', filled = true }: { size?: number; color?: string; filled?: boolean }) {
  return (
    <svg width={size} height={size * 0.9} viewBox="0 0 12 11" aria-hidden="true">
      <path
        d="M6 0.8 11.3 10.3H0.7z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={filled ? 0 : 1.4}
        strokeLinejoin="round"
      />
    </svg>
  );
}
