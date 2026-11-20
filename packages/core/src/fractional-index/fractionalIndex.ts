/** Generates a key that sorts strictly between `prev` and `next`. */
export interface FractionalIndexPort {
    between(prev: string | null, next: string | null): string;
}
