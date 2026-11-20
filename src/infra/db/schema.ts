export interface NoteRow {
    id: string;
    day: string;
    fractionalIndex: string;
    content: string;
    createdAt: number;
    updatedAt: number;
}

export const NOTE_STORES = {
    notes: "id, day, fractionalIndex, &[day+fractionalIndex], [day+fractionalIndex], createdAt, updatedAt",
};