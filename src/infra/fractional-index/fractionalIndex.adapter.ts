import { generateKeyBetween } from "fractional-indexing";
import type { FractionalIndexPort } from "../../core/fractional-index/fractionalIndex.port";

export function makeFractionalIndexAdapter(): FractionalIndexPort {
    return {
        between(prev, next) {
            return generateKeyBetween(prev, next);
        },
    };
}
