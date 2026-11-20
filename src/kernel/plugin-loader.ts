import { Effect } from "effect";
import type { Plugin, PluginContext, PluginId } from "../core/plugin-api";
import type { PluginRegistry } from "./plugin-registry";

export interface PluginLoaderOptions {
    registry: PluginRegistry;
    createContext: (pluginId: PluginId) => PluginContext;
}

export function loadPlugins(options: PluginLoaderOptions) {
    const { registry, createContext } = options;
    const plugins = registry.list();
    const loaded = new Set<PluginId>();

    const loadOne = (plugin: Plugin): Effect.Effect<void, Error> =>
        Effect.gen(function* () {
            for (const dep of plugin.manifest.dependencies ?? []) {
                const dependency = registry.get(dep);
                if (!dependency) {
                    return yield* Effect.fail(
                        new Error(`Missing dependency ${dep} for ${plugin.manifest.id}`),
                    );
                }
                if (!loaded.has(dep)) {
                    yield* loadOne(dependency);
                }
            }
            const context = createContext(plugin.manifest.id);
            yield* plugin.setup(context);
            loaded.add(plugin.manifest.id);
        });

    return Effect.forEach(plugins, loadOne, { concurrency: 1 }).pipe(
        Effect.asVoid,
    );
}

export function unloadPlugins(options: PluginLoaderOptions) {
    const { registry, createContext } = options;
    return Effect.forEach(
        [...registry.list()].reverse(),
        (plugin) =>
            plugin.teardown
                ? plugin.teardown(createContext(plugin.manifest.id))
                : Effect.void,
        { concurrency: 1 },
    ).pipe(Effect.asVoid);
}