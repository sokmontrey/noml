# Plugin System

Notes remain raw Markdown. Plugins extend the app through typed contributions rather than changing the note model.

## Core contracts

- `core/plugin-api.ts` defines `Plugin`, `PluginManifest`, `PluginContext`, capture handlers, Markdown extensions, commands, and settings.
- `core/events.ts` defines the typed event bus and application events.

## Kernel

- `kernel/plugin-registry.ts` stores and queries plugins.
- `kernel/plugin-loader.ts` validates dependencies and runs setup/teardown.
- `kernel/event-bus.ts` provides an in-memory typed event bus.
- `kernel/settings-store.ts` provides a simple settings store.
- `kernel/capture.ts` runs capture handlers in registration order.

## Contributions

Plugins can contribute:

- Capture handlers that turn external input into Markdown note drafts.
- Markdown extensions for rendering.
- Commands for the command palette.
- Setting definitions.

## Built-in plugins

- `plugins/core-notes.ts` is the baseline note plugin.

## Usage

Register plugins in the app composition root, create a context per plugin, and call `loadPlugins`. Use `runCapture` for clipboard, drag/drop, share, and URL capture flows.