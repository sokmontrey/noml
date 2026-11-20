import { Effect } from "effect";
import type {
    EventBusPort,
    LoggerPort,
    SettingContribution,
    SettingValue,
    SettingView,
    SettingsPersistencePort,
    SettingsPort,
} from "@noml/core";

export interface SettingsServiceDeps {
    definitions: () => readonly SettingContribution[];
    store: SettingsPort;
    persistence?: SettingsPersistencePort;
    events?: EventBusPort;
    logger?: LoggerPort;
}

export interface SettingsService {
    list(): SettingView[];
    get(key: string): SettingValue | undefined;
    set(key: string, value: SettingValue): Effect.Effect<void, Error>;
}

/**
 * Schema-first settings. Definitions arrive from plugins, values live in the
 * runtime store, persistence is an adapter. Invalid writes fail loudly.
 */
export function makeSettingsService(
    deps: SettingsServiceDeps,
): SettingsService {
    const { definitions, store, persistence, events, logger } = deps;

    // Seed defaults for anything not already persisted.
    for (const { key, definition } of definitions()) {
        if (store.get(key) === undefined) store.set(key, definition.default);
    }

    return {
        list(): SettingView[] {
            return definitions().map(({ pluginId, key, definition }) => ({
                ...definition,
                key,
                pluginId,
                value:
                    (store.get<SettingValue>(key) as
                        SettingValue | undefined) ?? definition.default,
            }));
        },
        get(key: string): SettingValue | undefined {
            return store.get<SettingValue>(key);
        },
        set(key: string, value: SettingValue): Effect.Effect<void, Error> {
            return Effect.suspend(() => {
                const entry = definitions().find((item) => item.key === key);
                if (!entry) {
                    return Effect.fail(new Error(`Unknown setting "${key}"`));
                }
                if (typeof value !== entry.definition.type) {
                    return Effect.fail(
                        new Error(
                            `Setting "${key}" expects ${entry.definition.type}`,
                        ),
                    );
                }
                store.set(key, value);
                persistence?.save(store.all());
                logger?.info(`setting changed: ${key}`);
                return events
                    ? events.publish({
                          type: "settings.changed",
                          payload: { key, value },
                      })
                    : Effect.void;
            });
        },
    };
}
