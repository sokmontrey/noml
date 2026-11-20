import type { Note } from './note';

// Port (interface) for persisting and reordering Notes.
// Implementations live in the infrastructure layer.
export interface NotePort {
  create(content: string, day: string, after?: Note, before?: Note): Note;
  appendEnd(day: string, content: string, lastNote: Note): Note;
  insertBetween(day: string, content: string, prev: Note | null, next: Note | null): Note;
  move(noteId: string, toDay: string, after?: Note, before?: Note): void;
  update(id: string, content: string): void;
  delete(id: string): void;
  rebalance(day: string): void;
}
