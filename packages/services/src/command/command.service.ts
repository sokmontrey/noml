import { Effect } from "effect";
import type { CommandDescriptor, CommandPort, LoggerPort } from "@noml/core";

export interface CommandServiceDeps {
    commands: CommandPort;
    logger?: LoggerPort;
}

export interface CommandService {
    list(): readonly CommandDescriptor[];
    execute(id: string, args?: unknown): Effect.Effect<unknown, Error>;
}

/** Thin use-case boundary around the bound command port. */
export function makeCommandService(deps: CommandServiceDeps): CommandService {
    const { commands, logger } = deps;
    return {
        list: () => commands.list(),
        execute: (id, args) =>
            commands.execute(id, args).pipe(
                Effect.catch((error) => {
                    logger?.error(`command failed: ${id}`, error);
                    return Effect.fail(error);
                }),
            ),
    };
}
