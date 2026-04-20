// Player History — singly linked list, newest-first. Echo_3.pdf §4
import type { Action } from "./types";

interface Node { action: Action; next: Node | null; }

export class HistoryList {
  private head: Node | null = null;
  private _length = 0;

  prepend(a: Action) {
    this.head = { action: a, next: this.head };
    this._length++;
  }

  latestType(): string {
    return this.head ? this.head.action.type : "UNKNOWN";
  }

  get length() { return this._length; }

  toArray(limit = 30): Action[] {
    const out: Action[] = [];
    let n = this.head;
    while (n && out.length < limit) { out.push(n.action); n = n.next; }
    return out;
  }
}
