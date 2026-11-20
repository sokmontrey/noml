export function makeSettingsStore(initial: Record<string, unknown> = {}) {
    const values = new Map<string, unknown>(Object.entries(initial));

    return {
        get(key: string): unknown {
            return values.get(key);
        },
        set(key: string, value: unknown): void {
            values.set(key, value);
        },
    };
}