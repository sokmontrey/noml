import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { Plugin } from "@noml/core";
import { makeServiceHarness, silentLogger } from "../../../../tests/helpers";
import { PluginContextFactory } from "../context/plugin-context";
import { loadPlugins, unloadPlugins } from "./plugin-loader";
import { ContributionCatalog } from "../registry/contribution-catalog";
import { PluginRegistry } from "../registry/plugin-registry";
import { SettingsStore } from "../settings/settings-store";
import { makeEventBus } from "../events/event-bus";
import { makeServiceLookup } from "../ports";

const makeHost = () => {
    const { service } = makeServiceHarness();
    const registry = new PluginRegistry();
    const catalog = new ContributionCatalog();
    const events = makeEventBus(silentLogger);
    const settings = new SettingsStore();
    const contexts = new PluginContextFactory({
        registry,
        catalog,
        events,
        notes: service,
        settings,
        services: makeServiceLookup(new Map()),
        logger: silentLogger,
    });
    return { registry, catalog, events, settings, contexts, service };
};

const plugin = (
    id: string,
    setup: Plugin["setup"],
    dependencies?: Record<string, string>,
): Plugin => ({
    manifest: {
        id,
        name: id,
        version: "1.0.0",
        apiVersion: "^1",
        capabilities: ["commands:register", "notes:read"],
        dependencies,
    },
    setup,
});

const command = (id: string) => ({
    id,
    title: id,
    run: () => Effect.void,
});

describe("PluginLoader", () => {
    it("loads dependencies before dependents", async () => {
        const host = makeHost();
        const order: string[] = [];

        host.registry.register(
            plugin(
                "a",
                () => {
                    order.push("a");
                    return Effect.void;
                },
                { b: "^1" },
            ),
        );
        host.registry.register(
            plugin("b", () => {
                order.push("b");
                return Effect.void;
            }),
        );

        const report = await Effect.runPromise(
            loadPlugins({ ...host, logger: silentLogger, apiVersion: "1.0.0" }),
        );

        expect(report.failed).toEqual([]);
        expect(order).toEqual(["b", "a"]);
        expect(report.loaded).toEqual(["b", "a"]);
    });

    it("runs setup exactly once even when a dependent is listed first", async () => {
        const host = makeHost();
        let setups = 0;
        host.registry.register(
            plugin(
                "dependent",
                () => {
                    setups += 1;
                    return Effect.void;
                },
                { base: "^1" },
            ),
        );
        host.registry.register(
            plugin("base", () => {
                setups += 1;
                return Effect.void;
            }),
        );

        await Effect.runPromise(
            loadPlugins({ ...host, logger: silentLogger, apiVersion: "1.0.0" }),
        );

        expect(setups).toBe(2);
    });

    it("isolates a circular dependency", async () => {
        const host = makeHost();
        host.registry.register(plugin("a", () => Effect.void, { b: "^1" }));
        host.registry.register(plugin("b", () => Effect.void, { a: "^1" }));

        const report = await Effect.runPromise(
            loadPlugins({ ...host, logger: silentLogger, apiVersion: "1.0.0" }),
        );

        expect(report.loaded).toEqual([]);
        expect(report.failed.map((failure) => failure.pluginId)).toContain("a");
    });

    it("keeps loading when one plugin fails and removes its contributions", async () => {
        const host = makeHost();
        host.registry.register(
            plugin("broken", () => Effect.fail(new Error("nope"))),
        );
        host.registry.register(
            plugin("healthy", (context) => {
                context.commands.register(command("healthy.run"));
                return Effect.void;
            }),
        );

        const report = await Effect.runPromise(
            loadPlugins({ ...host, logger: silentLogger, apiVersion: "1.0.0" }),
        );

        expect(report.loaded).toEqual(["healthy"]);
        expect(report.failed).toEqual([{ pluginId: "broken", reason: "nope" }]);
        expect(host.catalog.commands()).toHaveLength(1);
    });

    it("rejects plugins whose API range excludes the host", async () => {
        const host = makeHost();
        host.registry.register({
            manifest: {
                id: "future",
                name: "Future",
                version: "1.0.0",
                apiVersion: "^2",
                capabilities: [],
            },
            setup: () => Effect.void,
        });

        const report = await Effect.runPromise(
            loadPlugins({ ...host, logger: silentLogger, apiVersion: "1.0.0" }),
        );

        expect(report.loaded).toEqual([]);
        expect(report.failed[0]?.reason).toMatch(/API/);
    });

    it("tears down only loaded plugins, in reverse order", async () => {
        const host = makeHost();
        const order: string[] = [];
        host.registry.register(plugin("base", () => Effect.void));
        host.registry.register(
            plugin("top", () => Effect.void, { base: "^1" }),
        );

        const report = await Effect.runPromise(
            loadPlugins({ ...host, logger: silentLogger, apiVersion: "1.0.0" }),
        );

        // Replace teardown after load to observe order.
        host.registry.get("base")!.teardown = () => {
            order.push("base");
            return Effect.void;
        };
        host.registry.get("top")!.teardown = () => {
            order.push("top");
            return Effect.void;
        };

        await Effect.runPromise(
            unloadPlugins({
                registry: host.registry,
                catalog: host.catalog,
                contexts: host.contexts,
                logger: silentLogger,
                loaded: report.loaded,
            }),
        );

        expect(order).toEqual(["top", "base"]);
        expect(host.catalog.commands()).toHaveLength(0);
    });

    it("enforces capabilities when a plugin registers", async () => {
        const host = makeHost();
        host.registry.register({
            manifest: {
                id: "sneaky",
                name: "Sneaky",
                version: "1.0.0",
                apiVersion: "^1",
                capabilities: [],
            },
            setup: (context) => {
                context.commands.register(command("sneaky.run"));
                return Effect.void;
            },
        });

        const report = await Effect.runPromise(
            loadPlugins({ ...host, logger: silentLogger, apiVersion: "1.0.0" }),
        );

        expect(report.loaded).toEqual([]);
        expect(report.failed[0]?.reason).toMatch(/commands:register/);
        expect(host.catalog.commands()).toHaveLength(0);
    });
});
