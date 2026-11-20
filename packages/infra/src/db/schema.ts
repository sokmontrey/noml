import type { Note } from "@noml/core";

/** Row shape persisted by Dexie. Kept identical to the domain entity. */
export type NoteRow = Note;

/**
 * Indexes:
 * - `id` primary key
 * - `day` for day queries
 * - `&[day+fractionalIndex]` enforces ordering uniqueness inside a day and
 *   doubles as the ordered range index used by day reads
 */
export const NOTE_STORES = {
    notes: "id, day, fractionalIndex, &[day+fractionalIndex], createdAt, updatedAt",
} as const;
