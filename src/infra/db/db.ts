import Dexie, { type Table } from "dexie";

export interface NoteRow {
    id: string;
    day: string;
    fractionalIndex: string;
    content: string;
    createdAt: number;
    updatedAt: number;
}

export class NomlDb extends Dexie {
    notes!: Table<NoteRow, string>;

    constructor() {
        super("noml");
        this.version(1).stores({
            notes: "id, day, fractionalIndex, &[day+fractionalIndex], [day+fractionalIndex], createdAt, updatedAt",
        });
    }
}

export const db = new NomlDb();
