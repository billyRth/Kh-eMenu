import { useEffect, type ReactNode } from 'react';
import { Loader2, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { khr, usd } from '@/lib/format';

/** Paint shadcn's primary colour with the restaurant's brand colour (portaled drawers included). */
export function useBrandColor(color: string | undefined) {
  useEffect(() => {
    if (!color) return;
    const root = document.documentElement;
    root.style.setProperty('--primary', color);
    root.style.setProperty('--ring', color);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
    return () => {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--ring');
    };
  }, [color]);
}

export function Price({ amount, rate, showKhr, className }: { amount: number; rate: number; showKhr: boolean; className?: string }) {
  return (
    <span className={cn('font-bold tabular-nums', className)}>
      {usd(amount)}
      {showKhr && <span className="ml-1.5 text-[0.8em] font-medium text-muted-foreground">{khr(amount, rate)}</span>}
    </span>
  );
}

export function FoodImage({ src, emoji, alt, className, emojiClass }: { src: string | null; emoji: string | null; alt: string; className?: string; emojiClass?: string }) {
  return (
    <div className={cn('grid place-items-center overflow-hidden bg-gradient-to-br from-secondary to-primary/15', className)}>
      {src ? <img src={src} alt={alt} loading="lazy" className="size-full object-cover" /> : <span className={cn('select-none text-4xl', emojiClass)}>{emoji || '🍽️'}</span>}
    </div>
  );
}

export function QtyStepper({ value, onChange, min = 0, max = 50, size = 'md' }: { value: number; onChange: (v: number) => void; min?: number; max?: number; size?: 'sm' | 'md' }) {
  const btn = cn('grid place-items-center rounded-full text-primary transition active:scale-90 disabled:opacity-30', size === 'sm' ? 'size-7' : 'size-10');
  return (
    <div className="inline-flex items-center rounded-full border bg-card">
      <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min && min > 0} aria-label="Decrease">
        <Minus className="size-4" strokeWidth={2.5} />
      </button>
      <span className={cn('min-w-6 text-center font-bold tabular-nums', size === 'sm' && 'text-sm')} aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Increase">
        <Plus className="size-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}

/** Bottom drawer with swipe-to-close; centred card on larger screens. */
export function Panel({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()} showSwipeHandle>
      <DrawerContent className="mx-auto w-full sm:max-w-lg">
        {(title || description) && (
          <DrawerHeader className="text-left group-data-[swipe-axis=y]/drawer-popup:text-left">
            {title && <DrawerTitle className="text-lg font-bold">{title}</DrawerTitle>}
            {description && <DrawerDescription className="text-left">{description}</DrawerDescription>}
          </DrawerHeader>
        )}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-4">{children}</div>
        {footer && <div className="border-t bg-card px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </DrawerContent>
    </Drawer>
  );
}

export function LoadingScreen({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="size-7 animate-spin text-primary" />
        <p className="text-sm">{label}</p>
      </div>
    </div>
  );
}

export function MessageScreen({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center p-6">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        {icon && <div className="grid size-14 place-items-center rounded-2xl bg-secondary text-muted-foreground">{icon}</div>}
        <h1 className="text-xl font-bold">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export { khr, usd };
