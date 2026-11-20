import { Cause, Effect } from "effect";
import {
    CAPABILITIES,
    type Capability,
    type Plugin,
    type PluginId,
    type LoggerPort,
} from "@noml/core";
import type { ContributionCatalog } from "../registry/contribution-catalog";
import type { PluginRegistry } from "../registry/plugin-registry";
import type { PluginContextFactory } from "../context/plugin-context";
import type { EventBusPort } from "@noml/core";
import { satisfies } from "../version";

export interface PluginRuntimeOptions {
    registry: PluginRegistry;
    catalog: ContributionCatalog;
    contexts: PluginContextFactory;
    events: EventBusPort;
    logger: LoggerPort;
    apiVersion: string;
}

export interface PluginFailure {
    pluginId: PluginId;
    reason: string;
}

export interface LoadReport {
    loaded: PluginId[];
    failed: PluginFailure[];
}

const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

const describeError = (error: unknown): string => {
    if (error && typeof error === "object") {
        const record = error as Record<string, unknown>;
        if (typeof record.message === "string" && record.message.trim()) {
            return record.message;
        }
        const fields = Object.entries(record)
            .filter(([, value]) => value !== undefined)
            .map(([key, value]) => `${key}: ${String(value)}`)
            .join(", ");
        if (fields) return fields;
    }
    return String(error);
};

function validateManifest(plugin: Plugin, apiVersion: string): string | null {
    const manifest = plugin.manifest;
    if (!ID_PATTERN.test(manifest.id)) {
        return `Invalid plugin id "${manifest.id}"`;
    }
    if (!manifest.name.trim()) return "Plugin name is required";
    if (!satisfies(manifest.version, "*")) {
        return `Invalid plugin version "${manifest.version}"`;
    }
    if (!satisfies(apiVersion, manifest.apiVersion)) {
        return `Plugin API ${manifest.apiVersion} does not accept host ${apiVersion}`;
    }
    for (const capability of manifest.capabilities) {
        if (!CAPABILITIES.includes(capability as Capability)) {
            return `Unknown capability "${capability}"`;
        }
    }
    return null;
}

interface Plan {
    order: PluginId[];
    failures: PluginFailure[];
}

/**
 * Validates manifests and sorts plugins so dependencies load first. Invalid,
 * missing, version-mismatched and circular dependencies fail that plugin
 * (and anything that needs it) without touching the rest of the graph.
 */
function planLoad(registry: PluginRegistry, apiVersion: string): Plan {
    const failures: PluginFailure[] = [];
    const order: PluginId[] = [];
    const state = new Map<PluginId, "visiting" | "done" | "failed">();
    const failed = new Set<PluginId>();

    const fail = (pluginId: PluginId, reason: string) => {
        if (failed.has(pluginId)) return;
        failed.add(pluginId);
        state.set(pluginId, "failed");
        failures.push({ pluginId, reason });
    };

    const visit = (plugin: Plugin): void => {
        const pluginId = plugin.manifest.id;
        const current = state.get(pluginId);
        if (current === "done") return;
        if (current === "visiting") {
            fail(pluginId, "Circular dependency detected");
            return;
        }
        if (current === "failed") return;

        const invalid = validateManifest(plugin, apiVersion);
        if (invalid) {
            fail(pluginId, invalid);
            return;
        }

        state.set(pluginId, "visiting");
        for (const [depId, range] of Object.entries(
            plugin.manifest.dependencies ?? {},
        )) {
            const dependency = registry.get(depId);
            if (!dependency) {
                fail(pluginId, `Missing dependency "${depId}"`);
                return;
            }
            visit(dependency);
            if (failed.has(depId)) {
                fail(pluginId, `Dependency "${depId}" failed to load`);
                return;
            }
            if (!satisfies(dependency.manifest.version, range)) {
                fail(
                    pluginId,
                    `Dependency "${depId}"@${dependency.manifest.version} does not satisfy "${range}"`,
                );
                return;
            }
        }

        state.set(pluginId, "done");
        order.push(pluginId);
    };

    for (const plugin of registry.list()) visit(plugin);
    return { order, failures };
}

/**
 * Loads every registered plugin exactly once, in dependency order, isolating
 * failures. The returned promise never rejects: startup continues even when a
 * plugin is broken.
 */
export function loadPlugins(
    options: PluginRuntimeOptions,
): Effect.Effect<LoadReport, never> {
    const { registry, catalog, contexts, logger, apiVersion } = options;

    return Effect.suspend(() => {
        const { order, failures } = planLoad(registry, apiVersion);
        const loaded: PluginId[] = [];
        const failed = [...failures];
        const loadedSet = new Set<PluginId>();

        const loadOne = (pluginId: PluginId): Effect.Effect<void, never> => {
            const plugin = registry.get(pluginId);
            if (!plugin) {
                failed.push({
                    pluginId,
                    reason: "Plugin disappeared before setup",
                });
                return Effect.void;
            }

            const brokenDependency = Object.keys(
                plugin.manifest.dependencies ?? {},
            ).find((dep) => !loadedSet.has(dep));
            if (brokenDependency) {
                failed.push({
                    pluginId,
                    reason: `Dependency "${brokenDependency}" is unavailable`,
                });
                return Effect.void;
            }

            const setup = Effect.suspend(() => {
                const context = contexts.get(pluginId);
                return plugin.setup(context);
            });

            return setup.pipe(
                Effect.tap(() =>
                    Effect.sync(() => {
                        loadedSet.add(pluginId);
                        loaded.push(pluginId);
                        logger.info(`plugin loaded: ${pluginId}`);
                    }),
                ),
                Effect.catchCause((cause) => {
                    catalog.removePlugin(pluginId);
                    contexts.dispose(pluginId);
                    failed.push({
                        pluginId,
                        reason: describeError(Cause.squash(cause)),
                    });
                    logger.error(
                        `plugin failed: ${pluginId}`,
                        Cause.pretty(cause),
                    );
                    return Effect.void;
                }),
            );
        };

        return Effect.forEach(order, loadOne, { concurrency: 1 }).pipe(
            Effect.map(() => ({ loaded, failed })),
        );
    });
}

/**
 * Tears down in reverse load order. Only plugins that were actually set up
 * are visited; contributions are removed even if teardown throws.
 */
export function unloadPlugins(
    options: Pick<
        PluginRuntimeOptions,
        "registry" | "catalog" | "contexts" | "logger"
    > & { loaded: readonly PluginId[] },
): Effect.Effect<void, never> {
    const { registry, catalog, contexts, logger, loaded } = options;

    return Effect.forEach(
        [...loaded].reverse(),
        (pluginId) => {
            const plugin = registry.get(pluginId);

            const teardown = Effect.suspend(() => {
                if (!plugin?.teardown || !contexts.has(pluginId)) {
                    return Effect.void;
                }
                return plugin.teardown(contexts.get(pluginId));
            });

            return teardown.pipe(
                Effect.catchCause((cause) => {
                    logger.error(
                        `plugin teardown failed: ${pluginId}`,
                        Cause.pretty(cause),
                    );
                    return Effect.void;
                }),
                Effect.tap(() =>
                    Effect.sync(() => {
                        catalog.removePlugin(pluginId);
                        contexts.dispose(pluginId);
                    }),
                ),
            );
        },
        { concurrency: 1 },
    ).pipe(Effect.asVoid);
}
