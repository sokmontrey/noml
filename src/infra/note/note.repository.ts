import { Effect } from "effect";
import { db, type NoteRow } from "../db/db";
import type { Note } from "../../core/note/note";
import type { NewNote, NotePatch, NotePort } from "../../core/note/note.port";

function toNote(row: NoteRow): Note {
    return {
        id: row.id,
        day: row.day,
        fractionalIndex: row.fractionalIndex,
        content: row.content,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

const attempt = <A>(work: () => Promise<A>): Effect.Effect<A, Error> =>
    Effect.tryPromise({
        try: work,
        catch: (e) => (e instanceof Error ? e : new Error(String(e))),
    });

export function makeNoteRepository(): NotePort {
    return {
        create(input: NewNote) {
            return attempt(async () => {
                const now = Date.now();
                const row: NoteRow = {
                    id: crypto.randomUUID(),
                    day: input.day,
                    fractionalIndex: input.fractionalIndex,
                    content: input.content,
                    createdAt: now,
                    updatedAt: now,
                };
                await db.notes.add(row);
                return toNote(row);
            });
        },
        listByDay(day) {
            return attempt(async () => {
                const rows = await db.notes
                    .where("[day+fractionalIndex]")
                    .between([day, ""], [day, "\uffff"])
                    .toArray();
                return rows.map(toNote);
            });
        },
        update(id: string, patch: NotePatch) {
            return attempt(async () => {
                await db.notes.update(id, { ...patch, updatedAt: Date.now() });
            });
        },
        delete(id) {
            return attempt(async () => {
                await db.notes.delete(id);
            });
        },
    };
}
