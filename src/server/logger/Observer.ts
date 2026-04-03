// ─── Observer pattern — port of libcpp/core/observer.hpp ─────────────────────
// Generic Observer<TEvent>: subscribe lambdas to named events, notify all.
// Direct TypeScript equivalent of the C++ template class.

export type SubscriptionId = number;

/**
 * Observer<TEvent> — subscribe callbacks to string-keyed events.
 * Port of libcpp::core::Observer<TEvent>.
 *
 * Usage:
 *   const obs = new Observer<QueryEvent>();
 *   obs.subscribe('query', (evt) => console.log(evt));
 *   obs.notify('query', { ... });
 */
export class Observer<TEvent> {
  private _listeners = new Map<string, Map<SubscriptionId, (event: TEvent) => void>>();
  private _nextId: SubscriptionId = 0;

  /** Subscribe a callback to a named event. Returns an ID for unsubscribing. */
  subscribe(event: string, callback: (evt: TEvent) => void): SubscriptionId {
    const id = this._nextId++;
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Map());
    }
    this._listeners.get(event)!.set(id, callback);
    return id;
  }

  /** Remove a specific subscription. */
  unsubscribe(event: string, id: SubscriptionId): void {
    this._listeners.get(event)?.delete(id);
  }

  /** Remove all subscriptions for an event. */
  unsubscribeAll(event: string): void {
    this._listeners.delete(event);
  }

  /** Notify all subscribers of an event with the given payload. */
  notify(event: string, payload: TEvent): void {
    const listeners = this._listeners.get(event);
    if (!listeners) return;
    for (const [, cb] of listeners) {
      cb(payload);
    }
  }

  /** Count active listeners for an event. */
  listenerCount(event: string): number {
    return this._listeners.get(event)?.size ?? 0;
  }
}
