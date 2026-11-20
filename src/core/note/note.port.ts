import { Effect } from "effect";
import type { Note } from "./note";

/** Fields the caller supplies; the adapter owns id/timestamps. */
export interface NewNote {
    day: string;
    fractionalIndex: string;
    content: string;
}

/**
 * `day` and `fractionalIndex` belong together: moving a note to another day
 * must also give it an index in that day's sequence.
 */
export interface NotePatch {
    day?: string;
    fractionalIndex?: string;
    content?: string;
}

/**
 * Storage only. Ordering decisions (where a note goes, when to rebalance)
 * are the note service's job, so the port stays plain CRUD.
 */
export interface NotePort {
    create(input: NewNote): Effect.Effect<Note, Error>;
    read(day: string, offset?: number, limit?: number): Effect.Effect<Note[], Error>;
    update(id: string, patch: NotePatch): Effect.Effect<void, Error>;
    delete(id: string): Effect.Effect<void, Error>;
}
