import type { Effect } from "effect";
import type { PluginContext } from "../plugin/context";
import type { PluginId } from "../plugin/manifest";

/**
 * A command is the universal entry point: palette, keybinding, menu and
 * automation all dispatch the same id. `when` gates visibility/enabled state.
 */
export interface CommandDefinition {
    id: string;
    title: string;
    category?: string;
    description?: string;
    keybinding?: string;
    when?: () => boolean;
    run: (
        context: PluginContext,
        args?: unknown,
    ) => Effect.Effect<unknown, Error>;
}

export interface RegisteredCommand {
    pluginId: PluginId;
    command: CommandDefinition;
}

export interface CommandDescriptor {
    pluginId: PluginId;
    id: string;
    title: string;
    category?: string;
    description?: string;
    keybinding?: string;
    enabled: boolean;
}

/** Execution boundary. The kernel binds each command to its scoped context. */
export interface CommandPort {
    list(): readonly CommandDescriptor[];
    execute(id: string, args?: unknown): Effect.Effect<unknown, Error>;
}
