import type { Effect } from "effect";
import type { CaptureHandler } from "../capture/capture";
import type { CommandDefinition } from "../command/command";
import type { ScopedEventBus } from "../events/events";
import type { SettingDefinition, SettingValue } from "../settings/settings";
import type { NoteFacade } from "./facades";
import type { Capability, PluginId, PluginManifest } from "./manifest";

export interface PluginLogger {
    debug(message: string, meta?: unknown): void;
    info(message: string, meta?: unknown): void;
    warn(message: string, meta?: unknown): void;
    error(message: string, meta?: unknown): void;
}

/** Registrars are the only way a plugin contributes behaviour. */
export interface CommandsApi {
    register(command: CommandDefinition): void;
}

export interface CaptureApi {
    register(handler: CaptureHandler): void;
}

export interface SettingsApi {
    define(definition: SettingDefinition): void;
    get<T extends SettingValue = SettingValue>(key: string): T | undefined;
    set(key: string, value: SettingValue): void;
}

/** Namespaced, versioned key/value space owned by one plugin. */
export interface PluginStorage {
    get<T = unknown>(key: string): T | undefined;
    set(key: string, value: unknown): void;
    remove(key: string): void;
}

/** Inter-plugin APIs are looked up, never imported. */
export interface ServiceLookup {
    get<T>(name: string): T | undefined;
}

/**
 * What a plugin receives. The context *is* the sandbox: anything absent or
 * denied here cannot be reached by the plugin.
 */
export interface PluginContext {
    readonly pluginId: PluginId;
    readonly manifest: PluginManifest;
    readonly capabilities: ReadonlySet<Capability>;
    readonly notes: NoteFacade;
    readonly events: ScopedEventBus;
    readonly commands: CommandsApi;
    readonly capture: CaptureApi;
    readonly settings: SettingsApi;
    readonly storage: PluginStorage;
    readonly logger: PluginLogger;
    readonly services: ServiceLookup;
}

export interface Plugin {
    manifest: PluginManifest;
    setup(context: PluginContext): Effect.Effect<void, Error>;
    teardown?(context: PluginContext): Effect.Effect<void, Error>;
}
