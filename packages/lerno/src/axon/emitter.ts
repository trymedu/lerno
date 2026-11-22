/**
 * Minimal synchronous event source used by properties and sessions.
 * Listeners are called in registration order and the emitter never keeps a
 * reference to its owners, so disposal is the listener's responsibility.
 */
export class Emitter<Args extends unknown[] = []> {
  private readonly listeners = new Set<(...args: Args) => void>();

  /**
   * Calls every listener with the given arguments.
   * A listener removed during the call is not invoked in that same emission.
   * @param args - Arguments forwarded to each listener.
   */
  emit(...args: Args): void {
    for (const listener of [...this.listeners]) listener(...args);
  }

  /**
   * Registers a listener.
   * @param listener - Function called on every emission.
   * @returns A function that removes this listener.
   */
  addListener(listener: (...args: Args) => void): () => void {
    this.listeners.add(listener);
    return () => this.removeListener(listener);
  }

  /**
   * Removes a listener.
   * @param listener - Listener to remove; unknown listeners are ignored.
   */
  removeListener(listener: (...args: Args) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Number of listeners currently registered.
   */
  get listenerCount(): number {
    return this.listeners.size;
  }

  /**
   * Drops every listener so the emitter can be garbage collected safely.
   */
  dispose(): void {
    this.listeners.clear();
  }
}
