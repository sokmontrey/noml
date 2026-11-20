export type PluginId = string;

/** Least-privilege declarations. Enforced when the context is built. */
export const CAPABILITIES = [
    "notes:read",
    "notes:write",
    "events:subscribe",
    "events:emit",
    "commands:register",
    "capture:register",
    "settings:own",
    "storage:own",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export type Activation =
    | { type: "eager" }
    | { type: "onCommand"; commandId: string }
    | { type: "onCapture" }
    | { type: "onEvent"; eventType: string };

export interface PluginManifest {
    /** Stable, namespaced id. Contributions inherit this prefix. */
    id: PluginId;
    name: string;
    version: string;
    /** Semver range of the host plugin API this plugin targets. */
    apiVersion: string;
    capabilities: readonly Capability[];
    /** plugin id -> semver range. */
    dependencies?: Readonly<Record<PluginId, string>>;
    /** Defaults to eager for builtins. */
    activation?: Activation;
}
