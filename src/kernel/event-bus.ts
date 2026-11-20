import { Effect } from "effect";
import type { AppEvent, EventBus, EventHandler } from "../core/events";

export function makeEventBus(): EventBus {
    const handlers = new Map<string, Set<EventHandler<any>>>();

    return {
        publish(event) {
            const set = handlers.get(event.type);
            if (!set) return Effect.void;
            let effect = Effect.void;
            for (const handler of set) {
                const result = handler(event as any);
                const next = Effect.isEffect(result) ? result : Effect.void;
                effect = Effect.flatMap(effect, () => next);
            }
            return effect;
        },
        subscribe(type, handler) {
            if (!handlers.has(type)) handlers.set(type, new Set());
            handlers.get(type)!.add(handler as EventHandler<any>);
            return () => handlers.get(type)?.delete(handler as EventHandler<any>);
        },
    };
}