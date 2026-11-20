import type { SettingsPort } from "@noml/core";

/** In-memory runtime values. Defaults are seeded by the context factory. */
export class SettingsStore implements SettingsPort {
    private readonly values: Map<string, unknown>;

    constructor(initial: Record<string, unknown> = {}) {
        this.values = new Map(Object.entries(initial));
    }

    get<T = unknown>(key: string): T | undefined {
        return this.values.get(key) as T | undefined;
    }

    set(key: string, value: unknown): void {
        this.values.set(key, value);
    }

    all(): Record<string, unknown> {
        return Object.fromEntries(this.values);
    }

    snapshot(): Record<string, unknown> {
        return this.all();
    }
}
