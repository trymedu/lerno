import { readFileSync } from 'node:fs';
import {
  resolveLayerProps,
  type InteractionLayer,
  type LernoDocument,
  type MediaNode,
  type VariableValue,
} from '@medu/lerno';
import { parseVtt, type CaptionCue } from './vtt';

/** What {@link exportHtml} needs to write a player page. */
export interface HtmlExportOptions {
  /** Media node whose video and layers are exported. */
  nodeId: string;
  /** Video URL written into the page, relative to the page or absolute. */
  video: string;
  /** Poster URL, optional. */
  poster?: string;
  /** WebVTT file read at build time and embedded as cues. */
  vtt?: string;
  /** Page and accessible title. */
  title?: string;
  /** BCP 47 tag for the page. Defaults to `tr`. */
  lang?: string;
  /** Variable snapshot; defaults to the document's initial values. */
  variables?: Record<string, VariableValue>;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function displayValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'On' : 'Off';
  if (typeof value === 'number') return value.toLocaleString('en-US');
  if (typeof value === 'string') return value;
  return '-';
}

function initialVariables(document: LernoDocument, overrides?: Record<string, VariableValue>): Record<string, VariableValue> {
  const values: Record<string, VariableValue> = {};
  for (const [name, definition] of Object.entries(document.variables)) values[name] = definition.initial;
  return { ...values, ...(overrides ?? {}) };
}

/** Markup for one layer, already resolved against the initial variables. */
function layerMarkup(
  layer: InteractionLayer,
  props: Record<string, unknown>,
  raw: Record<string, unknown>,
  variables: Record<string, VariableValue>,
): string {
  const placement = `left:${(layer.placement.x * 100).toFixed(2)}%;top:${(layer.placement.y * 100).toFixed(2)}%;width:${(
    layer.placement.w * 100
  ).toFixed(2)}%`;
  const open = `<div class="layer" data-id="${escapeHtml(layer.id)}" data-from="${layer.fromMs}" data-to="${
    layer.toMs ?? ''
  }" data-fade="${layer.fadeMs}" style="${placement}">`;

  switch (layer.component) {
    case 'ui.switch': {
      const bound = layer.bind.value;
      const checked = bound ? asBoolean(variables[bound]) : asBoolean(props.checked);
      return `${open}<button type="button" class="control switch${checked ? ' is-on' : ''}"${
        bound ? ` data-toggle="${escapeHtml(bound)}"` : ''
      } aria-pressed="${checked}"><span class="label">${escapeHtml(asString(props.label, 'Toggle'))}</span><span class="track"><span class="knob"></span></span></button></div>`;
    }
    case 'ui.button':
      return `${open}<button type="button" class="control button${
        asString(props.variant, 'primary') === 'secondary' ? ' secondary' : ''
      }">${escapeHtml(asString(props.label, 'Continue'))}</button></div>`;
    case 'ui.select': {
      const options = Array.isArray(props.options) ? props.options : [];
      const value = layer.bind.value ? variables[layer.bind.value] : props.value;
      const optionHtml = options
        .map((option) => {
          const entry = option as { value?: unknown; label?: unknown };
          const selected = String(entry.value) === String(value) ? ' selected' : '';
          return `<option value="${escapeHtml(String(entry.value))}"${selected}>${escapeHtml(asString(entry.label))}</option>`;
        })
        .join('');
      return `${open}<label class="control select"><span class="kicker">${escapeHtml(
        asString(props.label, 'Select'),
      )}</span><select${layer.bind.value ? ` data-bind="${escapeHtml(layer.bind.value)}"` : ''}>${optionHtml}</select><span class="chevron">⌄</span></label></div>`;
    }
    case 'ui.slider': {
      const bound = layer.bind.value;
      const min = asNumber(props.min, 0);
      const max = asNumber(props.max, 100);
      const unit = asString(props.unit);
      const value = asNumber(bound ? variables[bound] : props.value, min);
      const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;
      return `${open}<label class="control slider"><span class="row"><span class="kicker">${escapeHtml(
        asString(props.label, 'Value'),
      )}</span><span class="value" data-value-for="${escapeHtml(bound ?? '')}">${escapeHtml(
        `${value}${unit ? ` ${unit}` : ''}`,
      )}</span></span><input type="range" min="${min}" max="${max}" step="${asNumber(props.step, 1)}" value="${value}"${
        bound ? ` data-bind="${escapeHtml(bound)}" data-unit="${escapeHtml(unit)}"` : ''
      } style="--percent:${percent.toFixed(2)}%"></label></div>`;
    }
    case 'lab.readout': {
      const rows = Array.isArray(raw.rows) ? raw.rows : [];
      const body = rows
        .map((row) => {
          const entry = row as { label?: unknown; value?: unknown };
          const reference =
            entry.value && typeof entry.value === 'object' && typeof (entry.value as { $var?: unknown }).$var === 'string'
              ? (entry.value as { $var: string }).$var
              : undefined;
          const shown = reference ? displayValue(variables[reference]) : displayValue(entry.value);
          return `<div class="readout-row"><span>${escapeHtml(asString(entry.label))}</span><b${
            reference ? ` data-readout="${escapeHtml(reference)}"` : ''
          }>${escapeHtml(shown)}</b></div>`;
        })
        .join('');
      return `${open}<div class="control readout"><span class="kicker">${escapeHtml(
        asString(props.title, 'Live values'),
      )}</span>${body || '<div class="readout-row muted">No value</div>'}</div></div>`;
    }
    default:
      return '';
  }
}

