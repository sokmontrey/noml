export type {
    Activation,
    AppEvent,
    CaptureApi,
    CaptureHandler,
    CaptureInput,
    Capability,
    ClockPort,
    CommandDefinition,
    CommandsApi,
    EventBusPort,
    EventHandler,
    IdPort,
    LoggerPort,
    NewNote,
    Note,
    NoteFacade,
    Plugin,
    PluginContext,
    PluginEvent,
    PluginId,
    PluginLogger,
    PluginManifest,
    PluginStorage,
    ScopedEventBus,
    ServiceLookup,
    SettingDefinition,
    SettingsApi,
    SettingValue,
    BusEvent,
} from "@noml/core";
export { CAPABILITIES, today } from "@noml/core";
export { Effect } from "effect";

import type { Plugin, PluginManifest } from "@noml/core";

/**
 * Identity helper for plugin authors. Gives editor inference for the manifest
 * without wrapping behaviour in a class or factory.
 */
export function definePlugin(plugin: Plugin): Plugin {
    return plugin;
}

export function defineManifest(manifest: PluginManifest): PluginManifest {
    return manifest;
}
