import { Effect } from "effect";
import type { Note } from "./note/note";
import type { NewNote } from "./note/note.port";

export type NoteCreatedEvent = { type: "note.created"; note: Note };
export type NoteUpdatedEvent = { type: "note.updated"; note: Note };
export type NoteDeletedEvent = { type: "note.deleted"; id: string };
export type CaptureRequestedEvent = {
    type: "capture.requested";
    source: string;
    payload: unknown;
};

export type AppEvent =
    | NoteCreatedEvent
    | NoteUpdatedEvent
    | NoteDeletedEvent
    | CaptureRequestedEvent;

export type EventHandler<E extends AppEvent = AppEvent> = (
    event: E,
) => Effect.Effect<void, Error> | void;

export interface EventBus {
    publish<E extends AppEvent>(event: E): Effect.Effect<void, Error>;
    subscribe<E extends AppEvent["type"]>(
        type: E,
        handler: EventHandler<Extract<AppEvent, { type: E }>>,
    ): () => void;
}