const STYLE = `
:root { color-scheme: light; --paper:#FAF8F1; --ink:#18181B; --muted:#71717A; --line:#E4E4E7; }
* { box-sizing: border-box; }
html, body { margin: 0; background: #0B0B0C; color: #FAFAFA; font-family: Arial, Helvetica, sans-serif; }
body { display: grid; place-items: center; min-height: 100vh; padding: 24px; }
.wrap { width: min(960px, 100%); display: flex; flex-direction: column; gap: 10px; }
.title { margin: 0; font-size: 14px; font-weight: 600; color: #A1A1AA; }
.stage { position: relative; overflow: hidden; border-radius: 14px; background: #000; border: 1px solid rgba(255,255,255,.12); }
.screen { position: relative; }
video { display: block; width: 100%; height: auto; }
.layers { position: absolute; inset: 0; pointer-events: none; }
.layer { position: absolute; opacity: 0; transition: none; }
.control { width: 100%; display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 0 14px; border-radius: 12px; border: 1px solid var(--line); background: #fff; color: var(--ink); font: 500 14px/1 Arial, Helvetica, sans-serif; }
.switch { justify-content: space-between; cursor: pointer; }
.switch .track { position: relative; width: 44px; height: 24px; border-radius: 12px; background: var(--line); transition: background .15s; }
.switch .knob { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: transform .15s; }
.switch.is-on .track { background: var(--ink); }
.switch.is-on .knob { transform: translateX(20px); }
.button { justify-content: center; border-color: transparent; background: var(--ink); color: #FAFAFA; }
.button.secondary { background: #fff; color: var(--ink); border-color: var(--line); }
.select { position: relative; flex-direction: column; align-items: stretch; justify-content: center; gap: 2px; padding: 8px 14px; }
.select select { appearance: none; border: 0; background: transparent; font: 500 14px/1.2 Arial, Helvetica, sans-serif; color: var(--ink); width: 100%; padding-right: 16px; }
.select .chevron { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); }
.kicker { font-size: 10px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
.slider { flex-direction: column; align-items: stretch; justify-content: center; gap: 6px; padding: 8px 14px; }
.slider .row { display: flex; justify-content: space-between; align-items: baseline; }
.slider .value { font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; }
.slider input { width: 100%; margin: 0; appearance: none; height: 4px; border-radius: 2px; background: linear-gradient(to right, var(--ink) var(--percent), var(--line) var(--percent)); }
.slider input::-webkit-slider-thumb { appearance: none; width: 14px; height: 14px; border-radius: 50%; background: var(--ink); }
.readout { flex-direction: column; align-items: stretch; justify-content: flex-start; gap: 6px; padding: 10px 14px 12px; }
.readout-row { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; color: var(--muted); }
.readout-row b { color: var(--ink); font-variant-numeric: tabular-nums; }
.readout-row.muted { color: var(--muted); }
.captions { position: absolute; left: 0; right: 0; bottom: 14px; display: flex; justify-content: center; pointer-events: none; padding: 0 8%; }
.cue { max-width: 80%; padding: 8px 14px; border-radius: 8px; background: rgba(0,0,0,.72); color: #fff; font-size: 15px; line-height: 1.35; text-align: center; display: none; }
.play { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); display: grid; place-items: center; width: 56px; height: 56px; border: 0; background: transparent; cursor: pointer; padding: 0; }
.play span { display: grid; place-items: center; width: 56px; height: 56px; border-radius: 50%; background: rgba(255,255,255,.95); color: #18181B; }
.play[hidden] { display: none; }
.bar { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 1px solid rgba(255,255,255,.12); border-radius: 12px; background: #111113; }
.bar button { display: grid; place-items: center; width: 32px; height: 32px; border: 0; border-radius: 50%; background: rgba(255,255,255,.1); color: #FAFAFA; cursor: pointer; }
.bar input { flex: 1; appearance: none; height: 4px; border-radius: 2px; background: rgba(255,255,255,.2); }
.bar input::-webkit-slider-thumb { appearance: none; width: 12px; height: 12px; border-radius: 50%; background: #FAFAFA; }
.bar .time { font-size: 11px; font-variant-numeric: tabular-nums; color: #A1A1AA; }
.anchor { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(380px, 86%); padding: 16px; border-radius: 14px; background: #fff; color: var(--ink); border: 1px solid var(--line); }
.anchor h2 { margin: 0 0 6px; font-size: 14px; }
.anchor p { margin: 0 0 12px; font-size: 12px; color: var(--muted); }
.anchor button { width: 100%; height: 38px; border: 0; border-radius: 10px; background: var(--ink); color: #fff; font-weight: 600; cursor: pointer; }
.anchor[hidden] { display: none; }
@media (max-width: 767px) {
  .layers { position: static; display: flex; flex-direction: column; gap: 8px; padding: 10px; background: #fff; }
  .layer { position: static; width: auto !important; transform: none !important; opacity: 1 !important; }
  .layer[hidden] { display: none; }
  .captions { bottom: 8px; }
}
`;

