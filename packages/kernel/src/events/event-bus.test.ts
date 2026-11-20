import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { makeEventBus } from "./event-bus";
import { silentLogger } from "../../../../tests/helpers";

describe("EventBus", () => {
    it("delivers to every subscriber", async () => {
        const bus = makeEventBus(silentLogger);
        const seen: string[] = [];

        bus.subscribe("note.created", () => {
            seen.push("a");
        });
        bus.subscribe("note.created", () => {
            seen.push("b");
        });

        await Effect.runPromise(
            bus.publish({
                type: "note.created",
                note: {
                    id: "1",
                    day: "2026-11-19",
                    fractionalIndex: "a",
                    content: "x",
                    createdAt: 1,
                    updatedAt: 1,
                },
            }),
        );

        expect(seen).toEqual(["a", "b"]);
    });

    it("isolates throwing and failing handlers", async () => {
        const bus = makeEventBus(silentLogger);
        const seen: string[] = [];

        bus.subscribe("note.deleted", () => {
            throw new Error("boom");
        });
        bus.subscribe("note.deleted", () =>
            Effect.fail(new Error("also boom")),
        );
        bus.subscribe("note.deleted", () => {
            seen.push("survivor");
        });

        await Effect.runPromise(bus.publish({ type: "note.deleted", id: "1" }));

        expect(seen).toEqual(["survivor"]);
    });

    it("stops delivery after unsubscribe", async () => {
        const bus = makeEventBus(silentLogger);
        let count = 0;
        const off = bus.subscribe("note.deleted", () => {
            count += 1;
        });

        await Effect.runPromise(bus.publish({ type: "note.deleted", id: "1" }));
        off();
        await Effect.runPromise(bus.publish({ type: "note.deleted", id: "2" }));

        expect(count).toBe(1);
    });

    it("publishes plugin events to namespaced subscribers", async () => {
        const bus = makeEventBus(silentLogger);
        const payloads: unknown[] = [];
        bus.subscribe("core-notes.pinned", (event) => {
            payloads.push((event as { payload?: unknown }).payload);
        });

        await Effect.runPromise(
            bus.publish({ type: "core-notes.pinned", payload: { id: "1" } }),
        );

        expect(payloads).toEqual([{ id: "1" }]);
    });
});
