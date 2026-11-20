import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { SettingContribution } from "@noml/core";
import { SettingsStore } from "@noml/kernel";
import { makeMemorySettingsPersistence } from "@noml/infra";
import { makeSettingsService } from "./settings.service";
import { silentLogger } from "../../../../tests/helpers";

const contributions = (): SettingContribution[] => [
    {
        pluginId: "core-notes",
        key: "core-notes.dayStartHour",
        definition: {
            key: "dayStartHour",
            label: "Day starts at",
            type: "number",
            default: 4,
        },
    },
];

describe("SettingsService", () => {
    it("seeds defaults and persists valid values", async () => {
        const store = new SettingsStore();
        const persistence = makeMemorySettingsPersistence();
        const service = makeSettingsService({
            definitions: contributions,
            store,
            persistence,
            logger: silentLogger,
        });

        expect(service.list()[0]).toMatchObject({
            key: "core-notes.dayStartHour",
            value: 4,
        });

        await Effect.runPromise(service.set("core-notes.dayStartHour", 6));

        expect(service.get("core-notes.dayStartHour")).toBe(6);
        expect(persistence.values["core-notes.dayStartHour"]).toBe(6);
    });

    it("rejects unknown keys and wrong types", async () => {
        const service = makeSettingsService({
            definitions: contributions,
            store: new SettingsStore(),
            logger: silentLogger,
        });

        await expect(Effect.runPromise(service.set("nope", 1))).rejects.toThrow(
            /Unknown setting/,
        );
        await expect(
            Effect.runPromise(service.set("core-notes.dayStartHour", "late")),
        ).rejects.toThrow(/expects number/);
    });
});
