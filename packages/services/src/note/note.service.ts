import { Effect } from "effect";
import {
    NoteNotFoundError,
    assertValidDay,
    type ClockPort,
    type EventBusPort,
    type FractionalIndexPort,
    type IdPort,
    type LoggerPort,
    type NewNote,
    type Note,
    type NoteFacade,
    type NotePort,
} from "@noml/core";

export interface NoteServiceDeps {
    notes: NotePort;
    fractionalIndex: FractionalIndexPort;
    events: EventBusPort;
    clock: ClockPort;
    ids: IdPort;
    logger?: LoggerPort;
}

/**
 * Note use cases. Every ordering invariant lives here; the port only stores
 * rows. `after`/`before` are the notes the new one should sit between.
 */
export interface NoteService extends NoteFacade {
    create(
        day: string,
        content: string,
        after?: Note | null,
        before?: Note | null,
    ): Effect.Effect<Note, Error>;
}

export function makeNoteService(deps: NoteServiceDeps): NoteService {
    const { notes, fractionalIndex, events, clock, ids, logger } = deps;

    const publish = (event: Parameters<EventBusPort["publish"]>[0]) =>
        events.publish(event).pipe(
            Effect.catch((error) => {
                logger?.warn(`failed to publish ${event.type}`, error);
                return Effect.void;
            }),
        );

    const between = (after?: Note | null, before?: Note | null) =>
        fractionalIndex.between(
            after?.fractionalIndex ?? null,
            before?.fractionalIndex ?? null,
        );

    /**
     * With no neighbours the note goes to the start of the day. The storage
     * key is unique per day, so `between(null, null)` must not be used when
     * the day already has a first note.
     */
    const indexFor = (
        day: string,
        after?: Note | null,
        before?: Note | null,
    ) =>
        after || before
            ? Effect.succeed(between(after, before))
            : Effect.map(notes.read(day), (existing) =>
                  between(null, existing[0] ?? null),
              );

    const create = (
        day: string,
        content: string,
        after?: Note | null,
        before?: Note | null,
    ): Effect.Effect<Note, Error> =>
        Effect.gen(function* () {
            assertValidDay(day);
            const trimmed = content.trim();
            if (!trimmed) {
                return yield* Effect.fail(new Error("Note content is empty"));
            }
            const fractionalIndexValue = yield* indexFor(day, after, before);
            const timestamp = clock.now();
            const note: Note = {
                id: ids.next(),
                day,
                fractionalIndex: fractionalIndexValue,
                content: trimmed,
                createdAt: timestamp,
                updatedAt: timestamp,
            };
            yield* notes.create(note);
            yield* publish({ type: "note.created", note });
            return note;
        });

    const requireNote = (id: string) =>
        Effect.flatMap(notes.get(id), (note) =>
            note
                ? Effect.succeed(note)
                : Effect.fail(new NoteNotFoundError({ id })),
        );

    return {
        list: () => notes.readAll(),
        read: (day, offset, limit) => notes.read(day, offset, limit),
        create,
        append: (day: string, content: string) =>
            Effect.flatMap(notes.read(day), (existing) =>
                create(day, content, existing.at(-1) ?? null, null),
            ),
        update: (id: string, content: string) =>
            Effect.gen(function* () {
                const trimmed = content.trim();
                if (!trimmed) {
                    return yield* Effect.fail(
                        new Error("Note content is empty"),
                    );
                }
                const current = yield* requireNote(id);
                const updated: Note = {
                    ...current,
                    content: trimmed,
                    updatedAt: clock.now(),
                };
                yield* notes.update(id, {
                    content: updated.content,
                    updatedAt: updated.updatedAt,
                });
                yield* publish({ type: "note.updated", note: updated });
            }),
        move: (
            id: string,
            toDay: string,
            after?: Note | null,
            before?: Note | null,
        ) =>
            Effect.gen(function* () {
                assertValidDay(toDay);
                const current = yield* requireNote(id);
                const nextIndex = yield* indexFor(toDay, after, before);
                const updated: Note = {
                    ...current,
                    day: toDay,
                    fractionalIndex: nextIndex,
                    updatedAt: clock.now(),
                };
                yield* notes.update(id, {
                    day: updated.day,
                    fractionalIndex: updated.fractionalIndex,
                    updatedAt: updated.updatedAt,
                });
                yield* publish({ type: "note.updated", note: updated });
            }),
        delete: (id: string) =>
            Effect.gen(function* () {
                yield* requireNote(id);
                yield* notes.delete(id);
                yield* publish({ type: "note.deleted", id });
            }),
    };
}

export type { NewNote };
