import { Effect } from "effect";
import type { FractionalIndexPort } from "../core/fractional-index/fractionalIndex.port";
import type { Note } from "../core/note/note";
import type { NotePort } from "../core/note/note.port";

/**
 * Note use cases. Every ordering rule lives here; the port only stores rows.
 * `after`/`before` are the notes the new one sits between within `day`.
 */
export interface NoteService {
    read(day: string, offset?: number, limit?: number): Effect.Effect<Note[], Error>;
    create(
        day: string,
        content: string,
        after?: Note | null,
        before?: Note | null,
    ): Effect.Effect<Note, Error>;
    append(day: string, content: string): Effect.Effect<Note, Error>;
    update(id: string, content: string): Effect.Effect<void, Error>;
    move(
        noteId: string,
        toDay: string,
        after?: Note | null,
        before?: Note | null,
    ): Effect.Effect<void, Error>;
    delete(id: string): Effect.Effect<void, Error>;
}

export function makeNoteService(
    notes: NotePort,
    fractionalIndex: FractionalIndexPort,
): NoteService {
    const between = (after?: Note | null, before?: Note | null) =>
        fractionalIndex.between(
            after?.fractionalIndex ?? null,
            before?.fractionalIndex ?? null,
        );

    /**
     * Index for a note placed between `after` and `before` in `day`. With no
     * neighbours the note goes to the start of the day, which needs the day's
     * current first note: the storage key is unique per day, so
     * `between(null, null)` would collide with it.
     */
    const indexFor = (
        day: string,
        after?: Note | null,
        before?: Note | null,
    ) =>
        after || before
            ? Effect.succeed(between(after, before))
            : Effect.map(notes.read(day), (existing) =>
                  between(null, existing[0]),
              );

    return {
        read: (day, offset, limit) => notes.read(day, offset, limit),
        create(day, content, after, before) {
            return Effect.flatMap(indexFor(day, after, before), (index) =>
                notes.create({ day, content, fractionalIndex: index }),
            );
        },
        append(day, content) {
            return Effect.flatMap(notes.read(day), (existing) =>
                notes.create({
                    day,
                    content,
                    fractionalIndex: between(existing.at(-1), null),
                }),
            );
        },
        update: (id, content) => notes.update(id, { content }),
        move(noteId, toDay, after, before) {
            return Effect.flatMap(indexFor(toDay, after, before), (index) =>
                notes.update(noteId, { day: toDay, fractionalIndex: index }),
            );
        },
        delete: (id) => notes.delete(id),
    };
}
