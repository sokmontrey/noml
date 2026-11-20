interface Parsed {
    major: number;
    minor: number;
    patch: number;
}

const parse = (value: string): Parsed | null => {
    const parts = value.trim().split(".").map(Number);
    if (parts.length < 1 || parts.some((n) => Number.isNaN(n))) return null;
    return {
        major: parts[0] ?? 0,
        minor: parts[1] ?? 0,
        patch: parts[2] ?? 0,
    };
};

const compare = (a: Parsed, b: Parsed): number =>
    a.major - b.major || a.minor - b.minor || a.patch - b.patch;

/**
 * Small semver-range matcher for plugin API and dependency checks.
 * Supports `*`, `x`, exact, `^`, `~`, `>=`, `>`, `<=`, `<` and `||` unions.
 * Deliberately dependency-free; the kernel stays portable.
 */
export function satisfies(version: string, range: string): boolean {
    const parsed = parse(version);
    if (!parsed) return false;

    return range.split("||").some((part) => {
        const token = part.trim();
        if (!token || token === "*" || token === "x") return true;

        const match = /^(>=|<=|>|<|\^|~)?\s*(.+)$/.exec(token);
        if (!match) return false;

        const operator = match[1] ?? "";
        const target = parse(match[2] ?? "");
        if (!target) return false;

        const cmp = compare(parsed, target);
        switch (operator) {
            case ">=":
                return cmp >= 0;
            case "<=":
                return cmp <= 0;
            case ">":
                return cmp > 0;
            case "<":
                return cmp < 0;
            case "^":
                if (target.major > 0)
                    return parsed.major === target.major && cmp >= 0;
                if (target.minor > 0)
                    return (
                        parsed.major === 0 &&
                        parsed.minor === target.minor &&
                        cmp >= 0
                    );
                return cmp === 0;
            case "~":
                return (
                    parsed.major === target.major &&
                    parsed.minor === target.minor &&
                    cmp >= 0
                );
            default:
                return cmp === 0;
        }
    });
}
