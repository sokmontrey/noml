import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { NoteNotFoundError } from "@noml/core";
import { makeServiceHarness } from "../../../../tests/helpers";

const run = <A, E>(effect: Effect.Effect<A, E>): Promise<A> =>
    Effect.runPromise(effect);

describe("NoteService", () => {
    it("creates a note with a generated id, timestamps and an event", async () => {
        const { service, events } = makeServiceHarness();

        const note = await run(service.create("2026-11-19", "hello"));

        expect(note.id).toBe("note-1");
        expect(note.day).toBe("2026-11-19");
        expect(note.content).toBe("hello");
        expect(note.fractionalIndex).toBeTruthy();
        expect(note.createdAt).toBe(note.updatedAt);
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({ type: "note.created", note });
    });

    it("keeps insertion order for appended notes", async () => {
        const { service } = makeServiceHarness();

        const first = await run(service.create("2026-11-19", "first"));
        const second = await run(service.append("2026-11-19", "second"));
        const third = await run(service.append("2026-11-19", "third"));

        expect(first.fractionalIndex < second.fractionalIndex).toBe(true);
        expect(second.fractionalIndex < third.fractionalIndex).toBe(true);

        const notes = await run(service.read("2026-11-19"));
        expect(notes.map((note) => note.content)).toEqual([
            "first",
            "second",
            "third",
        ]);
    });

    it("places a new note at the start when no neighbours are given", async () => {
        const { service } = makeServiceHarness();

        const existing = await run(service.create("2026-11-19", "existing"));
        const prepended = await run(service.create("2026-11-19", "prepended"));

        expect(prepended.fractionalIndex < existing.fractionalIndex).toBe(true);
    });

    it("updates content and emits note.updated", async () => {
        const { service, events } = makeServiceHarness();
        const note = await run(service.create("2026-11-19", "draft"));

        await run(service.update(note.id, "  final  "));

        const [stored] = await run(service.read("2026-11-19"));
        expect(stored?.content).toBe("final");
        expect(events.at(-1)?.type).toBe("note.updated");
    });

    it("rejects updates for missing notes", async () => {
        const { service } = makeServiceHarness();

        await expect(
            run(service.update("missing", "x")),
        ).rejects.toBeInstanceOf(NoteNotFoundError);
    });

    it("moves a note to another day with a fresh index", async () => {
        const { service } = makeServiceHarness();
        const note = await run(service.create("2026-11-19", "move me"));
        const other = await run(service.create("2026-11-20", "other"));

        await run(service.move(note.id, "2026-11-20"));

        const moved = await run(service.read("2026-11-20"));
        expect(moved).toHaveLength(2);
        const target = moved.find((item) => item.id === note.id);
        expect(target?.day).toBe("2026-11-20");
        expect(target?.fractionalIndex).toBeTruthy();
        expect(moved.some((item) => item.id === other.id)).toBe(true);
    });

    it("deletes a note and emits note.deleted", async () => {
        const { service, events } = makeServiceHarness();
        const note = await run(service.create("2026-11-19", "bye"));

        await run(service.delete(note.id));

        expect(await run(service.read("2026-11-19"))).toHaveLength(0);
        expect(events.at(-1)).toEqual({ type: "note.deleted", id: note.id });
    });

    it("refuses empty content", async () => {
        const { service } = makeServiceHarness();
        await expect(run(service.create("2026-11-19", "   "))).rejects.toThrow(
            /empty/i,
        );
    });
});
