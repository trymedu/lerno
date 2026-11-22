import { describe, expect, it } from 'bun:test';
import { estimateMathWidth, renderLatex } from './math';

describe('renderLatex', () => {
  it('renders KaTeX output for a valid source', () => {
    const html = renderLatex('x^2 + y^2 = r^2');
    expect(html).toContain('katex');
    expect(html).toContain('x');
  });

  it('builds structures such as fractions', () => {
    expect(renderLatex('\\frac{a}{b}')).toContain('katex');
  });

  it('keeps the scene on a broken source and returns the source', () => {
    const html = renderLatex('\\frac{a}');
    expect(html.length).toBeGreaterThan(0);
    expect(html).not.toBe('');
  });

  it('does not corrupt HTML escaping', () => {
    const html = renderLatex('a < b');
    expect(html).not.toContain('< b');
  });
});

describe('estimateMathWidth', () => {
  it('scales with fontSize', () => {
    const small = estimateMathWidth('x^2', 12);
    const large = estimateMathWidth('x^2', 24);
    expect(large).toBeGreaterThan(small);
  });

  it('returns a base width for a short expression', () => {
    expect(estimateMathWidth('x', 16)).toBeGreaterThanOrEqual(16 * 3);
  });

  it('shortens command names to avoid overflow', () => {
    const compact = estimateMathWidth('\\dfrac{\\sqrt{a}}{\\sin b}', 16);
    const spaces = estimateMathWidth('                    ', 16);
    expect(compact).toBeLessThan(spaces);
    expect(compact).toBeGreaterThan(0);
  });
});
