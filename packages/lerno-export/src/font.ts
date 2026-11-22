import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import type { RenderElement } from '@medu/lerno';

/** A font file to make available under a family name. */
export interface FontDescriptor {
  /** Family name scenes will reference. */
  family: string;
  /** Absolute path to a `.ttf`, `.otf`, or `.woff2` file. */
  path: string;
  /** Font weight, for example `700`. */
  weight?: string;
  /** Font style, for example `italic`. */
  style?: string;
}

/**
 * Makes a font file available to the canvas renderer.
 *
 * ponytail: registration is process-wide and idempotent per file, so calling it
 * at start-up is enough; there is no need to thread a font handle through the
 * renderer.
 *
 * @param descriptor - Family name, file path, and optional weight or style.
 * @returns The family name, handy for passing straight into render options.
 */
export function registerFont(descriptor: FontDescriptor): string {
  const ok = GlobalFonts.registerFromPath(descriptor.path, descriptor.family);
  if (!ok) {
    throw new Error(
      `Could not register font "${descriptor.family}" from ${descriptor.path} — ` +
        'the file is missing or unreadable, and rendering without it can produce tofu for text the fallback font lacks.',
    );
  }
  return descriptor.family;
}

/** A codepoint no font maps, so its glyph is whatever the fallback draws. */
const UNASSIGNED = '\u0378';

/** Canvas size large enough for a 32px glyph and its box. */
const GLYPH_BOX = 48;

/**
 * Renders one character in isolation so the glyph can be compared byte for byte.
 * @param family - Font family to render with.
 * @param character - Single character to draw.
 * @returns PNG bytes of the glyph.
 */
function renderGlyph(family: string, character: string): Buffer {
  const canvas = createCanvas(GLYPH_BOX, GLYPH_BOX);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, GLYPH_BOX, GLYPH_BOX);
  ctx.fillStyle = '#000000';
  ctx.font = `32px ${family}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(character, GLYPH_BOX / 2, GLYPH_BOX / 2);
  return Buffer.from(canvas.encodeSync('png'));
}

/**
 * Reports which characters a family cannot draw.
 *
 * A missing glyph is detected by comparing it against a codepoint no font maps:
 * if both render identically — a tofu box, or nothing at all — the character is
 * absent. The probe is language-independent: pass whatever the scene will show.
 *
 * @param family - Font family to probe.
 * @param text - Characters to check; duplicates are collapsed.
 * @returns The characters that would render as tofu, in first-seen order.
 */
export function missingGlyphs(family: string, text: string): string[] {
  const fallback = renderGlyph(family, UNASSIGNED);
  const seen = new Set<string>();
  const missing: string[] = [];
  for (const character of text) {
    if (character.trim() === '' || seen.has(character)) continue;
    seen.add(character);
    if (Buffer.compare(renderGlyph(family, character), fallback) === 0) missing.push(character);
  }
  return missing;
}

/**
 * Collects every string a render tree will typeset.
 *
 * Feeding the result to {@link missingGlyphs} checks exactly the glyphs a scene
 * needs, whatever language they are in, instead of a preset sample.
 *
 * @param tree - Render tree root, the value `root.toRender()` returns.
 * @returns Concatenated text of every `text` element in the tree.
 */
export function collectText(tree: RenderElement): string {
  if (tree.type === 'text') return tree.text;
  if (tree.type === 'group') return tree.children.map(collectText).join('');
  return '';
}

/**
 * Fails when a family cannot render the given text.
 * @param family - Font family that will be used.
 * @param text - The characters that will be drawn.
 * @throws An error naming every missing character and how to fix it.
 */
export function assertGlyphCoverage(family: string, text: string): void {
  const missing = missingGlyphs(family, text);
  if (missing.length > 0) {
    throw new Error(
      `Font family "${family}" cannot render: ${missing.join(' ')} — ` +
        'register a font that covers them with registerFont() before exporting, ' +
        'otherwise the output shows tofu boxes instead of those characters.',
    );
  }
}
