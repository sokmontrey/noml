import { Effect } from "effect";
import type {
    BusEvent,
    EventBusPort,
    EventHandler,
    LoggerPort,
} from "@noml/core";

type Handler = (event: BusEvent) => Effect.Effect<void, Error> | void;

/**
 * Typed pub/sub with per-handler isolation: a throwing or failing subscriber
 * is logged and skipped, never allowed to stop delivery to the others.
 */
export function makeEventBus(logger?: LoggerPort): EventBusPort {
    const handlers = new Map<string, Set<Handler>>();

    const bus = {
        publish(event: BusEvent): Effect.Effect<void, Error> {
            const set = handlers.get(event.type);
            if (!set) return Effect.void;

            const effects = [...set].map((handler) => {
                try {
                    const result = handler(event);
                    const effect = Effect.isEffect(result)
                        ? (result as Effect.Effect<void, Error>)
                        : Effect.void;
                    return Effect.catch(effect, (error) => {
                        logger?.error(
                            `event handler failed for ${event.type}`,
                            error,
                        );
                        return Effect.void;
                    });
                } catch (error) {
                    logger?.error(
                        `event handler threw for ${event.type}`,
                        error,
                    );
                    return Effect.void;
                }
            });

            return Effect.forEach(effects, (effect) => effect, {
                concurrency: 1,
            }).pipe(Effect.asVoid);
        },
        subscribe(type: string, handler: EventHandler): () => void {
            let set = handlers.get(type);
            if (!set) {
                set = new Set();
                handlers.set(type, set);
            }
            const entry = handler as Handler;
            set.add(entry);
            return () => {
                set.delete(entry);
            };
        },
    };

    return bus as EventBusPort;
}
