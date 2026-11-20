import { Effect } from "effect";
import { useCallback, useEffect, useState } from "react";
import type { Note } from "@noml/core";
import { useApp } from "../../container";

export interface NotesState {
    notes: Note[];
    loading: boolean;
    error: string | null;
    refresh(): Promise<void>;
    clearError(): void;
}

const message = (error: unknown): string =>
    error instanceof Error ? error.message : String(error);

/**
 * Feature store for the notes view. It subscribes to domain events instead of
 * assuming every mutation happened through this component.
 */
export function useNotes(): NotesState {
    const { noteService, eventBus } = useApp();
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        try {
            const next = await Effect.runPromise(noteService.list());
            setNotes(next);
            setError(null);
        } catch (cause) {
            setError(message(cause));
        } finally {
            setLoading(false);
        }
    }, [noteService]);

    useEffect(() => {
        let active = true;
        const reload = () => {
            if (active) void refresh();
        };
        reload();

        const unsubscribe = [
            eventBus.subscribe("note.created", reload),
            eventBus.subscribe("note.updated", reload),
            eventBus.subscribe("note.deleted", reload),
        ];
        return () => {
            active = false;
            for (const off of unsubscribe) off();
        };
    }, [eventBus, refresh]);

    return {
        notes,
        loading,
        error,
        refresh,
        clearError: () => setError(null),
    };
}
