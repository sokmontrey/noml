import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { createTestContext } from "@noml/plugin-sdk/testing";
import { coreNotesPlugin } from "./index";

const load = async () => {
    const harness = createTestContext({ manifest: coreNotesPlugin.manifest });
    await Effect.runPromise(coreNotesPlugin.setup(harness.context));
    return harness;
};

describe("core-notes plugin", () => {
    it("declares its contributions through the context", async () => {
        const harness = await load();

        expect(harness.settings.map((setting) => setting.key)).toEqual([
            "dayStartHour",
        ]);
        expect(harness.commands.map((command) => command.id)).toEqual([
            "core-notes.create",
            "core-notes.list-today",
        ]);
        expect(harness.capture.map((handler) => handler.id)).toEqual([
            "core-notes.plain-text",
        ]);
    });

    it("captures plain text into a draft for today", async () => {
        const harness = await load();
        const handler = harness.capture[0]!;

        const draft = await Effect.runPromise(
            handler.handle(
                { source: "test", payload: { text: "  buy milk  " } },
                harness.context,
            ),
        );

        expect(draft?.content).toBe("buy milk");
        expect(draft?.day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("lets the create command write through the note facade", async () => {
        const harness = await load();
        const command = harness.commands.find(
            (item) => item.id === "core-notes.create",
        )!;

        await Effect.runPromise(
            command.run(harness.context, { content: "written by command" }),
        );

        const notes = await Effect.runPromise(harness.context.notes.list());
        expect(notes[0]?.content).toBe("written by command");
    });
});
