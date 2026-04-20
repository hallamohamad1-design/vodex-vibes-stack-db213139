// Long-Term Memory — Stack (LIFO, bounded). Echo_3.pdf §3
import type { Action, ActionType } from "./types";

export class SignatureStack {
  private store: Action[] = [];
  private last: Action | null = null;
  readonly capacity: number;

  constructor(capacity = 32) { this.capacity = capacity; }

  push(a: Action) {
    this.store.push(a);
    if (this.store.length > this.capacity) this.store.shift(); // bounded
  }

  pop(): Action | null { return this.store.pop() ?? null; }
  peek(): Action | null { return this.store[this.store.length - 1] ?? null; }

  get size() { return this.store.length; }
  toArray(): Action[] { return [...this.store]; }

  /** Algorithm 4: pick a signature move different from the last one returned */
  observe(): Action | null {
    if (this.store.length === 0) return null;
    if (this.store.length === 1) { this.last = this.store[0]; return this.store[0]; }
    let a: Action;
    let guard = 0;
    do {
      a = this.store[Math.floor(Math.random() * this.store.length)];
      if (++guard > 20) break;
    } while (this.last && a.type === this.last.type);
    this.last = a;
    return a;
  }

  hasType(t: ActionType): boolean {
    return this.store.some(a => a.type === t);
  }
}
