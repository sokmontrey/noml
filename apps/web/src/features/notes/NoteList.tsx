import { Effect } from "effect";
import { useMemo, useState } from "react";
import type { Note } from "@noml/core";
import { Button } from "@noml/ui";
import { useApp } from "../../container";

interface NoteListProps {
    notes: Note[];
    onChange(): void;
}

const dayLabel = (day: string): string => {
    const date = new Date(`${day}T12:00:00`);
    return date.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

const nextDay = (day: string): string => {
    const date = new Date(`${day}T12:00:00`);
    date.setDate(date.getDate() + 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const describe = (error: unknown): string =>
    error instanceof Error ? error.message : String(error);

/** Renders read-model notes. All mutations go through the note service. */
export function NoteList({ notes, onChange }: NoteListProps) {
    const { noteService } = useApp();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState("");
    const [error, setError] = useState<string | null>(null);

    const groups = useMemo(() => {
        const map = new Map<string, Note[]>();
        for (const note of notes) {
            const list = map.get(note.day) ?? [];
            list.push(note);
            map.set(note.day, list);
        }
        return [...map.entries()];
    }, [notes]);

    const save = async (id: string) => {
        try {
            await Effect.runPromise(noteService.update(id, draft));
            setEditingId(null);
            setDraft("");
            onChange();
        } catch (cause) {
            setError(describe(cause));
        }
    };

    const remove = async (id: string) => {
        try {
            await Effect.runPromise(noteService.delete(id));
            onChange();
        } catch (cause) {
            setError(describe(cause));
        }
    };

    const move = async (note: Note) => {
        try {
            await Effect.runPromise(
                noteService.move(note.id, nextDay(note.day)),
            );
            onChange();
        } catch (cause) {
            setError(describe(cause));
        }
    };

    if (notes.length === 0) {
        return (
            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                Nothing captured yet. Type above and press Enter.
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {error ? (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                </p>
            ) : null}
            {groups.map(([day, dayNotes]) => (
                <section key={day} className="space-y-3">
                    <header className="flex items-baseline justify-between">
                        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                            {dayLabel(day)}
                        </h2>
                        <span className="text-xs text-muted-foreground">
                            {dayNotes.length} note
                            {dayNotes.length === 1 ? "" : "s"}
                        </span>
                    </header>
                    <ul className="space-y-2">
                        {dayNotes.map((note) => (
                            <li
                                key={note.id}
                                className="group rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-foreground/20"
                            >
                                {editingId === note.id ? (
                                    <div className="space-y-3">
                                        <textarea
                                            autoFocus
                                            value={draft}
                                            onChange={(event) =>
                                                setDraft(event.target.value)
                                            }
                                            onKeyDown={(event) => {
                                                if (
                                                    event.key === "Enter" &&
                                                    !event.shiftKey
                                                ) {
                                                    event.preventDefault();
                                                    void save(note.id);
                                                }
                                                if (event.key === "Escape") {
                                                    setEditingId(null);
                                                }
                                            }}
                                            rows={3}
                                            className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                                        />
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    void save(note.id)
                                                }
                                            >
                                                Save
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() =>
                                                    setEditingId(null)
                                                }
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-start justify-between gap-4">
                                        <p className="text-sm whitespace-pre-wrap">
                                            {note.content}
                                        </p>
                                        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                    setEditingId(note.id);
                                                    setDraft(note.content);
                                                }}
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => void move(note)}
                                                title={`Move to ${nextDay(note.day)}`}
                                            >
                                                Next day
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-destructive"
                                                onClick={() =>
                                                    void remove(note.id)
                                                }
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    );
}
