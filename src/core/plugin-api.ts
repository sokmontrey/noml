import { Effect } from "effect";
import type { NotePort, NewNote } from "./note/note.port";
import type { EventBus, AppEvent } from "./events";

export type PluginId = string;

export interface PluginManifest {
    id: PluginId;
    name: string;
    version: string;
    capabilities?: string[];
    dependencies?: PluginId[];
}

export interface CaptureInput {
    source: string;
    payload: unknown;
}

export type CaptureHandler = (
    input: CaptureInput,
    context: PluginContext,
) => Effect.Effect<NewNote | null, Error>;

export interface MarkdownExtension {
    /** Opaque remark/rehype plugin entries; the app casts them at render time. */
    remarkPlugins?: readonly unknown[];
    rehypePlugins?: readonly unknown[];
}

export interface Command {
    id: string;
    title: string;
    run: (context: PluginContext) => Effect.Effect<void, Error>;
}

export interface SettingDefinition {
    key: string;
    label: string;
    type: "string" | "number" | "boolean";
    default: string | number | boolean;
}

export interface PluginContext {
    notes: NotePort;
    events: EventBus;
    logger: {
        info(message: string): void;
        warn(message: string): void;
        error(message: string): void;
    };
    settings: {
        get(key: string): unknown;
        set(key: string, value: unknown): void;
    };
}

export interface PluginContributions {
    captureHandlers?: CaptureHandler[];
    markdownExtensions?: MarkdownExtension[];
    commands?: Command[];
    settings?: SettingDefinition[];
}

export interface Plugin {
    manifest: PluginManifest;
    setup: (context: PluginContext) => Effect.Effect<void, Error>;
    teardown?: (context: PluginContext) => Effect.Effect<void, Error>;
    contributions?: PluginContributions;
}