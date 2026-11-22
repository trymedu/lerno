/**
 * Lerno's default visual language for rendered output.
 *
 * The palette is tuned for dark canvases: a deep background, a blue primary,
 * and muted axis/grid tones that stay readable behind dense geometry. The
 * dimensions describe a 16:9 stage, which is what headless and video renders
 * target by default. Renderers may override any of these per scene.
 */
export const lernoTheme = {
  colors: {
    bgDark: '#0B0F19',
    bgCard: '#111827',
    primary: '#3B82F6', // Sapphire blue
    success: '#10B981', // Emerald
    secondary: '#6366F1', // Indigo
    accent: '#F59E0B', // Amber
    danger: '#EF4444', // Red
    purple: '#8B5CF6',
    pink: '#EC4899',
    cyan: '#06B6D4',
    grid: '#1E293B',
    axis: '#475569',
    textMain: '#F8FAFC',
    textMuted: '#94A3B8',
  },
  dimensions: {
    width: 1920,
    height: 1080,
  },
};
