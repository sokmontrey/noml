import type { Effect } from "effect";

/**
 * Domain entity. Pure data + invariants; the port below describes storage but
 * performs no I/O itself.
 *
 * `day` and `fractionalIndex` form the storage key, so they always move
 * together. `fractionalIndex` orders notes within a day.
 */
export interface Note {
    id: string;
    day: string;
    fractionalIndex: string;
    content: string;
    createdAt: number;
    updatedAt: number;
}

/** Fields a caller supplies when creating a note. */
export interface NewNote {
    day: string;
    content: string;
}

/** Partial change. `day` and `fractionalIndex` must be paired by the service. */
export interface NotePatch {
    day?: string;
    fractionalIndex?: string;
    content?: string;
    updatedAt?: number;
}

/** A note can only be placed inside a day it does not belong to yet. */
export function assertValidDay(day: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
        throw new Error(`Invalid day "${day}", expected YYYY-MM-DD`);
    }
}

export function today(now = new Date()): string {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const date = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${date}`;
}

/**
 * Storage only. Ordering decisions (where a note goes, when to rebalance)
 * belong to `NoteService`, so the port stays plain CRUD. The service supplies
 * id and timestamps, which keeps adapters dumb and tests deterministic.
 */
export interface NotePort {
    create(note: Note): Effect.Effect<void, Error>;
    get(id: string): Effect.Effect<Note | null, Error>;
    read(
        day: string,
        offset?: number,
        limit?: number,
    ): Effect.Effect<Note[], Error>;
    readAll(offset?: number, limit?: number): Effect.Effect<Note[], Error>;
    update(id: string, patch: NotePatch): Effect.Effect<void, Error>;
    delete(id: string): Effect.Effect<void, Error>;
}
