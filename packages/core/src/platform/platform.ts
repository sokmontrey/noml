/** Injectable time. Keeps services deterministic under test. */
export interface ClockPort {
    now(): number;
}

/** Injectable identity. */
export interface IdPort {
    next(): string;
}

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LoggerPort {
    log(level: LogLevel, message: string, meta?: unknown): void;
    debug(message: string, meta?: unknown): void;
    info(message: string, meta?: unknown): void;
    warn(message: string, meta?: unknown): void;
    error(message: string, meta?: unknown): void;
}
