// Central Temporal Echo controller wiring queue + stack + list + tree.
import { CircularQueue } from "./CircularQueue";
import { SignatureStack } from "./Stack";
import { HistoryList } from "./LinkedList";
import { calculateImportance, IMPORTANCE_THRESHOLD } from "./importance";
import { decideCounter } from "./DecisionTree";
import type { Action, ActionType, CounterAction } from "./types";

export interface MemorySnapshot {
  queue: Action[];
  stack: Action[];
  history: Action[];
  predicted: ActionType | null;
  lastCounter: CounterAction | null;
  totalActions: number;
}

type Listener = (s: MemorySnapshot) => void;

export class MirrorMageAI {
  readonly queue = new CircularQueue(50);
  readonly stack = new SignatureStack(32);
  readonly history = new HistoryList();
  private listeners = new Set<Listener>();
  private lastCounter: CounterAction | null = null;
  private totalActions = 0;
  private nextId = 1;

  /** Algorithm 3: ObservePlayerAction */
  observe(partial: Omit<Action, "id" | "importanceScore" | "timestamp">): Action {
    const action: Action = {
      ...partial,
      id: this.nextId++,
      importanceScore: 0,
      timestamp: performance.now(),
    };
    this.queue.enqueue(action);
    this.history.prepend(action);
    action.importanceScore = calculateImportance(action);
    if (action.importanceScore > IMPORTANCE_THRESHOLD) {
      this.stack.push(action);
    }
    this.totalActions++;
    this.emit();
    return action;
  }

  /** Decide the mage's counter for the next tick */
  decide(): CounterAction {
    const predicted = this.queue.predictNext();
    const counter = decideCounter(predicted);
    this.lastCounter = counter;
    this.emit();
    return counter;
  }

  /** Pop a signature move from long-term memory to deploy */
  deploySignature(): Action | null {
    const a = this.stack.observe();
    this.emit();
    return a;
  }

  snapshot(): MemorySnapshot {
    return {
      queue: this.queue.toArray(),
      stack: this.stack.toArray(),
      history: this.history.toArray(20),
      predicted: this.queue.predictNext(),
      lastCounter: this.lastCounter,
      totalActions: this.totalActions,
    };
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => this.listeners.delete(fn);
  }

  private emit() {
    const s = this.snapshot();
    this.listeners.forEach(fn => fn(s));
  }
}

// Singleton — shared across both worlds (per PDF: one AI memory)
export const mageAI = new MirrorMageAI();