const SCRIPT = `
const video = document.getElementById('video');
const layers = Array.from(document.querySelectorAll('.layer'));
const cueBox = document.getElementById('cue');
const play = document.getElementById('play');
const toggle = document.getElementById('toggle');
const seek = document.getElementById('seek');
const time = document.getElementById('time');
const anchorBox = document.getElementById('anchor');
const anchorTitle = document.getElementById('anchor-title');
const anchorBody = document.getElementById('anchor-body');
const state = window.__LERNO__;
const variables = { ...state.variables };
let lastMs = 0;

function format(ms) {
  const total = Math.floor((ms || 0) / 1000);
  return Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
}

function show(value) {
  if (typeof value === 'boolean') return value ? 'On' : 'Off';
  if (typeof value === 'number') return value.toLocaleString('en-US');
  if (typeof value === 'string') return value;
  return '-';
}

function paintSlider(node) {
  const key = node.dataset.bind;
  const value = Number(variables[key]);
  const label = document.querySelector('[data-value-for="' + key + '"]');
  if (label) label.textContent = String(variables[key]) + (node.dataset.unit ? ' ' + node.dataset.unit : '');
  const min = Number(node.min) || 0;
  const max = Number(node.max) || 100;
  const percent = max === min ? 0 : ((value - min) / (max - min)) * 100;
  node.style.setProperty('--percent', percent + '%');
}

function syncFields() {
  document.querySelectorAll('[data-readout]').forEach((node) => {
    node.textContent = show(variables[node.dataset.readout]);
  });
  document.querySelectorAll('[data-toggle]').forEach((node) => {
    const on = variables[node.dataset.toggle] === true;
    node.classList.toggle('is-on', on);
    node.setAttribute('aria-pressed', String(on));
  });
  document.querySelectorAll('[data-bind]').forEach((node) => {
    const key = node.dataset.bind;
    if (!(key in variables)) return;
    if (node.tagName === 'SELECT') node.value = String(variables[key]);
    if (node.type === 'range') {
      node.value = String(variables[key]);
      paintSlider(node);
    }
  });
}

function bindControls() {
  document.querySelectorAll('[data-toggle]').forEach((node) => {
    node.addEventListener('click', () => {
      variables[node.dataset.toggle] = !variables[node.dataset.toggle];
      syncFields();
    });
  });
  document.querySelectorAll('[data-bind]').forEach((node) => {
    const write = () => {
      if (node.tagName === 'SELECT') {
        const raw = node.value;
        variables[node.dataset.bind] = raw !== '' && !Number.isNaN(Number(raw)) ? Number(raw) : raw;
      } else {
        variables[node.dataset.bind] = Number(node.value);
      }
      syncFields();
    };
    node.addEventListener('input', write);
    node.addEventListener('change', write);
  });
}

const compact = window.matchMedia('(max-width: 767px)');

function paintLayers(ms) {
  const inline = compact.matches;
  for (const node of layers) {
    const from = Number(node.dataset.from) || 0;
    const to = node.dataset.to ? Number(node.dataset.to) : Infinity;
    const fade = Number(node.dataset.fade) || 0;
    if (inline) {
      node.hidden = !(ms >= from && ms < to);
      continue;
    }
    node.hidden = false;
    if (ms < from || ms >= to) {
      node.style.opacity = '0';
      node.style.pointerEvents = 'none';
      continue;
    }
    let opacity = 1;
    if (fade > 0) {
      opacity = Math.min((ms - from) / fade, to === Infinity ? 1 : (to - ms) / fade, 1);
      opacity = Math.max(0, opacity);
    }
    node.style.opacity = String(opacity);
    node.style.transform = 'translateY(' + ((1 - opacity) * 6).toFixed(1) + 'px)';
    node.style.pointerEvents = opacity > 0.2 ? 'auto' : 'none';
  }
}

function paintCue(ms) {
  const cue = state.cues.find((entry) => ms >= entry.startMs && ms < entry.endMs);
  if (!cue) {
    cueBox.style.display = 'none';
    return;
  }
  cueBox.style.display = 'block';
  cueBox.textContent = cue.text;
}

const seen = new Set();
function checkAnchors(ms, previous) {
  if (!anchorBox.hidden) return;
  const next = state.anchors.find((anchor) => !seen.has(anchor.id) && anchor.atMs > previous && anchor.atMs <= ms);
  if (!next) return;
  seen.add(next.id);
  video.pause();
  anchorTitle.textContent = next.label;
  anchorBody.textContent = next.body || '';
  anchorBox.hidden = false;
}

function tick() {
  const ms = video.currentTime * 1000;
  paintLayers(ms);
  paintCue(ms);
  checkAnchors(ms, lastMs);
  lastMs = ms;
  seek.value = String(ms);
  time.textContent = format(ms) + ' / ' + format(video.duration * 1000);
  requestAnimationFrame(tick);
}

function playVideo() {
  void video.play();
}

play.addEventListener('click', playVideo);
toggle.addEventListener('click', () => (video.paused ? playVideo() : video.pause()));
video.addEventListener('play', () => {
  play.hidden = true;
  toggle.textContent = '❚❚';
});
video.addEventListener('pause', () => {
  play.hidden = false;
  toggle.textContent = '▶';
});
video.addEventListener('loadedmetadata', () => {
  seek.max = String(video.duration * 1000);
});
seek.addEventListener('input', () => {
  video.currentTime = Number(seek.value) / 1000;
  lastMs = Number(seek.value);
});
document.getElementById('anchor-continue').addEventListener('click', () => {
  anchorBox.hidden = true;
  playVideo();
});

bindControls();
syncFields();
paintLayers(0);
requestAnimationFrame(tick);
`;

