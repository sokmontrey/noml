import type { Effect } from "effect";
import type { Note, NewNote } from "../note/note";

/**
 * The capability-scoped note API handed to plugins. Without `notes:read`
 * every method fails; without `notes:write` only reads work.
 */
export interface NoteFacade {
    list(): Effect.Effect<Note[], Error>;
    read(
        day: string,
        offset?: number,
        limit?: number,
    ): Effect.Effect<Note[], Error>;
    create(
        day: string,
        content: string,
        after?: Note | null,
        before?: Note | null,
    ): Effect.Effect<Note, Error>;
    append(day: string, content: string): Effect.Effect<Note, Error>;
    update(id: string, content: string): Effect.Effect<void, Error>;
    move(
        id: string,
        toDay: string,
        after?: Note | null,
        before?: Note | null,
    ): Effect.Effect<void, Error>;
    delete(id: string): Effect.Effect<void, Error>;
}

export type NewNoteDraft = NewNote;
