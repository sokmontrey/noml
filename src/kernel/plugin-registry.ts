import type { Plugin, PluginId, PluginManifest } from "../core/plugin-api";

export class PluginRegistry {
    private readonly plugins = new Map<PluginId, Plugin>();

    register(plugin: Plugin): void {
        if (this.plugins.has(plugin.manifest.id)) {
            throw new Error(`Plugin already registered: ${plugin.manifest.id}`);
        }
        this.plugins.set(plugin.manifest.id, plugin);
    }

    unregister(id: PluginId): void {
        this.plugins.delete(id);
    }

    get(id: PluginId): Plugin | undefined {
        return this.plugins.get(id);
    }

    list(): Plugin[] {
        return [...this.plugins.values()];
    }

    manifests(): PluginManifest[] {
        return this.list().map((plugin) => plugin.manifest);
    }

    captureHandlers(): (Plugin["contributions"] extends infer C
        ? C extends { captureHandlers?: infer H }
            ? H
            : never
        : never)[] {
        return this.list().flatMap(
            (plugin) => plugin.contributions?.captureHandlers ?? [],
        ) as any;
    }

    markdownExtensions() {
        return this.list().flatMap(
            (plugin) => plugin.contributions?.markdownExtensions ?? [],
        );
    }

    commands() {
        return this.list().flatMap(
            (plugin) => plugin.contributions?.commands ?? [],
        );
    }

    settings() {
        return this.list().flatMap(
            (plugin) => plugin.contributions?.settings ?? [],
        );
    }
}