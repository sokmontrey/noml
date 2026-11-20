import {
    PluginError,
    type CaptureHandler,
    type CommandDefinition,
    type PluginId,
    type SettingDefinition,
} from "@noml/core";

export interface Owned<T> {
    pluginId: PluginId;
    value: T;
}

const namespaced = (pluginId: PluginId, id: string) =>
    id.startsWith(`${pluginId}.`);

/**
 * Single source of truth for everything plugins contribute. Entries are
 * namespaced, collision-checked and removable per plugin on teardown.
 */
export class ContributionCatalog {
    private readonly commandMap = new Map<string, Owned<CommandDefinition>>();
    private readonly captureList: Owned<CaptureHandler>[] = [];
    private readonly settingMap = new Map<string, Owned<SettingDefinition>>();

    addCommand(pluginId: PluginId, command: CommandDefinition): void {
        if (!namespaced(pluginId, command.id)) {
            throw new PluginError({
                pluginId,
                message: `Command id "${command.id}" must start with "${pluginId}."`,
            });
        }
        if (this.commandMap.has(command.id)) {
            throw new PluginError({
                pluginId,
                message: `Duplicate command id "${command.id}"`,
            });
        }
        this.commandMap.set(command.id, { pluginId, value: command });
    }

    addCaptureHandler(pluginId: PluginId, handler: CaptureHandler): void {
        if (!namespaced(pluginId, handler.id)) {
            throw new PluginError({
                pluginId,
                message: `Capture handler id "${handler.id}" must start with "${pluginId}."`,
            });
        }
        if (this.captureList.some((entry) => entry.value.id === handler.id)) {
            throw new PluginError({
                pluginId,
                message: `Duplicate capture handler id "${handler.id}"`,
            });
        }
        this.captureList.push({ pluginId, value: handler });
    }

    addSetting(pluginId: PluginId, definition: SettingDefinition): void {
        const key = `${pluginId}.${definition.key}`;
        if (this.settingMap.has(key)) {
            throw new PluginError({
                pluginId,
                message: `Duplicate setting "${key}"`,
            });
        }
        this.settingMap.set(key, { pluginId, value: definition });
    }

    commands(): readonly Owned<CommandDefinition>[] {
        return [...this.commandMap.values()];
    }

    command(id: string): Owned<CommandDefinition> | undefined {
        return this.commandMap.get(id);
    }

    /** Higher priority first; ties broken by plugin id for determinism. */
    captureHandlers(): readonly Owned<CaptureHandler>[] {
        return [...this.captureList].sort(
            (a, b) =>
                b.value.priority - a.value.priority ||
                a.pluginId.localeCompare(b.pluginId),
        );
    }

    settings(): readonly {
        pluginId: PluginId;
        key: string;
        definition: SettingDefinition;
    }[] {
        return [...this.settingMap.entries()].map(([key, entry]) => ({
            pluginId: entry.pluginId,
            key,
            definition: entry.value,
        }));
    }

    removePlugin(pluginId: PluginId): void {
        for (const [id, entry] of this.commandMap) {
            if (entry.pluginId === pluginId) this.commandMap.delete(id);
        }
        for (const [key, entry] of this.settingMap) {
            if (entry.pluginId === pluginId) this.settingMap.delete(key);
        }
        for (let i = this.captureList.length - 1; i >= 0; i -= 1) {
            if (this.captureList[i]?.pluginId === pluginId) {
                this.captureList.splice(i, 1);
            }
        }
    }

    clear(): void {
        this.commandMap.clear();
        this.settingMap.clear();
        this.captureList.length = 0;
    }
}
