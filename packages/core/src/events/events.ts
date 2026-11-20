import type { Effect } from "effect";
import type { Note } from "../note/note";

/** Past-tense facts, published only after the write committed. */
export type NoteCreatedEvent = { type: "note.created"; note: Note };
export type NoteUpdatedEvent = { type: "note.updated"; note: Note };
export type NoteDeletedEvent = { type: "note.deleted"; id: string };

/** An intent: asks the system to do something, routed to handlers. */
export type CaptureRequestedEvent = {
    type: "capture.requested";
    source: string;
    payload: unknown;
};

/** Events declared by plugins must be namespaced by the owning plugin id. */
export type PluginEvent = { type: `${string}.${string}`; payload?: unknown };

export type AppEvent =
    | NoteCreatedEvent
    | NoteUpdatedEvent
    | NoteDeletedEvent
    | CaptureRequestedEvent;

export type BusEvent = AppEvent | PluginEvent;

export type EventHandler<E extends BusEvent = BusEvent> = (
    event: E,
) => Effect.Effect<void, Error> | void;

/**
 * Typed pub/sub. Implementations must isolate handler failures: one broken
 * subscriber may never stop delivery to the others.
 */
export interface EventBusPort {
    publish(event: BusEvent): Effect.Effect<void, Error>;
    subscribe<T extends BusEvent["type"] = AppEvent["type"]>(
        type: T,
        handler: EventHandler<
            T extends AppEvent["type"]
                ? Extract<AppEvent, { type: T }>
                : BusEvent
        >,
    ): () => void;
}

/** What a plugin sees: public events in, namespaced events out. */
export interface ScopedEventBus {
    subscribe<T extends BusEvent["type"] = AppEvent["type"]>(
        type: T,
        handler: EventHandler<
            T extends AppEvent["type"]
                ? Extract<AppEvent, { type: T }>
                : BusEvent
        >,
    ): () => void;
    emit(event: PluginEvent): Effect.Effect<void, Error>;
}
