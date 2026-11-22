'use client';

import type { ReactNode } from 'react';
import { Button, Label, ListBox, Select, Slider, Surface } from '@heroui/react';

/** `ActionVariant` type. */
export type ActionVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'outline' | 'danger';

/** Props accepted by `Panel`. */
export interface PanelProps {
  children: ReactNode;
  className?: string;
}

/**
 * Bordered container that groups a set of controls.
 * @param children - Controls and labels rendered inside the panel.
 * @param className - Extra classes applied to the panel surface.
 */
export function Panel({ children, className }: PanelProps) {
  return (
    <Surface className={`flex flex-col gap-5 rounded-3xl p-5 ${className ?? ''}`} variant="default">
      {children}
    </Surface>
  );
}

/** Props accepted by `ActionButton`. */
export interface ActionButtonProps {
  children: ReactNode;
  onPress: () => void;
  variant?: ActionVariant;
  isDisabled?: boolean;
}

/**
 * Primary button used by lab panels and embedded demos.
 * @param onPress - Handler called when the button is pressed.
 * @param children - Label rendered inside the button.
 * @param variant - Visual weight; ghost is used for secondary actions.
 * @param isDisabled - When true, the button ignores presses.
 */
export function ActionButton({ children, onPress, variant = 'primary', isDisabled = false }: ActionButtonProps) {
  return (
    <Button variant={variant} isDisabled={isDisabled} onPress={onPress}>
      {children}
    </Button>
  );
}

/** Props accepted by `SelectField`. */
export interface SelectFieldProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Dropdown control bound to a string value.
 * @param label - Label rendered above the control.
 * @param value - Currently selected option id.
 * @param options - Choices rendered in the menu.
 * @param onChange - Called with the id of the chosen option.
 * @param className - Extra classes applied to the wrapper.
 */
export function SelectField({ label, value, options, onChange, className }: SelectFieldProps) {
  return (
    <Select className={className ?? 'w-full sm:w-56'} value={value} onChange={(key) => onChange(String(key))}>
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {options.map((option) => (
            <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
              {option.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

/** Props accepted by `RangeField`. */
export interface RangeFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
}

/**
 * Slider control bound to a numeric value.
 * @param label - Label rendered above the control.
 * @param value - Current value.
 * @param min - Lower bound of the range.
 * @param max - Upper bound of the range.
 * @param step - Increment applied per keyboard or drag step.
 * @param onChange - Called with the new value on every change.
 * @param className - Extra classes applied to the wrapper.
 */
export function RangeField({ label, value, min, max, step = 1, onChange, className }: RangeFieldProps) {
  return (
    <Slider
      className={className ?? 'w-full sm:w-64'}
      value={value}
      minValue={min}
      maxValue={max}
      step={step}
      onChange={(next) => onChange(Array.isArray(next) ? next[0] : next)}
    >
      <Label>{label}</Label>
      <Slider.Output />
      <Slider.Track>
        <Slider.Fill />
        <Slider.Thumb />
      </Slider.Track>
    </Slider>
  );
}

/** Props accepted by `Stats`. */
export interface StatsProps {
  items: { label: string; value: string }[];
}

/**
 * Compact readout of live values such as period, angle, or error.
 * @param items - Label and value pairs rendered in order.
 */
export function Stats({ items }: StatsProps) {
  return (
    <div className="flex flex-wrap gap-6">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col gap-0.5">
          <span className="text-xs text-muted">{item.label}</span>
          <span className="text-base font-semibold text-foreground tabular-nums">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
