import { Effect } from "effect";
import {
    CommandError,
    PluginError,
    type CapturePort,
    type CommandPort,
    type PluginId,
} from "@noml/core";
import type { ContributionCatalog } from "./registry/contribution-catalog";
import type { PluginContextFactory } from "./context/plugin-context";

/** Binds catalog commands to the owning plugin's scoped context. */
export function makeCommandPort(
    catalog: ContributionCatalog,
    contexts: PluginContextFactory,
): CommandPort {
    return {
        list() {
            return catalog.commands().map(({ pluginId, value }) => {
                let enabled = true;
                try {
                    enabled = value.when ? value.when() : true;
                } catch {
                    enabled = false;
                }
                return {
                    pluginId,
                    id: value.id,
                    title: value.title,
                    category: value.category,
                    description: value.description,
                    keybinding: value.keybinding,
                    enabled,
                };
            });
        },
        execute(id: string, args?: unknown) {
            const entry = catalog.command(id);
            if (!entry) {
                return Effect.fail(
                    new CommandError({
                        commandId: id,
                        message: "Unknown command",
                    }),
                );
            }
            if (entry.value.when && !entry.value.when()) {
                return Effect.fail(
                    new CommandError({
                        commandId: id,
                        message: "Command is currently disabled",
                    }),
                );
            }
            return Effect.flatMap(
                Effect.sync(() => contexts.get(entry.pluginId)),
                (context) => entry.value.run(context, args),
            );
        },
    };
}

/** Binds capture handlers to their owning plugin's scoped context. */
export function makeCapturePort(
    catalog: ContributionCatalog,
    contexts: PluginContextFactory,
): CapturePort {
    return {
        handlers() {
            return catalog.captureHandlers().map(({ pluginId, value }) => ({
                pluginId,
                id: value.id,
                priority: value.priority,
                canHandle: (input: Parameters<typeof value.canHandle>[0]) => {
                    try {
                        return value.canHandle(input);
                    } catch {
                        return false;
                    }
                },
                handle: (input: Parameters<typeof value.handle>[0]) =>
                    Effect.flatMap(
                        Effect.sync(() => contexts.get(pluginId)),
                        (context) => value.handle(input, context),
                    ),
            }));
        },
    };
}

/** Resolver that never throws, for optional inter-plugin services. */
export function makeServiceLookup(services: Map<string, unknown>): {
    get<T>(name: string): T | undefined;
} {
    return {
        get<T>(name: string): T | undefined {
            return services.get(name) as T | undefined;
        },
    };
}

export function assertPluginContext(
    contexts: PluginContextFactory,
    pluginId: PluginId,
): void {
    if (!contexts.has(pluginId)) {
        throw new PluginError({
            pluginId,
            message: "Plugin context is not available",
        });
    }
}
