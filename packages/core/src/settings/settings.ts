export type SettingValue = string | number | boolean;

/** Schema-first settings: the host renders and persists; plugins read values. */
export interface SettingDefinition {
    key: string;
    label: string;
    type: "string" | "number" | "boolean";
    default: SettingValue;
    description?: string;
}

export interface SettingView extends SettingDefinition {
    pluginId: string;
    value: SettingValue;
}

/** A definition plus the plugin that owns it. */
export interface SettingContribution {
    pluginId: string;
    key: string;
    definition: SettingDefinition;
}

/** Runtime registry of values, already merged with defaults. */
export interface SettingsPort {
    get<T = unknown>(key: string): T | undefined;
    set(key: string, value: unknown): void;
    all(): Record<string, unknown>;
}

/** Durable side of settings. Swappable: localStorage, IndexedDB, server. */
export interface SettingsPersistencePort {
    load(): Record<string, unknown>;
    save(values: Record<string, unknown>): void;
}
