import { Effect } from "effect";
import type { CaptureInput, CapturePort, LoggerPort, Note } from "@noml/core";
import type { NoteService } from "../note/note.service";

export interface CaptureServiceDeps {
    capture: CapturePort;
    notes: NoteService;
    logger?: LoggerPort;
}

export interface CaptureService {
    /** Routes input through handlers by priority; returns the created note. */
    capture(input: CaptureInput): Effect.Effect<Note | null, Error>;
}

/**
 * Capture is a router over plugin handlers. The first valid, non-empty draft
 * wins and then goes through `NoteService.create`, the same path as a manual
 * note. Capture never writes to storage directly.
 */
export function makeCaptureService(deps: CaptureServiceDeps): CaptureService {
    const { capture, notes, logger } = deps;

    return {
        capture(input: CaptureInput): Effect.Effect<Note | null, Error> {
            return Effect.gen(function* () {
                for (const handler of capture.handlers()) {
                    if (!handler.canHandle(input)) continue;

                    const draft = yield* handler.handle(input).pipe(
                        Effect.catch((error) => {
                            logger?.warn(
                                `capture handler failed: ${handler.id}`,
                                error,
                            );
                            return Effect.succeed(null);
                        }),
                    );

                    if (!draft || !draft.content.trim()) continue;
                    return yield* notes.create(draft.day, draft.content);
                }
                return null;
            });
        },
    };
}
