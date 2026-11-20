import Dexie, { type Table } from "dexie";
import type { NoteRow } from "./schema";
import { NOTE_STORES } from "./schema";

/**
 * Local-first source of truth. Schema changes are additive versions with an
 * explicit upgrade path; adapters are the only place Dexie is imported.
 */
export class NomlDatabase extends Dexie {
    notes!: Table<NoteRow, string>;

    constructor(name = "noml") {
        super(name);
        this.version(1).stores(NOTE_STORES);
    }
}

export function openDatabase(name?: string): Promise<NomlDatabase> {
    const db = new NomlDatabase(name);
    return db.open().then(() => db);
}
