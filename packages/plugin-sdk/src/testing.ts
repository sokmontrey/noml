import { Effect } from "effect";
import {
    today,
    type BusEvent,
    type CaptureHandler,
    type CommandDefinition,
    type Note,
    type NoteFacade,
    type PluginContext,
    type PluginManifest,
    type SettingDefinition,
    type SettingValue,
} from "@noml/core";

export interface TestHarness {
    context: PluginContext;
    commands: CommandDefinition[];
    capture: CaptureHandler[];
    settings: SettingDefinition[];
    events: BusEvent[];
    notes: Note[];
}

export interface TestHarnessOptions {
    manifest?: Partial<PluginManifest>;
    notes?: Note[];
}

const defaultManifest: PluginManifest = {
    id: "test-plugin",
    name: "Test Plugin",
    version: "1.0.0",
    apiVersion: "^1",
    capabilities: [
        "notes:read",
        "notes:write",
        "events:subscribe",
        "events:emit",
        "commands:register",
        "capture:register",
        "settings:own",
        "storage:own",
    ],
};

/**
 * Framework-free harness for plugin tests: in-memory notes, recording event
 * bus, captured contributions and a scoped context. No kernel needed.
 */
export function createTestContext(
    options: TestHarnessOptions = {},
): TestHarness {
    const manifest: PluginManifest = {
        ...defaultManifest,
        ...options.manifest,
    };
    const notes: Note[] = options.notes ? [...options.notes] : [];
    const commands: CommandDefinition[] = [];
    const capture: CaptureHandler[] = [];
    const settings: SettingDefinition[] = [];
    const events: BusEvent[] = [];
    const values = new Map<string, SettingValue>();
    const storage = new Map<string, unknown>();

    let counter = 0;
    const newId = () => `note-${++counter}`;

    const sortDay = (day: string) =>
        notes
            .filter((note) => note.day === day)
            .sort((a, b) => a.fractionalIndex.localeCompare(b.fractionalIndex));

    const facade: NoteFacade = {
        list: () =>
            Effect.succeed(
                [...notes].sort(
                    (a, b) =>
                        a.day.localeCompare(b.day) ||
                        a.fractionalIndex.localeCompare(b.fractionalIndex),
                ),
            ),
        read: (day) => Effect.succeed(sortDay(day)),
        create: (day, content) => {
            const note: Note = {
                id: newId(),
                day,
                fractionalIndex: String(Date.now() + counter).padStart(16, "0"),
                content,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            notes.push(note);
            return Effect.succeed(note);
        },
        append: (day, content) => facade.create(day, content),
        update: (id, content) => {
            const note = notes.find((item) => item.id === id);
            if (note) {
                note.content = content;
                note.updatedAt = Date.now();
            }
            return Effect.void;
        },
        move: (id, day) => {
            const note = notes.find((item) => item.id === id);
            if (note) note.day = day;
            return Effect.void;
        },
        delete: (id) => {
            const index = notes.findIndex((note) => note.id === id);
            if (index >= 0) notes.splice(index, 1);
            return Effect.void;
        },
    };

    const context: PluginContext = {
        pluginId: manifest.id,
        manifest,
        capabilities: new Set(manifest.capabilities),
        notes: facade,
        events: {
            subscribe: () => () => {},
            emit: (event) => {
                events.push(event);
                return Effect.void;
            },
        },
        commands: {
            register: (command) => commands.push(command),
        },
        capture: {
            register: (handler) => capture.push(handler),
        },
        settings: {
            define: (definition) => {
                settings.push(definition);
                values.set(definition.key, definition.default);
            },
            get: <T extends SettingValue = SettingValue>(key: string) =>
                values.get(key) as T | undefined,
            set: (key, value) => values.set(key, value),
        },
        storage: {
            get: <T>(key: string) => storage.get(key) as T | undefined,
            set: (key, value) => storage.set(key, value),
            remove: (key) => storage.delete(key),
        },
        logger: {
            debug: () => {},
            info: () => {},
            warn: () => {},
            error: () => {},
        },
        services: {
            get: () => undefined,
        },
    };

    return { context, commands, capture, settings, events, notes };
}

export { today };
