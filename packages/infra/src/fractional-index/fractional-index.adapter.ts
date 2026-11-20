import { generateKeyBetween } from "fractional-indexing";
import type { FractionalIndexPort } from "@noml/core";

/** Adapter over `fractional-indexing`. Swap the library here, nowhere else. */
export function makeFractionalIndexAdapter(): FractionalIndexPort {
    return {
        between(prev, next) {
            return generateKeyBetween(prev, next);
        },
    };
}
