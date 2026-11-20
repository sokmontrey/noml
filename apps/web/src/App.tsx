import { useEffect, useState } from "react";
import { Button } from "@noml/ui";
import type { AppContainer } from "./bootstrap";
import { AppProvider, useApp } from "./container";
import { CaptureBar } from "./features/capture/CaptureBar";
import { CommandPalette } from "./features/command-palette/CommandPalette";
import { NoteList } from "./features/notes/NoteList";
import { useNotes } from "./features/notes/useNotes";
import { PluginStatus } from "./features/plugins/PluginStatus";

function Shell() {
    const { plugins } = useApp();
    const { notes, loading, error, refresh } = useNotes();
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [dark, setDark] = useState(
        () =>
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches,
    );

    useEffect(() => {
        document.documentElement.classList.toggle("dark", dark);
    }, [dark]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (
                (event.ctrlKey || event.metaKey) &&
                event.key.toLowerCase() === "k"
            ) {
                event.preventDefault();
                setPaletteOpen((open) => !open);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    const today = useState(() =>
        new Date().toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        }),
    )[0];

    return (
        <div className="min-h-dvh bg-background">
            <header className="border-b">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Noml
                        </h1>
                        <p className="text-sm text-muted-foreground">{today}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="hidden text-xs text-muted-foreground sm:inline">
                            {plugins.loaded.length} plugin
                            {plugins.loaded.length === 1 ? "" : "s"} loaded
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPaletteOpen(true)}
                        >
                            Commands
                            <kbd className="rounded border bg-muted px-1 text-[10px]">
                                Ctrl K
                            </kbd>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDark((value) => !value)}
                            aria-label="Toggle color scheme"
                        >
                            {dark ? "Light" : "Dark"}
                        </Button>
                    </div>
                </div>
            </header>

            <main className="mx-auto grid max-w-6xl gap-8 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-6">
                    <CaptureBar onCaptured={() => void refresh()} />
                    {error ? (
                        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {error}
                        </p>
                    ) : null}
                    {loading ? (
                        <p className="text-sm text-muted-foreground">
                            Loading notes…
                        </p>
                    ) : (
                        <NoteList
                            notes={notes}
                            onChange={() => void refresh()}
                        />
                    )}
                </div>
                <PluginStatus />
            </main>

            <CommandPalette
                open={paletteOpen}
                onClose={() => setPaletteOpen(false)}
                onRun={() => void refresh()}
            />
        </div>
    );
}

export function App({ container }: { container: AppContainer }) {
    return (
        <AppProvider value={container}>
            <Shell />
        </AppProvider>
    );
}
