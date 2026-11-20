import { Effect } from "effect";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CommandDescriptor } from "@noml/core";
import { useApp } from "../../container";

interface CommandPaletteProps {
    open: boolean;
    onClose(): void;
    onRun(): void;
}

/** Every entry point dispatches the same command ids through `CommandService`. */
export function CommandPalette({ open, onClose, onRun }: CommandPaletteProps) {
    const { commandService } = useApp();
    const [query, setQuery] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [active, setActive] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const commands = useMemo<readonly CommandDescriptor[]>(
        () => (open ? commandService.list() : []),
        [commandService, open],
    );

    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle) return commands;
        return commands.filter((command) =>
            `${command.title} ${command.category ?? ""} ${command.id}`
                .toLowerCase()
                .includes(needle),
        );
    }, [commands, query]);

    useEffect(() => {
        if (open) {
            setQuery("");
            setError(null);
            setActive(0);
            queueMicrotask(() => inputRef.current?.focus());
        }
    }, [open]);

    useEffect(() => {
        setActive((current) =>
            filtered.length === 0 ? 0 : Math.min(current, filtered.length - 1),
        );
    }, [filtered.length]);

    if (!open) return null;

    const run = async (command: CommandDescriptor) => {
        if (!command.enabled) return;
        let args: unknown;
        if (command.id.endsWith(".create")) {
            const content = window.prompt("Note content");
            if (!content?.trim()) return;
            args = { content };
        }
        try {
            await Effect.runPromise(commandService.execute(command.id, args));
            onClose();
            onRun();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : String(cause));
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[15vh] backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="w-full max-w-xl overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <input
                    ref={inputRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Escape") onClose();
                        if (event.key === "ArrowDown") {
                            event.preventDefault();
                            setActive((current) =>
                                filtered.length === 0
                                    ? 0
                                    : (current + 1) % filtered.length,
                            );
                        }
                        if (event.key === "ArrowUp") {
                            event.preventDefault();
                            setActive((current) =>
                                filtered.length === 0
                                    ? 0
                                    : (current - 1 + filtered.length) %
                                      filtered.length,
                            );
                        }
                        if (event.key === "Enter") {
                            const command = filtered[active];
                            if (command) void run(command);
                        }
                    }}
                    placeholder="Run a command…"
                    className="w-full border-b bg-transparent px-4 py-3 text-sm outline-none"
                />
                {error ? (
                    <p className="border-b bg-destructive/10 px-4 py-2 text-xs text-destructive">
                        {error}
                    </p>
                ) : null}
                <ul className="max-h-80 overflow-y-auto p-2">
                    {filtered.length === 0 ? (
                        <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                            No commands registered.
                        </li>
                    ) : (
                        filtered.map((command, index) => (
                            <li key={command.id}>
                                <button
                                    type="button"
                                    disabled={!command.enabled}
                                    onMouseEnter={() => setActive(index)}
                                    onClick={() => void run(command)}
                                    className={`flex w-full items-center justify-between gap-4 rounded-md px-3 py-2 text-left text-sm disabled:opacity-40 ${
                                        index === active ? "bg-accent" : ""
                                    }`}
                                >
                                    <span>
                                        <span className="block font-medium">
                                            {command.title}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {command.pluginId} · {command.id}
                                        </span>
                                    </span>
                                    {command.keybinding ? (
                                        <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                            {command.keybinding}
                                        </kbd>
                                    ) : null}
                                </button>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
}
