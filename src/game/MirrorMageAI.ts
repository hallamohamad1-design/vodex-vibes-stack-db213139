// Central Temporal Echo controller wiring queue + stack + list + tree.
// Per-world instances are exposed via getMageAI(world).
import { CircularQueue } from "./CircularQueue";
import { SignatureStack } from "./Stack";
import { HistoryList } from "./LinkedList";
import { calculateImportance, IMPORTANCE_THRESHOLD } from "./importance";
import { decideCounter } from "./DecisionTree";
import type { Action, ActionType, CounterAction, EnemyEvent, WorldId } from "./types";

export interface MemorySnapshot {
  queue: Action[];
  stack: Action[];
  history: Action[];
  events: EnemyEvent[];
  predicted: ActionType | null;
  lastCounter: CounterAction | null;
  totalActions: number;
  signatureMoves: number;
  kills: number;
  maxCombo: number;
}

type Listener = (s: MemorySnapshot) => void;
type EventListener = (e: EnemyEvent) => void;

export class MirrorMageAI {
  readonly queue = new CircularQueue(50);
  readonly stack = new SignatureStack(32);
  readonly history = new HistoryList();
  private events: EnemyEvent[] = [];
  private listeners = new Set<Listener>();
  private eventListeners = new Set<EventListener>();
  private lastCounter: CounterAction | null = null;
  private totalActions = 0;
  private signatureMoves = 0;
  private kills = 0;
  private maxCombo = 0;
  private nextId = 1;
  private nextEventId = 1;

  constructor(public readonly world: WorldId) {}

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
    if (action.type === "KILL") this.kills++;
    if (action.comboCount > this.maxCombo) this.maxCombo = action.comboCount;
    this.totalActions++;
    this.emit();
    return action;
  }

  /** Decide the mage's counter for the next tick */
  decide(): CounterAction {
    const predicted = this.queue.predictNext();
    const counter = decideCounter(predicted);
    this.lastCounter = counter;
    this.pushEvent({ predicted, counter, source: "queue" });
    this.emit();
    return counter;
  }

  /** Pop a signature move from long-term memory to deploy as a regressive replay */
  deploySignature(): Action | null {
    const a = this.stack.observe();
    if (a) {
      this.signatureMoves++;
      this.pushEvent({ predicted: a.type, counter: "REGRESS", source: "stack" });
    }
    this.emit();
    return a;
  }

  private pushEvent(p: Omit<EnemyEvent, "id" | "timestamp">) {
    const e: EnemyEvent = { ...p, id: this.nextEventId++, timestamp: performance.now() };
    this.events.push(e);
    if (this.events.length > 16) this.events.shift();
    this.eventListeners.forEach(fn => fn(e));
  }

  /** Hydrate memory from a persisted snapshot. */
  hydrate(payload: { queue?: Action[]; stack?: Action[]; history?: Action[]; total?: number }) {
    payload.queue?.forEach(a => this.queue.enqueue(a));
    payload.stack?.forEach(a => this.stack.push(a));
    payload.history?.slice().reverse().forEach(a => this.history.prepend(a));
    if (payload.total) this.totalActions = payload.total;
    // recompute id counter to avoid collisions
    const maxId = Math.max(
      0,
      ...(payload.queue ?? []).map(a => a.id),
      ...(payload.stack ?? []).map(a => a.id),
      ...(payload.history ?? []).map(a => a.id),
    );
    this.nextId = maxId + 1;
    this.emit();
  }

  snapshot(): MemorySnapshot {
    return {
      queue: this.queue.toArray(),
      stack: this.stack.toArray(),
      history: this.history.toArray(20),
      events: [...this.events],
      predicted: this.queue.predictNext(),
      lastCounter: this.lastCounter,
      totalActions: this.totalActions,
      signatureMoves: this.signatureMoves,
      kills: this.kills,
      maxCombo: this.maxCombo,
    };
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => { this.listeners.delete(fn); };
  }

  subscribeEvents(fn: EventListener): () => void {
    this.eventListeners.add(fn);
    return () => { this.eventListeners.delete(fn); };
  }

  private emit() {
    const s = this.snapshot();
    this.listeners.forEach(fn => fn(s));
  }
}

// Per-world singletons (one mage per world keeps memory isolated for persistence)
const instances = new Map<WorldId, MirrorMageAI>();
export function getMageAI(world: WorldId): MirrorMageAI {
  let inst = instances.get(world);
  if (!inst) { inst = new MirrorMageAI(world); instances.set(world, inst); }
  return inst;
}

// Backwards-compatible default singleton (used by legacy components on hub)
export const mageAI = getMageAI("vodex");
