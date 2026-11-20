import { Data, Effect } from "effect";
import type { Note, NotePatch, NotePort } from "@noml/core";
import type { NomlDatabase } from "./database";
import type { NoteRow } from "./schema";

class NoteRepositoryError extends Data.TaggedError("NoteRepositoryError")<{
    cause: unknown;
}> {}

const attempt = <A>(work: () => Promise<A>): Effect.Effect<A, Error> =>
    Effect.tryPromise({
        try: work,
        catch: (cause) => new NoteRepositoryError({ cause }),
    });

const toNote = (row: NoteRow): Note => ({ ...row });

/** Dexie implementation of `NotePort`. Plain CRUD; ordering lives upstream. */
export function makeNoteRepository(db: NomlDatabase): NotePort {
    return {
        create(note: Note) {
            return attempt(async () => {
                await db.notes.add(note);
            });
        },
        get(id: string) {
            return attempt(async () => {
                const row = await db.notes.get(id);
                return row ? toNote(row) : null;
            });
        },
        read(day, offset = 0, limit) {
            return attempt(async () => {
                let query = db.notes
                    .where("[day+fractionalIndex]")
                    .between([day, ""], [day, "\uffff"]);
                if (offset > 0) query = query.offset(offset);
                if (limit !== undefined) query = query.limit(limit);
                return (await query.toArray()).map(toNote);
            });
        },
        readAll(offset = 0, limit) {
            return attempt(async () => {
                let query = db.notes.orderBy("[day+fractionalIndex]");
                if (offset > 0) query = query.offset(offset);
                if (limit !== undefined) query = query.limit(limit);
                return (await query.toArray()).map(toNote);
            });
        },
        update(id: string, patch: NotePatch) {
            return attempt(async () => {
                await db.notes.update(id, patch);
            });
        },
        delete(id: string) {
            return attempt(async () => {
                await db.notes.delete(id);
            });
        },
    };
}
