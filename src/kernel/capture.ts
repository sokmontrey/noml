import { Effect } from "effect";
import type { CaptureInput, PluginContext } from "../core/plugin-api";
import type { NotePort, NewNote } from "../core/note/note.port";
import type { PluginRegistry } from "./plugin-registry";

export function runCapture(
    registry: PluginRegistry,
    contextFactory: (pluginId: string) => PluginContext,
    input: CaptureInput,
) {
    return Effect.gen(function* () {
        for (const plugin of registry.list()) {
            const handlers = plugin.contributions?.captureHandlers ?? [];
            for (const handler of handlers) {
                const context = contextFactory(plugin.manifest.id);
                const draft = yield* handler(input, context);
                if (draft) return draft;
            }
        }
        return null as NewNote | null;
    });
}