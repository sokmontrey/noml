# AGENT.md

## Philosophy

Organize by layers with strict dependency direction:

```
app → plugins → services → core ← infra
              kernel ───────↗
```

- `core/` — pure types and ports, zero deps.
- `infra/` — adapters only (implement core ports).
- `services/` — use cases built on ports + bus.
- `kernel/` — plugin host, registries, event bus.
- `plugins/` — built-ins, same API as third party.
- `app/` — composition root + UI shell.
- `components/ui/` — dumb UI.
- `lib/` — generic helpers only.

## Rules

1. core imports nothing.
2. infra imports core only.
3. services import core ports, never infra.
4. plugins get services through PluginApi only; never import infra or each other.
5. app is the only place that imports infra and wires it in.
6. Cross-feature behavior lives in flows, not in features.

## Layout

```
src/
├── core/                  pure types and ports
│   ├── note/
│   ├── fractional-index/
│   ├── events.ts
│   └── plugin-api.ts
├── infra/                 adapters only
│   ├── db/
│   ├── note/
│   └── fractional-index/
├── services/              use cases
├── kernel/                plugin host, registries, event bus
├── plugins/               built-ins
├── app/                   composition root + UI shell
├── components/ui/
└── lib/
```

## Conventions

- 4-space indentation (Prettier, `npm run format`).
- Ports are Effect `Context.Service` classes for async services.
- Adapters are `Layer`s.
- UI state in Zustand vanilla stores created per provider.
- Import from barrels; never deep-import from outside a feature.
