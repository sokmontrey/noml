import { Effect } from "effect";
import type { AppEvent, EventBus, EventHandler } from "../core/events";

export function makeEventBus(): EventBus {
    const handlers = new Map<string, Set<EventHandler<any>>>();

    return {
        publish(event) {
            const set = handlers.get(event.type);
            if (!set) return Effect.void;
            return Effect.all(
                [...set].map((handler) => {
                    const result = handler(event as any);
                    return result instanceof Effect.Effect ? result : Effect.void;
                }),
                { concurrency: "unbounded" },
            ).pipe(Effect.asVoid);
        },
        subscribe(type, handler) {
            if (!handlers.has(type)) handlers.set(type, new Set());
            handlers.get(type)!.add(handler as EventHandler<any>);
            return () => handlers.get(type)?.delete(handler as EventHandler<any>);
        },
    };
}