/**
 * Writes a standalone HTML player for one media node.
 *
 * The page carries the video, the component layers as plain DOM, the caption
 * cues, and a small runtime that keeps them in sync — no React, no bundler, no
 * Chromium. The play button, controls, and anchor pauses are rendered by the
 * same generator, so the exported file behaves like the player.
 *
 * @param document - Document that owns the media node.
 * @param options - Node id, video URL, captions, and title.
 * @returns A complete HTML document.
 */
export function exportHtml(document: LernoDocument, options: HtmlExportOptions): string {
  const node = document.nodes.find((entry) => entry.id === options.nodeId) as MediaNode | undefined;
  if (!node || node.type !== 'media') throw new Error(`Media node not found: ${options.nodeId}`);

  const variables = initialVariables(document, options.variables);
  const layers = node.layers
    .map((layer) =>
      layerMarkup(layer, resolveLayerProps(layer.props, variables) as Record<string, unknown>, layer.props, variables),
    )
    .filter(Boolean)
    .join('\n');

  const cues: CaptionCue[] = options.vtt ? parseVtt(readFileSync(options.vtt, 'utf8')) : [];
  const anchorPayload = node.anchors.map((anchor) => ({
    id: anchor.id,
    atMs: anchor.atMs,
    label: anchor.label,
    body: anchor.body ?? '',
  }));

  const state = {
    variables,
    cues,
    anchors: anchorPayload,
  };

  const title = escapeHtml(options.title ?? document.metadata.title ?? 'Lerno');
  const lang = escapeHtml(options.lang ?? 'tr');

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>${STYLE}</style>
</head>
<body>
<div class="wrap">
  <p class="title">${title}</p>
  <div class="stage">
    <div class="screen">
      <video id="video" src="${escapeHtml(options.video)}"${options.poster ? ` poster="${escapeHtml(options.poster)}"` : ''} playsinline preload="metadata"></video>
      <div class="captions"><div class="cue" id="cue"></div></div>
      <button class="play" id="play" type="button" aria-label="Play"><span><svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4.5 2.8v10.4a.6.6 0 0 0 .92.5l8.1-5.2a.6.6 0 0 0 0-1L5.42 2.3a.6.6 0 0 0-.92.5Z"/></svg></span></button>
      <div class="anchor" id="anchor" hidden>
        <h2 id="anchor-title"></h2>
        <p id="anchor-body"></p>
        <button type="button" id="anchor-continue">Continue</button>
      </div>
    </div>
    <div class="layers">
${layers}
    </div>
  </div>
  <div class="bar">
    <button type="button" id="toggle" aria-label="Play / pause">▶</button>
    <input type="range" id="seek" min="0" max="1000" value="0" aria-label="Time">
    <span class="time" id="time">0:00 / 0:00</span>
  </div>
</div>
<script>window.__LERNO__ = ${JSON.stringify(state)};</script>
<script>${SCRIPT}</script>
</body>
</html>
`;
}
