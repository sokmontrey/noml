import type { Effect } from "effect";
import type { NewNote } from "../note/note";
import type { PluginContext } from "../plugin/context";
import type { PluginId } from "../plugin/manifest";

/** Raw input from a keyboard shortcut, share sheet, paste or menu. */
export interface CaptureInput {
    source: string;
    payload: unknown;
}

/**
 * A handler claims input and turns it into a draft. Drafts go through
 * `NoteService.create`, never straight to storage.
 */
export interface CaptureHandler {
    id: string;
    /** Higher runs first. */
    priority: number;
    canHandle(input: CaptureInput): boolean;
    handle(
        input: CaptureInput,
        context: PluginContext,
    ): Effect.Effect<NewNote | null, Error>;
}

/** A handler bound to its plugin context and namespaced id. */
export interface CaptureHandlerRunner {
    pluginId: PluginId;
    id: string;
    priority: number;
    canHandle(input: CaptureInput): boolean;
    handle(input: CaptureInput): Effect.Effect<NewNote | null, Error>;
}

export interface CapturePort {
    handlers(): readonly CaptureHandlerRunner[];
}
