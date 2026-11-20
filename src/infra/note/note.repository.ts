import { Effect } from "effect";
import { db, type NoteRow } from "../db/db";
import { makeFractionalIndexAdapter } from "../fractional-index/fractionalIndex.adapter";
import type { FractionalIndexPort } from "../../core/fractional-index/fractionalIndex.port";
import type { Note } from "../../core/note/note";
import type { NotePort } from "../../core/note/note.port";

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

export function makeNoteRepository(
    fractionalIndex: FractionalIndexPort = makeFractionalIndexAdapter(),
): NotePort {
    const between = (prev: string | null, next: string | null) =>
        fractionalIndex.between(prev, next);
    return {
        create(content, day, after, before) {
            return Effect.tryPromise({
                try: async () => {
                    const now = Date.now();
                    const row: NoteRow = {
                        id: crypto.randomUUID(),
                        day,
                        fractionalIndex: between(
                            after?.fractionalIndex ?? null,
                            before?.fractionalIndex ?? null,
                        ),
                        content,
                        createdAt: now,
                        updatedAt: now,
                    };
                    await db.notes.add(row);
                    return toNote(row);
                },
                catch: (e) => (e instanceof Error ? e : new Error(String(e))),
            });
        },
        appendEnd(day, content, lastNote) {
            return Effect.tryPromise({
                try: async () => {
                    const now = Date.now();
                    const row: NoteRow = {
                        id: crypto.randomUUID(),
                        day,
                        fractionalIndex: between(
                            lastNote.fractionalIndex,
                            null,
                        ),
                        content,
                        createdAt: now,
                        updatedAt: now,
                    };
                    await db.notes.add(row);
                    return toNote(row);
                },
                catch: (e) => (e instanceof Error ? e : new Error(String(e))),
            });
        },
        insertBetween(day, content, prev, next) {
            return Effect.tryPromise({
                try: async () => {
                    const now = Date.now();
                    const row: NoteRow = {
                        id: crypto.randomUUID(),
                        day,
                        fractionalIndex: between(
                            prev?.fractionalIndex ?? null,
                            next?.fractionalIndex ?? null,
                        ),
                        content,
                        createdAt: now,
                        updatedAt: now,
                    };
                    await db.notes.add(row);
                    return toNote(row);
                },
                catch: (e) => (e instanceof Error ? e : new Error(String(e))),
            });
        },
        move(noteId, toDay, after, before) {
            return Effect.tryPromise({
                try: async () => {
                    const idx = between(
                        after?.fractionalIndex ?? null,
                        before?.fractionalIndex ?? null,
                    );
                    await db.notes.update(noteId, {
                        day: toDay,
                        fractionalIndex: idx,
                        updatedAt: Date.now(),
                    });
                },
                catch: (e) => (e instanceof Error ? e : new Error(String(e))),
            });
        },
        update(id, content) {
            return Effect.tryPromise({
                try: async () => {
                    await db.notes.update(id, {
                        content,
                        updatedAt: Date.now(),
                    });
                },
                catch: (e) => (e instanceof Error ? e : new Error(String(e))),
            });
        },
        delete(id) {
            return Effect.tryPromise({
                try: async () => {
                    await db.notes.delete(id);
                },
                catch: (e) => (e instanceof Error ? e : new Error(String(e))),
            });
        },
        rebalance(day) {
            return Effect.tryPromise({
                try: async () => {
                    const rows = await db.notes
                        .where("[day+fractionalIndex]")
                        .between([day, ""], [day, "\uffff"])
                        .toArray();
                    // Reassign evenly spaced indices.
                    const step = 1;
                    let cur: string | null = null;
                    for (const r of rows) {
                        const next = between(cur, null);
                        cur = next;
                        await db.notes.update(r.id, { fractionalIndex: next });
                    }
                    // Note: this simple rebalance just appends; a better impl would space evenly.
                    void step;
                },
                catch: (e) => (e instanceof Error ? e : new Error(String(e))),
            });
        },
    };
}
