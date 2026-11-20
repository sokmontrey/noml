import type { Plugin, PluginId, PluginManifest } from "@noml/core";

/** Holds plugin instances. Registration is idempotent-hostile: duplicates throw. */
export class PluginRegistry {
    private readonly plugins = new Map<PluginId, Plugin>();

    register(plugin: Plugin): void {
        const id = plugin.manifest.id;
        if (this.plugins.has(id)) {
            throw new Error(`Plugin already registered: ${id}`);
        }
        this.plugins.set(id, plugin);
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
}
