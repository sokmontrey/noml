import type { SettingsPersistencePort, SettingValue } from "@noml/core";

/** Persists the settings map in localStorage. Corrupt payloads are ignored. */
export function makeLocalSettingsPersistence(
    storageKey = "noml.settings",
): SettingsPersistencePort {
    return {
        load(): Record<string, unknown> {
            if (typeof localStorage === "undefined") return {};
            try {
                const raw = localStorage.getItem(storageKey);
                if (!raw) return {};
                const parsed: unknown = JSON.parse(raw);
                return parsed && typeof parsed === "object"
                    ? (parsed as Record<string, unknown>)
                    : {};
            } catch {
                return {};
            }
        },
        save(values: Record<string, unknown>): void {
            if (typeof localStorage === "undefined") return;
            try {
                const filtered: Record<string, SettingValue> = {};
                for (const [key, value] of Object.entries(values)) {
                    if (
                        typeof value === "string" ||
                        typeof value === "number" ||
                        typeof value === "boolean"
                    ) {
                        filtered[key] = value;
                    }
                }
                localStorage.setItem(storageKey, JSON.stringify(filtered));
            } catch {
                // Quota or privacy mode: settings stay in memory for this run.
            }
        },
    };
}

/** Deterministic persistence for tests and non-browser hosts. */
export function makeMemorySettingsPersistence(
    initial: Record<string, unknown> = {},
): SettingsPersistencePort & { values: Record<string, unknown> } {
    let values = { ...initial };
    return {
        get values() {
            return values;
        },
        load: () => ({ ...values }),
        save: (next) => {
            values = { ...next };
        },
    };
}
