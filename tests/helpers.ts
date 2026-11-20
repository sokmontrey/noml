import { Effect } from "effect";
import {
    type BusEvent,
    type Note,
    type NotePatch,
    type NotePort,
    type LoggerPort,
} from "@noml/core";
import { makeFractionalIndexAdapter } from "@noml/infra";
import { makeEventBus } from "@noml/kernel";
import { makeNoteService, type NoteService } from "@noml/services";

export const silentLogger: LoggerPort = {
    log: () => {},
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
};

export interface ServiceHarness {
    notes: Note[];
    port: NotePort;
    service: NoteService;
    events: BusEvent[];
    now: () => number;
}

/** In-memory NotePort with deterministic ordering. */
export function makeServiceHarness(): ServiceHarness {
    const rows: Note[] = [];
    const events: BusEvent[] = [];
    let timestamp = 1_000;
    let counter = 0;

    const port: NotePort = {
        create: (note) => {
            rows.push({ ...note });
            return Effect.void;
        },
        get: (id) => Effect.succeed(rows.find((n) => n.id === id) ?? null),
        read: (day) =>
            Effect.succeed(
                rows
                    .filter((n) => n.day === day)
                    .sort((a, b) =>
                        a.fractionalIndex.localeCompare(b.fractionalIndex),
                    ),
            ),
        readAll: () =>
            Effect.succeed(
                [...rows].sort(
                    (a, b) =>
                        a.day.localeCompare(b.day) ||
                        a.fractionalIndex.localeCompare(b.fractionalIndex),
                ),
            ),
        update: (id, patch: NotePatch) => {
            const row = rows.find((n) => n.id === id);
            if (row) Object.assign(row, patch);
            return Effect.void;
        },
        delete: (id) => {
            const index = rows.findIndex((n) => n.id === id);
            if (index >= 0) rows.splice(index, 1);
            return Effect.void;
        },
    };

    const bus = makeEventBus(silentLogger);
    const originalPublish = bus.publish.bind(bus);
    const recordingBus = {
        ...bus,
        publish: (event: BusEvent) => {
            events.push(event);
            return originalPublish(event);
        },
    };

    const service = makeNoteService({
        notes: port,
        fractionalIndex: makeFractionalIndexAdapter(),
        events: recordingBus,
        clock: { now: () => timestamp++ },
        ids: { next: () => `note-${++counter}` },
        logger: silentLogger,
    });

    return {
        notes: rows,
        port,
        service,
        events,
        now: () => timestamp,
    };
}
