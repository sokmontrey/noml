import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL("./", import.meta.url));

const aliases = [
    ["@noml/core", "packages/core/src/index.ts"],
    ["@noml/kernel", "packages/kernel/src/index.ts"],
    ["@noml/services", "packages/services/src/index.ts"],
    ["@noml/infra", "packages/infra/src/index.ts"],
    ["@noml/ui", "packages/ui/src/index.ts"],
    ["@noml/plugin-sdk/testing", "packages/plugin-sdk/src/testing.ts"],
    ["@noml/plugin-sdk", "packages/plugin-sdk/src/index.ts"],
    ["@noml/plugin-core-notes", "packages/plugins/core-notes/src/index.ts"],
].map(([name, path]) => ({ find: name!, replacement: root + path }));

export default defineConfig({
    resolve: { alias: aliases },
    test: {
        environment: "node",
        include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
        setupFiles: ["./tests/setup.ts"],
    },
});
