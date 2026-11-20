export { PluginRegistry } from "./registry/plugin-registry";
export {
    ContributionCatalog,
    type Owned,
} from "./registry/contribution-catalog";
export { makeEventBus } from "./events/event-bus";
export { SettingsStore } from "./settings/settings-store";
export {
    PluginContextFactory,
    type ContextDeps,
} from "./context/plugin-context";
export { makeCommandPort, makeCapturePort, makeServiceLookup } from "./ports";
export {
    loadPlugins,
    unloadPlugins,
    type LoadReport,
    type PluginFailure,
    type PluginRuntimeOptions,
} from "./loader/plugin-loader";
export { satisfies } from "./version";
