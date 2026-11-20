import { Effect } from "effect";
import { definePlugin, today } from "@noml/plugin-sdk";
import type { CaptureInput } from "@noml/plugin-sdk";

const textFrom = (input: CaptureInput): string | null => {
    if (typeof input.payload === "string") return input.payload;
    if (
        input.payload &&
        typeof input.payload === "object" &&
        "text" in input.payload &&
        typeof input.payload.text === "string"
    ) {
        return input.payload.text;
    }
    return null;
};

/**
 * Builtin notes plugin. It contributes a capture handler, a command and a
 * setting; it never imports storage or the app. Everything it can do is
 * expressed through its injected context.
 */
export const coreNotesPlugin = definePlugin({
    manifest: {
        id: "core-notes",
        name: "Core Notes",
        version: "0.1.0",
        apiVersion: "^1",
        capabilities: [
            "notes:read",
            "notes:write",
            "commands:register",
            "capture:register",
            "settings:own",
            "events:subscribe",
        ],
    },
    setup(context) {
        return Effect.sync(() => {
            context.settings.define({
                key: "dayStartHour",
                label: "Day starts at",
                type: "number",
                default: 4,
                description:
                    "Notes captured before this hour belong to the previous day.",
            });

            context.capture.register({
                id: "core-notes.plain-text",
                priority: 10,
                canHandle: (input) => textFrom(input) !== null,
                handle: (input) => {
                    const text = textFrom(input)?.trim();
                    if (!text) return Effect.succeed(null);
                    return Effect.succeed({ day: today(), content: text });
                },
            });

            context.commands.register({
                id: "core-notes.create",
                title: "Create note",
                category: "Notes",
                description: "Create a note for today",
                keybinding: "Ctrl+Alt+N",
                run: (ctx, args) => {
                    const payload =
                        args && typeof args === "object"
                            ? (args as { content?: unknown; day?: unknown })
                            : {};
                    const content =
                        typeof payload.content === "string"
                            ? payload.content.trim()
                            : "";
                    if (!content) {
                        return Effect.fail(
                            new Error("core-notes.create requires { content }"),
                        );
                    }
                    const day =
                        typeof payload.day === "string" ? payload.day : today();
                    return ctx.notes.create(day, content);
                },
            });

            context.commands.register({
                id: "core-notes.list-today",
                title: "List today's notes",
                category: "Notes",
                run: (ctx) => ctx.notes.read(today()),
            });
        });
    },
    teardown() {
        return Effect.void;
    },
});
