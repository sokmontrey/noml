import { Effect } from "effect";
import {
    CapabilityError,
    PluginError,
    type CaptureHandler,
    type Capability,
    type EventBusPort,
    type LoggerPort,
    type NoteFacade,
    type Plugin,
    type PluginContext,
    type PluginId,
    type PluginStorage,
    type ScopedEventBus,
    type ServiceLookup,
    type SettingsPort,
} from "@noml/core";
import type { ContributionCatalog } from "../registry/contribution-catalog";
import type { PluginRegistry } from "../registry/plugin-registry";

export interface ContextDeps {
    registry: PluginRegistry;
    catalog: ContributionCatalog;
    events: EventBusPort;
    notes: NoteFacade;
    settings: SettingsPort;
    services: ServiceLookup;
    logger: LoggerPort;
    /** Namespaced storage per plugin. Defaults to an in-memory map. */
    storage?: (pluginId: PluginId) => PluginStorage;
}

const memoryStorage = (): PluginStorage => {
    const values = new Map<string, unknown>();
    return {
        get: <T>(key: string) => values.get(key) as T | undefined,
        set: (key, value) => values.set(key, value),
        remove: (key) => values.delete(key),
    };
};

/**
 * Builds the capability-scoped context. Enforcement happens here, not in
 * plugins: denied capabilities produce a failing method or a synchronous
 * `CapabilityError` during registration.
 */
export class PluginContextFactory {
    private readonly contexts = new Map<PluginId, PluginContext>();
    private readonly storages = new Map<PluginId, PluginStorage>();

    private readonly deps: ContextDeps;

    constructor(deps: ContextDeps) {
        this.deps = deps;
    }

    get(pluginId: PluginId): PluginContext {
        const existing = this.contexts.get(pluginId);
        if (existing) return existing;

        const plugin = this.deps.registry.get(pluginId);
        if (!plugin) {
            throw new PluginError({
                pluginId,
                message: `Cannot create a context for unregistered plugin "${pluginId}"`,
            });
        }

        const context = this.build(plugin);
        this.contexts.set(pluginId, context);
        return context;
    }

    has(pluginId: PluginId): boolean {
        return this.contexts.has(pluginId);
    }

    dispose(pluginId: PluginId): void {
        this.contexts.delete(pluginId);
        this.storages.delete(pluginId);
    }

    private build(plugin: Plugin): PluginContext {
        const pluginId = plugin.manifest.id;
        const capabilities = new Set<Capability>(plugin.manifest.capabilities);
        const { catalog, events, notes, settings, services, logger } =
            this.deps;

        const require = (capability: Capability): void => {
            if (!capabilities.has(capability)) {
                throw new CapabilityError({ pluginId, capability });
            }
        };

        const denied = (capability: Capability): Effect.Effect<never, Error> =>
            Effect.fail(new CapabilityError({ pluginId, capability }));

        const allow = <A>(
            capability: Capability,
            work: () => Effect.Effect<A, Error>,
        ): Effect.Effect<A, Error> =>
            capabilities.has(capability) ? work() : denied(capability);

        const notesFacade: NoteFacade = {
            list: () => allow("notes:read", () => notes.list()),
            read: (day, offset, limit) =>
                allow("notes:read", () => notes.read(day, offset, limit)),
            create: (day, content, after, before) =>
                allow("notes:write", () =>
                    notes.create(day, content, after, before),
                ),
            append: (day, content) =>
                allow("notes:write", () => notes.append(day, content)),
            update: (id, content) =>
                allow("notes:write", () => notes.update(id, content)),
            move: (id, toDay, after, before) =>
                allow("notes:write", () =>
                    notes.move(id, toDay, after, before),
                ),
            delete: (id) => allow("notes:write", () => notes.delete(id)),
        };

        const settingsApi = {
            define: (definition: {
                key: string;
                label: string;
                type: "string" | "number" | "boolean";
                default: string | number | boolean;
                description?: string;
            }) => {
                require("settings:own");
                catalog.addSetting(pluginId, definition);
                const fullKey = `${pluginId}.${definition.key}`;
                if (settings.get(fullKey) === undefined) {
                    settings.set(fullKey, definition.default);
                }
            },
            get: <
                T extends string | number | boolean = string | number | boolean,
            >(
                key: string,
            ): T | undefined => {
                require("settings:own");
                return settings.get<T>(`${pluginId}.${key}`);
            },
            set: (key: string, value: string | number | boolean): void => {
                require("settings:own");
                settings.set(`${pluginId}.${key}`, value);
            },
        };

        const storage = (): PluginStorage => {
            require("storage:own");
            let existing = this.storages.get(pluginId);
            if (!existing) {
                existing = this.deps.storage?.(pluginId) ?? memoryStorage();
                this.storages.set(pluginId, existing);
            }
            return existing;
        };

        const scopedEvents: ScopedEventBus = {
            subscribe: ((type: string, handler: unknown) => {
                require("events:subscribe");
                return events.subscribe(
                    type as Parameters<EventBusPort["subscribe"]>[0],
                    handler as Parameters<EventBusPort["subscribe"]>[1],
                );
            }) as ScopedEventBus["subscribe"],
            emit: (event) =>
                allow("events:emit", () => {
                    if (!event.type.startsWith(`${pluginId}.`)) {
                        return Effect.fail(
                            new PluginError({
                                pluginId,
                                message: `Plugin event "${event.type}" must be namespaced with "${pluginId}."`,
                            }),
                        );
                    }
                    return events.publish(event);
                }),
        };

        const prefixedLogger: LoggerPort = {
            log: (level, message, meta) =>
                logger.log(level, `[${pluginId}] ${message}`, meta),
            debug: (message, meta) =>
                logger.debug(`[${pluginId}] ${message}`, meta),
            info: (message, meta) =>
                logger.info(`[${pluginId}] ${message}`, meta),
            warn: (message, meta) =>
                logger.warn(`[${pluginId}] ${message}`, meta),
            error: (message, meta) =>
                logger.error(`[${pluginId}] ${message}`, meta),
        };

        return {
            pluginId,
            manifest: plugin.manifest,
            capabilities,
            notes: notesFacade,
            events: scopedEvents as PluginContext["events"],
            commands: {
                register: (command) => {
                    require("commands:register");
                    catalog.addCommand(pluginId, command);
                },
            },
            capture: {
                register: (handler: CaptureHandler) => {
                    require("capture:register");
                    catalog.addCaptureHandler(pluginId, handler);
                },
            },
            settings: settingsApi,
            get storage() {
                return storage();
            },
            logger: prefixedLogger,
            services,
        };
    }
}
