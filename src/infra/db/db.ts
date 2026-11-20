import Dexie, { type Table } from "dexie";
import { type NoteRow, NOTE_STORES } from "./schema";

export { type NoteRow } from "./schema";

export class NomlDb extends Dexie {
    notes!: Table<NoteRow, string>;

    constructor() {
        super("noml");
        this.version(1).stores(NOTE_STORES);
    }
}

export const db = new NomlDb();