import { lernoTheme } from '@medu/lerno';

export { lernoTheme };

/**
 * Scene colors bound to the HeroUI v3 theme tokens.
 * Every visualization therefore adapts to light and dark mode. The values come
 * from `@heroui/styles` and fall back to Lerno's own palette so the package
 * stays presentable on its own.
 */
export const sceneColors = {
  background: 'var(--surface-secondary, #faf8f5)',
  grid: 'var(--border, rgba(15,23,42,0.10))',
  axis: 'var(--muted, #64748b)',
  text: 'var(--foreground, #0f172a)',
  muted: 'var(--muted, #64748b)',
  primary: 'var(--accent, #42a5f5)',
  success: 'var(--success, #10b981)',
  accent: 'var(--warning, #f59e0b)',
  danger: 'var(--danger, #ef4444)',
  secondary: 'var(--accent, #6366f1)',
  cyan: '#06b6d4',
  surface: 'var(--surface, #ffffff)',
  surfaceSoft: 'var(--surface-secondary, #f5f2eb)',
  border: 'var(--border, rgba(15,23,42,0.10))',
} as const;

/** Layout classes (HeroUI v3 + Tailwind). */
export const boardShell = 'flex flex-col gap-5';
/** Shared Tailwind classes for the lab control bar. */
export const controlBar = 'flex flex-wrap items-end gap-5';
