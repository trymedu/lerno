import { Emitter } from './emitter';

/** Callback invoked when a `Property` value changes. */
export type PropertyListener<T> = (value: T) => void;

/** Options accepted by `Property`. */
export interface PropertyOptions<T> {
  /** Equality check for values. Defaults to `Object.is`. */
  equals?: (a: T, b: T) => boolean;
  /** Optional validator/coercion; returns the value to store. */
  validate?: (value: T) => T;
}

/**
 * Observable value that drives the scene graph.
 * The view subscribes through link, so a change in the model updates the view
 * without touching it. Simplified from the PhET axon Property.
 */
export class Property<T> {
  private _value: T;
  private readonly _initial: T;
  private readonly equalsFn: (a: T, b: T) => boolean;
  private readonly validateFn?: (value: T) => T;
  private readonly emitter = new Emitter<[T]>();

  /**
   * Creates a changeable value.
   * @param value - Initial value stored until the first write.
   * @param options - Equality function deciding whether listeners fire.
   */
  constructor(value: T, options: PropertyOptions<T> = {}) {
    this._value = options.validate ? options.validate(value) : value;
    this._initial = this._value;
    this.equalsFn = options.equals ?? ((a, b) => Object.is(a, b));
    this.validateFn = options.validate;
  }

  /**
   * Reads the current value.
   * @returns The value last written to the property.
   */
  get(): T {
    return this._value;
  }

  /**
   * Reads the current value through accessor syntax.
   * @returns The value last written to the property.
   */
  get value(): T {
    return this._value;
  }

  /**
   * Writes a new value through accessor syntax.
   * @param next - Value to store; listeners fire when it differs from the current one.
   */
  set value(next: T) {
    this.set(next);
  }

  /**
   * Writes a new value and notifies listeners.
   * Listeners are skipped when the new value equals the current one, so redundant
   * writes do not propagate through the scene graph.
   * @param next - Value to store.
   */
  set(next: T): void {
    const validated = this.validateFn ? this.validateFn(next) : next;
    if (this.equalsFn(this._value, validated)) return;
    this._value = validated;
    this.emitter.emit(this._value);
  }

  /**
   * Restores the value the property was created with.
   */
  reset(): void {
    this.set(this._initial);
  }

  /**
   * The value the property was created with, before any write.
   */
  get initial(): T {
    return this._initial;
  }

  /**
   * Subscribes a listener and calls it immediately with the current value.
   * The immediate call lets a subscriber render without reading the value first.
   * @param listener - Called on every change after this call.
   * @returns A function that unsubscribes the listener.
   */
  link(listener: PropertyListener<T>): () => void {
    const unsubscribe = this.emitter.addListener(listener);
    listener(this._value);
    return unsubscribe;
  }

  /**
   * Subscribes a listener without the immediate call.
   * Derived values use this so construction does not emit a redundant update.
   * @param listener - Called only when the value changes.
   * @returns A function that unsubscribes the listener.
   */
  lazyLink(listener: PropertyListener<T>): () => void {
    return this.emitter.addListener(listener);
  }

  /**
   * Removes a listener.
   * @param listener - Listener to remove; unknown listeners are ignored.
   */
  unlink(listener: PropertyListener<T>): void {
    this.emitter.removeListener(listener);
  }

  /**
   * Number of listeners currently subscribed to this property.
   */
  get listenerCount(): number {
    return this.emitter.listenerCount;
  }

  /**
   * Drops every listener and stops the property from notifying again.
   */
  dispose(): void {
    this.emitter.dispose();
  }
}

/**
 * Read-only property recomputed from other properties.
 * Each dependency is linked lazily, so construction emits no change.
 */
export class DerivedProperty<T, Values extends readonly unknown[] = readonly unknown[]> extends Property<T> {
  private readonly cleanups: (() => void)[];

  /**
   * Creates a derived value.
   * @param dependencies - Properties read to compute the value, in tuple order.
   * @param derive - Pure function producing the value from the dependency values.
   */
  constructor(
    dependencies: { readonly [K in keyof Values]: Property<Values[K]> },
    derive: (values: Values) => T,
  ) {
    const deps = dependencies as readonly Property<unknown>[];

    // Reading a mapped tuple back as a tuple is the single unavoidable assertion in this file;
    // it is confined to `readValues`, so every other call site stays fully typed.
    const readValues = (): Values => deps.map((dependency) => dependency.get()) as unknown as Values;

    super(derive(readValues()));

    const recompute = () => {
      this.set(derive(readValues()));
    };

    this.cleanups = deps.map((dependency) => dependency.lazyLink(recompute));

    const baseDispose = this.dispose.bind(this);
    this.dispose = () => {
      for (const cleanup of this.cleanups) cleanup();
      baseDispose();
    };
  }
}

/** Helper for long-lived observable model parts. */
export abstract class PhetioObject {
  private disposed = false;

  /**
   * True once dispose has been called on this property.
   */
  get isDisposed(): boolean {
    return this.disposed;
  }

  /**
   * Drops the dependency subscriptions and every listener.
   */
  dispose(): void {
    this.disposed = true;
  }
}
