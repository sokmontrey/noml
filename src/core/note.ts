// Core domain model for a Note.
// Notes are grouped into day-buckets (derived from createdAt).
// Within a single day, ordering is determined by fractionalIndex.

export interface Note {
  id: string;
  day: string;              // "YYYY-MM-DD" bucket derived from createdAt
  fractionalIndex: string;   // lexicographic position within `day`
  content: string;
  createdAt: number;        // epoch ms
  updatedAt: number;        // epoch ms
}
