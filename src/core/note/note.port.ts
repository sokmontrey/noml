import { Effect } from "effect";
import type { Note } from "./note";

export interface NotePort {
    create(
        content: string,
        day: string,
        after?: Note,
        before?: Note,
    ): Effect.Effect<Note, Error>;
    appendEnd(
        day: string,
        content: string,
        lastNote: Note,
    ): Effect.Effect<Note, Error>;
    insertBetween(
        day: string,
        content: string,
        prev: Note | null,
        next: Note | null,
    ): Effect.Effect<Note, Error>;
    move(
        noteId: string,
        toDay: string,
        after?: Note,
        before?: Note,
    ): Effect.Effect<void, Error>;
    update(id: string, content: string): Effect.Effect<void, Error>;
    delete(id: string): Effect.Effect<void, Error>;
    rebalance(day: string): Effect.Effect<void, Error>;
}
