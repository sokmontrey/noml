# Noml

A local-first notes PWA with a domain-blind plugin kernel.

```bash
npm install
npm run dev      # Vite dev server
npm test         # Vitest (kernel, services, plugin)
npm run build    # typecheck + production PWA build
```

## Structure

```
apps/web                 composition root + product UI
packages/core            entities, ports, events, plugin API (no dependencies)
packages/kernel          registry, loader, contribution catalog, capabilities, event bus
packages/services        NoteService, CaptureService, CommandService, SettingsService
packages/infra           Dexie, fractional index, clock/uuid/logger, settings persistence
packages/plugin-sdk      the only package plugin authors import (+ testing kit)
packages/plugins/*       builtin plugins
packages/ui              primitives and tokens
tests                    cross-package helpers
```

Dependencies point inward:

```
core ← services ← app → ui
core ← kernel   ← app
core ← infra    ← app
core ← plugin-sdk ← plugins
```

Only `apps/web/src/bootstrap.ts` constructs adapters, services and the kernel.

## Runtime flow

```
UI intent → CommandService → NoteService → NotePort → Dexie
                                     ↓ after commit
                                 EventBus → subscribers (UI, search, sync, plugins)
```

Capture is a second door into the same services: `CaptureService` routes input
through plugin handlers by priority, then calls `NoteService.create`. It never
writes to storage directly.

## Writing a plugin

```ts
import { definePlugin, Effect, today } from "@noml/plugin-sdk";

export const myPlugin = definePlugin({
    manifest: {
        id: "my-plugin",
        name: "My Plugin",
        version: "0.1.0",
        apiVersion: "^1",
        capabilities: ["notes:write", "commands:register"],
    },
    setup(context) {
        return Effect.sync(() => {
            context.commands.register({
                id: "my-plugin.create",
                title: "Create a note",
                run: (ctx, args) =>
                    ctx.notes.create(
                        today(),
                        String((args as { text?: string }).text ?? ""),
                    ),
            });
        });
    },
});
```

The context is the sandbox: commands, capture handlers, settings and storage
must be namespaced by the plugin id, and capabilities are enforced when the
context is built. Denied capabilities fail the plugin at load, not at runtime.

Use `@noml/plugin-sdk/testing`'s `createTestContext()` to test a plugin without
the kernel.

## Diagrams

`docs/flows.html` maps the architecture and runtime flows with Mermaid.
