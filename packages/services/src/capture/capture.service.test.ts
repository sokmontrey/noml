import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { CaptureHandlerRunner } from "@noml/core";
import { makeCaptureService } from "./capture.service";
import { makeServiceHarness } from "../../../../tests/helpers";

const runner = (
    overrides: Partial<CaptureHandlerRunner> & { id: string },
): CaptureHandlerRunner => ({
    pluginId: "test",
    priority: 0,
    canHandle: () => true,
    handle: () => Effect.succeed(null),
    ...overrides,
});

describe("CaptureService", () => {
    it("uses the first non-null draft and creates a real note", async () => {
        const { service: notes, events } = makeServiceHarness();
        const capture = {
            handlers: () => [
                runner({
                    id: "test.first",
                    priority: 20,
                    handle: () =>
                        Effect.succeed({ day: "2026-11-19", content: "first" }),
                }),
                runner({
                    id: "test.second",
                    priority: 10,
                    handle: () =>
                        Effect.succeed({
                            day: "2026-11-19",
                            content: "second",
                        }),
                }),
            ],
        };
        const service = makeCaptureService({ capture, notes });

        const note = await Effect.runPromise(
            service.capture({ source: "test", payload: {} }),
        );

        expect(note?.content).toBe("first");
        expect(events[0]?.type).toBe("note.created");
    });

    it("skips handlers that decline, return null, or fail", async () => {
        const { service: notes } = makeServiceHarness();
        const seen: string[] = [];
        const capture = {
            handlers: () => [
                runner({
                    id: "test.declines",
                    priority: 30,
                    canHandle: () => false,
                    handle: () => {
                        seen.push("declines");
                        return Effect.succeed(null);
                    },
                }),
                runner({
                    id: "test.fails",
                    priority: 20,
                    handle: () => {
                        seen.push("fails");
                        return Effect.fail(new Error("bad"));
                    },
                }),
                runner({
                    id: "test.null",
                    priority: 10,
                    handle: () => {
                        seen.push("null");
                        return Effect.succeed(null);
                    },
                }),
                runner({
                    id: "test.wins",
                    priority: 0,
                    handle: () => {
                        seen.push("wins");
                        return Effect.succeed({
                            day: "2026-11-19",
                            content: "winner",
                        });
                    },
                }),
            ],
        };
        const service = makeCaptureService({ capture, notes });

        const note = await Effect.runPromise(
            service.capture({ source: "test", payload: {} }),
        );

        expect(seen).toEqual(["fails", "null", "wins"]);
        expect(note?.content).toBe("winner");
    });

    it("returns null when nobody claims the input", async () => {
        const { service: notes } = makeServiceHarness();
        const service = makeCaptureService({
            capture: { handlers: () => [] },
            notes,
        });

        const note = await Effect.runPromise(
            service.capture({ source: "test", payload: {} }),
        );

        expect(note).toBeNull();
    });

    it("ignores empty drafts", async () => {
        const { service: notes } = makeServiceHarness();
        const service = makeCaptureService({
            capture: {
                handlers: () => [
                    runner({
                        id: "test.empty",
                        handle: () =>
                            Effect.succeed({
                                day: "2026-11-19",
                                content: "   ",
                            }),
                    }),
                ],
            },
            notes,
        });

        expect(
            await Effect.runPromise(
                service.capture({ source: "test", payload: {} }),
            ),
        ).toBeNull();
    });
});
