import { Effect } from "effect";
import {
    PluginContextFactory,
    ContributionCatalog,
    PluginRegistry,
    SettingsStore,
    loadPlugins,
    makeCapturePort,
    makeCommandPort,
    makeEventBus,
    makeServiceLookup,
    unloadPlugins,
    type LoadReport,
} from "@noml/kernel";
import {
    makeCaptureService,
    makeCommandService,
    makeNoteService,
    makeSettingsService,
    type CaptureService,
    type CommandService,
    type NoteService,
    type SettingsService,
} from "@noml/services";
import {
    makeConsoleLogger,
    makeFractionalIndexAdapter,
    makeLocalSettingsPersistence,
    makeNoteRepository,
    makeSystemClock,
    makeUuidIds,
    openDatabase,
    type NomlDatabase,
} from "@noml/infra";
import type { EventBusPort, LoggerPort } from "@noml/core";
import { coreNotesPlugin } from "@noml/plugin-core-notes";

export const PLUGIN_API_VERSION = "1.3.0";

export interface AppContainer {
    noteService: NoteService;
    captureService: CaptureService;
    commandService: CommandService;
    settingsService: SettingsService;
    eventBus: EventBusPort;
    logger: LoggerPort;
    plugins: LoadReport;
    database: NomlDatabase;
    shutdown(): Promise<void>;
}

/**
 * The composition root. It is the only module allowed to construct adapters,
 * services and the kernel, and the only one that wires them together.
 */
export async function bootstrap(): Promise<AppContainer> {
    const logger = makeConsoleLogger({ level: "info" });

    // 1. Infrastructure adapters.
    const database = await openDatabase();
    const notes = makeNoteRepository(database);
    const fractionalIndex = makeFractionalIndexAdapter();
    const clock = makeSystemClock();
    const ids = makeUuidIds();
    const settingsPersistence = makeLocalSettingsPersistence();

    // 2. Kernel primitives.
    const eventBus = makeEventBus(logger);
    const catalog = new ContributionCatalog();
    const registry = new PluginRegistry();
    const settingsStore = new SettingsStore(settingsPersistence.load());

    // 3. Services. They receive ports, never adapters.
    const noteService = makeNoteService({
        notes,
        fractionalIndex,
        events: eventBus,
        clock,
        ids,
        logger,
    });

    const contextFactory = new PluginContextFactory({
        registry,
        catalog,
        events: eventBus,
        notes: noteService,
        settings: settingsStore,
        services: makeServiceLookup(new Map()),
        logger,
    });

    const commandPort = makeCommandPort(catalog, contextFactory);
    const capturePort = makeCapturePort(catalog, contextFactory);

    // 4. Plugins: register builtins, then load in dependency order.
    registry.register(coreNotesPlugin);
    const plugins = await Effect.runPromise(
        loadPlugins({
            registry,
            catalog,
            contexts: contextFactory,
            events: eventBus,
            logger,
            apiVersion: PLUGIN_API_VERSION,
        }),
    );

    // 5. Core subscribers. Plugins and UI are just more subscribers.
    eventBus.subscribe("note.created", (event) => {
        logger.info(`note created: ${event.note.id} (${event.note.day})`);
    });
    eventBus.subscribe("note.deleted", (event) => {
        logger.info(`note deleted: ${event.id}`);
    });

    const captureService = makeCaptureService({
        capture: capturePort,
        notes: noteService,
        logger,
    });
    const commandService = makeCommandService({
        commands: commandPort,
        logger,
    });
    const settingsService = makeSettingsService({
        definitions: () => catalog.settings(),
        store: settingsStore,
        persistence: settingsPersistence,
        events: eventBus,
        logger,
    });

    return {
        noteService,
        captureService,
        commandService,
        settingsService,
        eventBus,
        logger,
        plugins,
        database,
        async shutdown() {
            await Effect.runPromise(
                unloadPlugins({
                    registry,
                    catalog,
                    contexts: contextFactory,
                    logger,
                    loaded: plugins.loaded,
                }),
            );
            database.close();
        },
    };
}
