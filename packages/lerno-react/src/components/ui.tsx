'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { LernoComponentProps, LayerTone } from './component-types.js';
import { asBoolean, asNumber, asString } from './component-types.js';

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';

function surface(tone: LayerTone | undefined): string {
  return tone === 'dark'
    ? 'border-white/15 bg-zinc-950/80 text-zinc-50 shadow-lg backdrop-blur-md'
    : 'border-zinc-200 bg-white text-zinc-900 shadow-sm';
}

function muted(tone: LayerTone | undefined): string {
  return tone === 'dark' ? 'text-zinc-400' : 'text-zinc-500';
}

/** shadcn-style switch; reads its bound variable through `value` / `onChange`. */
export function Switch(props: LernoComponentProps) {
  const checked = asBoolean(props.value);
  const label = asString(props.label, 'Toggle');
  const tone = props.tone;
  const track = checked
    ? tone === 'dark'
      ? 'bg-zinc-100'
      : 'bg-zinc-900'
    : tone === 'dark'
      ? 'bg-zinc-700'
      : 'bg-zinc-200';
  const knob = checked
    ? tone === 'dark'
      ? 'translate-x-[20px] bg-zinc-900'
      : 'translate-x-[20px] bg-white'
    : 'translate-x-0 bg-white';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => props.onChange?.(!checked)}
      disabled={asBoolean(props.disabled)}
      className={`inline-flex min-h-11 items-center gap-3 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${surface(tone)} ${focus}`}
    >
      <span className="whitespace-nowrap">{label}</span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${track}`}>
        <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full shadow-sm transition-transform ${knob}`} />
      </span>
    </button>
  );
}

/** Read-only action component rendered by the player. */
export function Button(props: LernoComponentProps) {
  const label = asString(props.label, 'Continue');
  const variant = asString(props.variant, 'primary');
  const tone = props.tone;
  const primary = tone === 'dark' ? 'bg-zinc-50 text-zinc-900 hover:bg-zinc-200' : 'bg-zinc-900 text-zinc-50 hover:bg-zinc-800';
  const secondary =
    tone === 'dark'
      ? 'border border-white/20 bg-transparent text-zinc-50 hover:bg-white/10'
      : 'border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50';

  return (
    <button
      type="button"
      disabled={asBoolean(props.disabled)}
      onClick={() => props.onChange?.(true)}
      className={`inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors disabled:opacity-50 ${variant === 'secondary' ? secondary : primary} ${focus}`}
    >
      {label}
    </button>
  );
}

interface SelectOption {
  value: string | number;
  label: string;
}

function readOptions(value: unknown): SelectOption[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const option = entry as { value?: unknown; label?: unknown };
    if (typeof option.value !== 'string' && typeof option.value !== 'number') return [];
    if (typeof option.label !== 'string') return [];
    return [{ value: option.value, label: option.label }];
  });
}

/** Select component rendered by the player. */
export function Select(props: LernoComponentProps) {
  const label = asString(props.label, 'Select');
  const tone = props.tone;
  const options = readOptions(props.options);
  const value = typeof props.value === 'number' ? props.value : asString(props.value);
  const selectedIndex = Math.max(0, options.findIndex((option) => String(option.value) === String(value)));
  const current = options[selectedIndex];
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(selectedIndex);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    setActive(selectedIndex);
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as globalThis.Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, selectedIndex]);

  function choose(option: SelectOption): void {
    props.onChange?.(option.value);
    setOpen(false);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>): void {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setActive(selectedIndex);
        setOpen(true);
      }
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => Math.min(options.length - 1, index + 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      setActive(0);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      setActive(Math.max(0, options.length - 1));
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const option = options[active];
      if (option) choose(option);
    }
  }

  return (
    <div ref={rootRef} className={`relative flex min-h-11 flex-col justify-center gap-1 rounded-xl border px-3.5 py-2 ${surface(tone)}`}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={asBoolean(props.disabled) || options.length === 0}
        onClick={() => setOpen((currentOpen) => !currentOpen)}
        onKeyDown={onKeyDown}
        className={`flex w-full items-center justify-between gap-3 rounded-md text-left ${focus}`}
      >
        <span className="flex min-w-0 flex-col">
          <span className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${muted(tone)}`}>{label}</span>
          <span className={`truncate text-sm font-medium ${tone === 'dark' ? 'text-zinc-50' : 'text-zinc-900'}`}>
            {current?.label ?? 'No options'}
          </span>
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${muted(tone)}`}
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-label={label}
          className={`absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-lg border p-1 shadow-xl ${
            tone === 'dark' ? 'border-white/15 bg-zinc-900 text-zinc-50' : 'border-zinc-200 bg-white text-zinc-900'
          }`}
        >
          {options.map((option, index) => {
            const selected = String(option.value) === String(current?.value);
            return (
              <button
                key={String(option.value)}
                type="button"
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(option)}
                className={`flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                  index === active ? (tone === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100') : ''
                }`}
              >
                <span>{option.label}</span>
                {selected ? <span aria-hidden="true">✓</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/** Slider component rendered by the player. */
export function Slider(props: LernoComponentProps) {
  const label = asString(props.label, 'Value');
  const tone = props.tone;
  const min = asNumber(props.min, 0);
  const max = asNumber(props.max, 100);
  const step = asNumber(props.step, 1);
  const unit = asString(props.unit);
  const value = asNumber(props.value, min);

  return (
    <label className={`flex min-h-11 flex-col justify-center gap-1.5 rounded-xl border px-3.5 py-2 ${surface(tone)}`}>
      <span className="flex items-baseline justify-between gap-3">
        <span className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${muted(tone)}`}>{label}</span>
        <span className="text-xs font-semibold tabular-nums">
          {value}
          {unit ? ` ${unit}` : ''}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(event) => props.onChange?.(Number(event.target.value))}
        disabled={asBoolean(props.disabled)}
        className={`h-1.5 w-full cursor-pointer ${tone === 'dark' ? 'accent-zinc-100' : 'accent-zinc-900'} ${focus}`}
      />
    </label>
  );
}

interface ReadoutRow {
  label: string;
  value: unknown;
}

function readRows(value: unknown): ReadoutRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const row = entry as { label?: unknown; value?: unknown };
    if (typeof row.label !== 'string') return [];
    return [{ label: row.label, value: row.value }];
  });
}

function displayValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'On' : 'Off';
  if (typeof value === 'number') return value.toLocaleString('en-US');
  if (typeof value === 'string') return value;
  return '-';
}

/** Small card that shows live values over video. */
export function Readout(props: LernoComponentProps) {
  const tone = props.tone;
  const title = asString(props.title, 'Live values');
  const rows = readRows(props.rows);

  return (
    <div className={`rounded-xl border px-3.5 py-3 ${surface(tone)}`}>
      <p className={`m-0 text-[10px] font-semibold uppercase tracking-[0.12em] ${muted(tone)}`}>{title}</p>
      <div className="mt-1.5 flex flex-col gap-1">
        {rows.length === 0 ? (
          <span className={`text-xs ${muted(tone)}`}>Value yok</span>
        ) : (
          rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-4 text-xs">
              <span className={muted(tone)}>{row.label}</span>
              <span className="font-semibold tabular-nums">{displayValue(row.value)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/** Initial set declared by the document; type → component map. */
export const builtinComponents = {
  'ui.switch': Switch,
  'ui.button': Button,
  'ui.select': Select,
  'ui.slider': Slider,
  'lab.readout': Readout,
} as const;

/** `BuiltinComponentType` type. */
export type BuiltinComponentType = keyof typeof builtinComponents;
