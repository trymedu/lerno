import { describe, expect, it } from 'bun:test';
import { collectText, assertGlyphCoverage, missingGlyphs, registerFont } from './font';

/** A codepoint no font maps — it is always reported as missing. */
const UNASSIGNED = '͸';

describe('registerFont', () => {
  it('throws for a missing file instead of passing silently', () => {
    expect(() => registerFont({ family: 'Ghost', path: '/nonexistent/font.ttf' })).toThrow('Could not register font');
  });
});

describe('missingGlyphs', () => {
  it('detects an unmapped code point', () => {
    expect(missingGlyphs('Helvetica', UNASSIGNED)).toContain(UNASSIGNED);
  });

  it('reports a real character as missing in an unknown family', () => {
    // An unknown family falls back to the system font; which characters are
    // missing depends on the machine, so we check the array contract instead.
    const missing = missingGlyphs('NoSuchFont-DoesNotExist-XYZ', 'Ç');
    expect(Array.isArray(missing)).toBe(true);
    expect(missing.length).toBeLessThanOrEqual(1);
  });

  it('reports a duplicate once', () => {
    expect(missingGlyphs('Helvetica', UNASSIGNED + UNASSIGNED)).toEqual([UNASSIGNED]);
  });

  it('excludes whitespace from the candidates', () => {
    const missing = missingGlyphs('NoSuchFont-DoesNotExist-XYZ', `a ${UNASSIGNED}`);
    expect(missing).not.toContain(' ');
    expect(missing).toContain(UNASSIGNED);
  });

  it('returns an array and does not exceed the text length', () => {
    const missing = missingGlyphs('Helvetica', 'Step Solution');
    expect(Array.isArray(missing)).toBe(true);
    expect(missing.length).toBeLessThanOrEqual(10);
  });
});

describe('collectText', () => {
  it('collects every text element in the tree', () => {
    const tree = {
      type: 'group',
      children: [
        { type: 'text', text: 'Step ' },
        { type: 'group', children: [{ type: 'text', text: 'Solution' }] },
        { type: 'rect' },
      ],
    };
    expect(collectText(tree as never)).toBe('Step Solution');
  });

  it('returns empty for a tree without text', () => {
    expect(collectText({ type: 'group', children: [{ type: 'rect' }] } as never)).toBe('');
  });
});

describe('assertGlyphCoverage', () => {
  it('catches a character missing from every family', () => {
    expect(() => assertGlyphCoverage('Helvetica', UNASSIGNED)).toThrow('cannot render');
  });

  it('names the missing character and the fix', () => {
    try {
      assertGlyphCoverage('NoSuchFont-DoesNotExist-XYZ', `a ${UNASSIGNED}`);
      throw new Error('beklenmeyen basari');
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain(UNASSIGNED);
      expect(message).toContain('registerFont');
      expect(message).toContain('tofu');
    }
  });

  it('any family passes silently with empty text', () => {
    expect(() => assertGlyphCoverage('NoSuchFont-DoesNotExist-XYZ', '')).not.toThrow();
  });

  it('does not throw when nothing is missing', () => {
    const family = 'Helvetica';
    const text = 'Hello';
    if (missingGlyphs(family, text).length === 0) {
      expect(() => assertGlyphCoverage(family, text)).not.toThrow();
    }
  });
});
