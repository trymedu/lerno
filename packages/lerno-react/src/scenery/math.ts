import katex from 'katex';

/**
 * Escapes the characters that could otherwise break out of an HTML fragment.
 * @param value - Raw text.
 * @returns The text with HTML metacharacters replaced by entities.
 */
function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Typesets a LaTeX source string into an HTML fragment.
 *
 * KaTeX runs with `throwOnError: false`, so malformed input renders as the
 * source in KaTeX's error colour instead of blanking the scene. The result is
 * KaTeX's own output and is safe to hand to `dangerouslySetInnerHTML`: with the
 * default `trust: false`, KaTeX does not emit `\href` or raw HTML.
 *
 * @param latex - LaTeX source, for example `x^2 + y^2 = r^2`.
 * @returns An HTML fragment; the escaped source when typesetting fails outright.
 */
export function renderLatex(latex: string): string {
  try {
    return katex.renderToString(latex, { throwOnError: false, output: 'html' });
  } catch {
    return escapeHtml(latex);
  }
}

/**
 * Estimates the box a typeset expression needs, so the SVG foreign object is
 * wide enough not to clip it.
 *
 * ponytail: heuristic, not measurement — command names collapse to one
 * character and the result is padded generously. It can overestimate (harmless,
 * the box is transparent and pointer-inert) but is biased against clipping.
 * Replace with a ResizeObserver measurement if a formula ever appears cut off.
 *
 * @param latex - LaTeX source being rendered.
 * @param fontSize - Font size in scene units.
 * @returns Estimated width in scene units.
 */
export function estimateMathWidth(latex: string, fontSize: number): number {
  const visible = latex.replace(/\\[a-zA-Z]+/g, 'x');
  return Math.max(fontSize * 3, (visible.length + 4) * fontSize * 0.75);
}
