import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import type { Note } from "@noml/core";
import { openDatabase, type NomlDatabase } from "./database";
import { makeNoteRepository } from "./note.repository";

const makeNote = (id: string, index: string, day = "2026-11-19"): Note => ({
    id,
    day,
    fractionalIndex: index,
    content: `note ${id}`,
    createdAt: 1,
    updatedAt: 1,
});

describe("Dexie note repository", () => {
    let db: NomlDatabase | undefined;

    afterEach(async () => {
        await db?.delete();
        db = undefined;
    });

    it("opens the schema and performs CRUD in order", async () => {
        db = await openDatabase(`noml-test-${crypto.randomUUID()}`);
        const repo = makeNoteRepository(db);

        await Effect.runPromise(repo.create(makeNote("b", "b")));
        await Effect.runPromise(repo.create(makeNote("a", "a")));
        await Effect.runPromise(repo.create(makeNote("c", "c", "2026-11-20")));

        const day = await Effect.runPromise(repo.read("2026-11-19"));
        expect(day.map((note) => note.id)).toEqual(["a", "b"]);

        const all = await Effect.runPromise(repo.readAll());
        expect(all.map((note) => note.id)).toEqual(["a", "b", "c"]);

        await Effect.runPromise(
            repo.update("a", { content: "changed", updatedAt: 2 }),
        );
        const updated = await Effect.runPromise(repo.get("a"));
        expect(updated?.content).toBe("changed");

        await Effect.runPromise(repo.delete("b"));
        expect(await Effect.runPromise(repo.get("b"))).toBeNull();
        expect(await Effect.runPromise(repo.read("2026-11-19"))).toHaveLength(
            1,
        );
    });

    it("rejects duplicate positions inside the same day", async () => {
        db = await openDatabase(`noml-test-${crypto.randomUUID()}`);
        const repo = makeNoteRepository(db);

        await Effect.runPromise(repo.create(makeNote("a", "a")));
        await expect(
            Effect.runPromise(repo.create(makeNote("b", "a"))),
        ).rejects.toBeTruthy();
    });
});
