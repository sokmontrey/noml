import type { ClockPort, IdPort, LoggerPort, LogLevel } from "@noml/core";

export function makeSystemClock(): ClockPort {
    return { now: () => Date.now() };
}

export function makeUuidIds(): IdPort {
    return {
        next: () =>
            typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
    };
}

export interface ConsoleLoggerOptions {
    /** Minimum level to emit. */
    level?: LogLevel;
}

const RANK: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};

export function makeConsoleLogger(
    options: ConsoleLoggerOptions = {},
): LoggerPort {
    const minimum = RANK[options.level ?? "info"];
    const log = (level: LogLevel, message: string, meta?: unknown) => {
        if (RANK[level] < minimum) return;
        const sink =
            level === "error"
                ? console.error
                : level === "warn"
                  ? console.warn
                  : console.log;
        sink(`[noml:${level}] ${message}`, meta === undefined ? "" : meta);
    };
    return {
        log,
        debug: (message, meta) => log("debug", message, meta),
        info: (message, meta) => log("info", message, meta),
        warn: (message, meta) => log("warn", message, meta),
        error: (message, meta) => log("error", message, meta),
    };
}
