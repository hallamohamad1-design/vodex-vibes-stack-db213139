// Short-Term Memory — Circular Queue (FIFO, fixed capacity 50)
// As specified in Echo_3.pdf §2: Algorithm 1
import type { Action, ActionType } from "./types";

export class CircularQueue {
  private buf: (Action | null)[];
  private head = 0;
  private tail = 0;
  private _size = 0;
  readonly capacity: number;

  constructor(capacity = 50) {
    this.capacity = capacity;
    this.buf = new Array(capacity).fill(null);
  }

  enqueue(a: Action) {
    this.buf[this.tail] = a;
    this.tail = (this.tail + 1) % this.capacity;
    if (this._size === this.capacity) {
      // overwrite oldest — advance head (eviction)
      this.head = (this.head + 1) % this.capacity;
    } else {
      this._size++;
    }
  }

  dequeue(): Action | null {
    if (this._size === 0) return null;
    const a = this.buf[this.head]!;
    this.buf[this.head] = null;
    this.head = (this.head + 1) % this.capacity;
    this._size--;
    return a;
  }

  get size() { return this._size; }
  get isFull() { return this._size === this.capacity; }

  toArray(): Action[] {
    const out: Action[] = [];
    for (let i = 0; i < this._size; i++) {
      const a = this.buf[(this.head + i) % this.capacity];
      if (a) out.push(a);
    }
    return out;
  }

  /** Algorithm 2: predict next action by frequency, tiebreak random */
  predictNext(): ActionType | null {
    if (this._size === 0) return null;
    const freq = new Map<ActionType, number>();
    for (const a of this.toArray()) freq.set(a.type, (freq.get(a.type) ?? 0) + 1);
    let max = 0; let candidates: ActionType[] = [];
    freq.forEach((v, k) => {
      if (v > max) { max = v; candidates = [k]; }
      else if (v === max) candidates.push(k);
    });
    return candidates[Math.floor(Math.random() * candidates.length)];
  }
}
