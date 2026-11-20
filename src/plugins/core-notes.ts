import { Effect } from "effect";
import type { Plugin } from "../core/plugin-api";

export const coreNotesPlugin: Plugin = {
    manifest: {
        id: "core-notes",
        name: "Core Notes",
        version: "0.1.0",
        capabilities: ["notes:read", "notes:write"],
    },
    setup: () => Effect.void,
    contributions: {
        commands: [],
        settings: [],
    },
};